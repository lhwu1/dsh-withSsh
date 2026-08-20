import { createHash, randomUUID } from "node:crypto";
import { Client } from "ssh2";
import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/host/index.ts
const name = "dsh-withssh";
const inject = ["tools", "systemPrompt"];
const MAX_OUTPUT = 262144;
const MAX_FILES = 500;
const MAX_RUNS = 200;
const MAX_COMMAND_LENGTH = 16384;
const MAX_DESCRIPTION_LENGTH = 4096;
const LEASE_TTL = 6e4;
/** Owns one ephemeral SSH connection per Harness session. Authentication data never enters a session event. */
var SshConsoleService = class extends Service {
	static inject = ["tools", "systemPrompt"];
	static Config = z.object({ connectTimeoutMs: z.number().step(1).min(1).default(15e3) });
	connections = /* @__PURE__ */ new Map();
	pendingConnections = /* @__PURE__ */ new Set();
	leases = /* @__PURE__ */ new Map();
	connectTimeoutMs;
	constructor(ctx, config) {
		super(ctx, "sshConsole");
		this.connectTimeoutMs = config.connectTimeoutMs ?? 15e3;
		ctx.effect(() => () => {
			this.closeAll("service disposal");
		}, "dsh-withssh: close connections");
		ctx.inject(["systemPrompt"], (promptCtx) => promptCtx.systemPrompt.context({
			name: "dsh-withssh:connection",
			order: 116,
			text: (context) => {
				const sessionId = context.agent?.session.id;
				const record = sessionId === void 0 ? void 0 : this.connections.get(sessionId);
				if (record === void 0) return "";
				return `SSH console connected for this conversation: ${record.profile.username}@${record.profile.host}:${String(record.profile.port)}. Use ssh_exec for SSH commands and always provide its description. The SSH password and host key are not available to you.`;
			}
		}));
		const service = this;
		ctx.effect(() => {
			return ctx.tools.register(defineTool({
				name: "ssh_exec",
				description: "The current conversation has a session-scoped SSH console when the user connected one. Execute one command on that connected server; if no SSH is connected, explain that the user must configure it in the SSH console. Always provide a concise command description; it is shown behind a clickable ? beside the command and is not sent to the server.",
				parameters: {
					command: {
						type: "string",
						required: true,
						description: "要执行的 SSH 命令。"
					},
					description: {
						type: "string",
						required: true,
						description: "必须使用中文说明命令用途，点击命令后的问号查看。"
					}
				},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							runId: {
								type: "string",
								required: true
							},
							status: {
								type: "string",
								required: true
							},
							stdout: {
								type: "string",
								required: true
							},
							stderr: {
								type: "string",
								required: true
							},
							exitCode: {
								oneOf: [{ type: "integer" }, { type: "null" }],
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: JSON.stringify(value)
					}]
				},
				async execute(args, exec) {
					const sessionId = exec.agent?.session.id;
					if (sessionId === void 0) throw new Error("SSH 工具只能在活动对话中使用。");
					if (isRiskyCommand(args.command)) {
						const approval = ctx.get("approval");
						if (approval === void 0 || exec.agent === void 0) throw new Error("高风险 SSH 命令需要用户审批，但当前组合未提供审批服务。");
						if (await approval.request({
							agent: exec.agent,
							toolName: "ssh_exec",
							callId: exec.callId,
							reason: `允许执行高风险 SSH 命令：${args.description}`,
							signal: exec.signal
						}) !== "allowed-once") throw new Error("用户未批准该高风险 SSH 命令。");
					}
					if (!hasChinese(args.description)) throw new Error("AI 命令说明必须使用中文，请重新提供中文说明。");
					const result = await service.run(sessionId, args.command, args.description, "ai");
					return {
						runId: result.runId,
						status: result.status,
						stdout: result.stdout,
						stderr: result.stderr,
						exitCode: result.exitCode
					};
				},
				presentCall: (args) => ({
					card: "terminal",
					title: args.command,
					description: args.description
				})
			}));
		}, "dsh-withssh: ssh tool");
	}
	state(sessionId) {
		const record = this.connections.get(sessionId);
		if (record === void 0) return {
			sessionId,
			status: "unconfigured",
			runs: []
		};
		return {
			sessionId,
			status: "connected",
			connectionId: record.connectionId,
			profile: record.profile,
			terminalOutput: sanitizeRemoteOutput(record.terminalOutput),
			runs: record.runs.map(publicRun)
		};
	}
	async connect(input) {
		validateConnectInput(input);
		if (this.connections.has(input.sessionId) || this.pendingConnections.has(input.sessionId)) throw new Error("这个对话已经存在 SSH 连接，请先断开。");
		this.pendingConnections.add(input.sessionId);
		const leaseId = randomUUID();
		this.leases.set(leaseId, {
			value: Buffer.from(input.password),
			expiresAt: Date.now() + LEASE_TTL
		});
		try {
			const opened = await this.openClient(input, leaseId);
			if (input.hostKey !== opened.fingerprint) {
				opened.client.end();
				throw new HostKeyChallengeError(opened.fingerprint, leaseId);
			}
			const shell = await this.openInteractiveShell(opened.client);
			const record = {
				sessionId: input.sessionId,
				connectionId: randomUUID(),
				client: opened.client,
				profile: {
					host: input.host,
					port: input.port,
					username: input.username,
					fingerprint: opened.fingerprint
				},
				runs: [],
				shell,
				terminalOutput: ""
			};
			shell.on("data", (chunk) => {
				record.terminalOutput = appendTerminal(record.terminalOutput, chunk.toString("utf8"));
			});
			shell.stderr.on("data", (chunk) => {
				record.terminalOutput = appendTerminal(record.terminalOutput, chunk.toString("utf8"));
			});
			this.connections.set(input.sessionId, record);
			this.destroyLease(leaseId);
			return this.state(input.sessionId);
		} catch (error) {
			this.destroyLease(leaseId);
			throw error;
		} finally {
			this.pendingConnections.delete(input.sessionId);
		}
	}
	async confirmHostKey(input) {
		return this.connect(input);
	}
	async run(sessionId, command, description, source) {
		const record = this.connections.get(sessionId);
		if (record === void 0) throw new Error("当前对话没有 SSH 连接。");
		if (command.trim() === "" || description.trim() === "") throw new Error("命令和命令说明不能为空。");
		if (command.length > MAX_COMMAND_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) throw new Error("命令或命令说明过长。");
		if (source === "ai" && !hasChinese(description)) throw new Error("AI 命令说明必须使用中文，请重新提供中文说明。");
		const run = {
			runId: randomUUID(),
			source,
			command,
			description,
			status: "running",
			stdout: "",
			stderr: "",
			exitCode: null,
			startedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		record.runs.unshift(run);
		record.runs.splice(MAX_RUNS);
		if (source === "ai") record.terminalOutput = appendTerminal(record.terminalOutput, `\r\n${record.profile.username}@${record.profile.host}:~$ ${command}\r\n`);
		return new Promise((resolve) => record.client.exec(command, { pty: source === "human" }, (error, channel) => {
			if (error !== void 0) {
				run.status = "failed";
				run.stderr = safeError(error);
				run.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
				if (source === "ai") record.terminalOutput = appendTerminal(record.terminalOutput, `${run.stderr}\r\n`);
				resolve(publicRun(run));
				return;
			}
			collect(channel, run, () => {
				if (source === "ai") record.terminalOutput = appendTerminal(record.terminalOutput, `${run.stdout}${run.stderr ? `\r\n${run.stderr}` : ""}\r\n`);
				resolve(publicRun(run));
			});
		}));
	}
	/** Write user keystrokes to this session's persistent PTY without creating a model-visible tool call. */
	input(sessionId, text, command) {
		const record = this.connections.get(sessionId);
		if (record?.shell === void 0) throw new Error("当前对话没有可输入的 SSH 终端。");
		if (text.length === 0 || text.length > 32768) throw new Error("终端输入长度无效。");
		if (command !== void 0 && command.trim() !== "") {
			const now = (/* @__PURE__ */ new Date()).toISOString();
			record.runs.unshift({
				runId: randomUUID(),
				source: "human",
				command,
				description: "人工输入",
				status: "success",
				stdout: "",
				stderr: "",
				exitCode: null,
				startedAt: now,
				finishedAt: now
			});
			record.runs.splice(MAX_RUNS);
		}
		record.shell.write(text);
	}
	async stats(sessionId) {
		const [load1 = NaN, load5 = NaN, load15 = NaN, cores = NaN, memory = NaN, memoryTotalKb = NaN, memoryAvailableKb = NaN, swapTotalKb = NaN, swapUsedKb = NaN, uptime = NaN] = (await this.internalCommand(sessionId, "awk '{print $1,$2,$3}' /proc/loadavg; nproc; awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} /SwapTotal/{st=$2} /SwapFree/{sf=$2} END{if(t>0) print (t-a)*100/t, t, a, st, st-sf}' /proc/meminfo; awk '{print $1}' /proc/uptime")).stdout.trim().split(/\s+/u).map(Number);
		return {
			cpuPercent: Number.isFinite(load1) && Number.isFinite(cores) && cores > 0 ? Math.min(100, load1 * 100 / cores) : null,
			loadAverage: [
				load1,
				load5,
				load15
			].every(Number.isFinite) ? [
				load1,
				load5,
				load15
			] : null,
			memoryPercent: Number.isFinite(memory) ? Math.min(100, Math.max(0, memory)) : null,
			memoryTotalBytes: Number.isFinite(memoryTotalKb) ? memoryTotalKb * 1024 : null,
			memoryAvailableBytes: Number.isFinite(memoryAvailableKb) ? memoryAvailableKb * 1024 : null,
			swapPercent: Number.isFinite(swapTotalKb) && swapTotalKb > 0 && Number.isFinite(swapUsedKb) ? Math.min(100, Math.max(0, swapUsedKb * 100 / swapTotalKb)) : null,
			uptimeSeconds: Number.isFinite(uptime) ? uptime : null,
			collectedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
	}
	async files(sessionId, directory = ".") {
		if (directory.includes("\0") || directory.length > 4096) throw new Error("目录路径无效。");
		return (await this.internalCommand(sessionId, `find -- ${shellQuote(directory)} -maxdepth 1 -mindepth 1 -printf '%f\\t%y\\t%s\\t%TY-%Tm-%TdT%TH:%TM:%TS\\n' | head -n ${MAX_FILES}`)).stdout.split(/\r?\n/u).filter(Boolean).map((line) => {
			const [name = "", type = "o", size = "", modifiedAt = ""] = line.split("	");
			return {
				name: sanitizeRemoteOutput(name),
				path: joinRemotePath(directory, name),
				kind: type === "d" ? "directory" : type === "f" ? "file" : type === "l" ? "link" : "other",
				size: Number.isFinite(Number(size)) ? Number(size) : null,
				modifiedAt: modifiedAt || null
			};
		});
	}
	async close(sessionId, _reason = "user request") {
		const record = this.connections.get(sessionId);
		if (record === void 0) return;
		this.connections.delete(sessionId);
		record.client.end();
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	async closeAll(reason) {
		await Promise.all([...this.connections.keys()].map((id) => this.close(id, reason)));
		for (const id of [...this.leases.keys()]) this.destroyLease(id);
	}
	/** Execute a display-neutral maintenance command without creating a terminal history row. */
	internalCommand(sessionId, command) {
		const record = this.connections.get(sessionId);
		if (record === void 0) throw new Error("当前对话没有 SSH 连接。");
		return new Promise((resolve) => record.client.exec(command, (error, channel) => {
			if (error !== void 0) {
				resolve({
					stdout: "",
					stderr: safeError(error),
					exitCode: null
				});
				return;
			}
			collectResult(channel, resolve);
		}));
	}
	openInteractiveShell(client) {
		return new Promise((resolve, reject) => client.shell({
			term: "xterm-256color",
			cols: 120,
			rows: 40
		}, (error, channel) => error === void 0 ? resolve(channel) : reject(error)));
	}
	openClient(input, leaseId) {
		return new Promise((resolve, reject) => {
			let settled = false;
			let fingerprint;
			const client = new Client();
			const done = (error) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				error === void 0 && fingerprint !== void 0 ? resolve({
					client,
					fingerprint
				}) : reject(error ?? /* @__PURE__ */ new Error("无法读取 SSH 主机密钥。"));
			};
			const timer = setTimeout(() => {
				client.end();
				done(/* @__PURE__ */ new Error("SSH 连接超时。"));
			}, this.connectTimeoutMs);
			const password = this.leaseValue(leaseId);
			const config = {
				host: input.host,
				port: input.port,
				username: input.username,
				password: password.toString(),
				readyTimeout: this.connectTimeoutMs,
				hostVerifier: (key, verifyHost) => {
					fingerprint = fingerprintForKey(key);
					const accepted = input.hostKey === fingerprint;
					verifyHost?.(accepted);
					return accepted;
				}
			};
			client.once("ready", () => done());
			client.once("error", (error) => done(input.hostKey === void 0 && fingerprint !== void 0 ? new HostKeyChallengeError(fingerprint, leaseId) : error));
			client.connect(config);
		});
	}
	leaseValue(id) {
		const lease = this.leases.get(id);
		if (lease === void 0 || lease.expiresAt < Date.now()) {
			this.destroyLease(id);
			throw new Error("SSH 凭据已过期，请重新输入。");
		}
		return lease.value;
	}
	destroyLease(id) {
		this.leases.get(id)?.value.fill(0);
		this.leases.delete(id);
	}
};
var HostKeyChallengeError = class extends Error {
	fingerprint;
	leaseId;
	constructor(fingerprint, leaseId) {
		super("HOST_KEY_CONFIRMATION_REQUIRED");
		this.fingerprint = fingerprint;
		this.leaseId = leaseId;
		this.name = "HostKeyChallengeError";
	}
};
function validateConnectInput(input) {
	if (input.sessionId.trim() === "" || input.sessionId.length > 512) throw new Error("sessionId 无效。");
	for (const [value, name] of [
		[input.host, "host"],
		[input.username, "username"],
		[input.password, "password"]
	]) if (value.trim() === "") throw new Error(`${name} 不能为空。`);
	if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) throw new Error("SSH 端口无效。");
}
function fingerprintForKey(key) {
	const raw = Buffer.isBuffer(key) ? key : Buffer.from(key, "base64");
	return `sha256:${createHash("sha256").update(raw).digest("base64").replace(/=+$/u, "")}`;
}
function safeError(error) {
	return sanitizeRemoteOutput(error instanceof Error ? error.message.slice(0, 500) : "SSH 执行失败。");
}
function publicRun(run) {
	return {
		...run,
		stdout: sanitizeRemoteOutput(run.stdout),
		stderr: sanitizeRemoteOutput(run.stderr)
	};
}
function collect(channel, run, done) {
	let bytes = 0;
	let finished = false;
	const append = (key, chunk) => {
		if (finished || bytes >= MAX_OUTPUT) return;
		const text = chunk.toString("utf8");
		const remaining = MAX_OUTPUT - bytes;
		run[key] += text.slice(0, remaining);
		bytes += Math.min(Buffer.byteLength(text), remaining);
	};
	const finish = (code, error) => {
		if (finished) return;
		finished = true;
		run.exitCode = code;
		run.status = code === 0 && error === void 0 ? "success" : "failed";
		if (error !== void 0) run.stderr += safeError(error);
		run.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
		done();
	};
	channel.on("data", (chunk) => append("stdout", Buffer.from(chunk)));
	channel.stderr.on("data", (chunk) => append("stderr", Buffer.from(chunk)));
	channel.on("close", (code) => finish(code));
	channel.on("error", (error) => finish(null, error));
}
function collectResult(channel, done) {
	let stdout = "";
	let stderr = "";
	let bytes = 0;
	let finished = false;
	const append = (target, chunk) => {
		if (finished || bytes >= MAX_OUTPUT) return;
		const text = chunk.toString("utf8");
		const remaining = MAX_OUTPUT - bytes;
		if (target === "stdout") stdout += text.slice(0, remaining);
		else stderr += text.slice(0, remaining);
		bytes += Math.min(Buffer.byteLength(text), remaining);
	};
	const finish = (result) => {
		if (finished) return;
		finished = true;
		done(result);
	};
	channel.on("data", (chunk) => append("stdout", Buffer.from(chunk)));
	channel.stderr.on("data", (chunk) => append("stderr", Buffer.from(chunk)));
	channel.on("close", (exitCode) => finish({
		stdout: sanitizeRemoteOutput(stdout),
		stderr: sanitizeRemoteOutput(stderr),
		exitCode
	}));
	channel.on("error", (error) => finish({
		stdout: sanitizeRemoteOutput(stdout),
		stderr: `${sanitizeRemoteOutput(stderr)}${safeError(error)}`,
		exitCode: null
	}));
}
function shellQuote(value) {
	return `'${value.replace(/'/gu, `'\\''`)}'`;
}
function appendTerminal(previous, next) {
	const combined = previous + next;
	return combined.length > MAX_OUTPUT ? combined.slice(-262144) : combined;
}
function sanitizeRemoteOutput(text) {
	return text.replace(/(?:password|passwd|secret|token)\s*[:=]\s*[^\s]+/giu, "$1=[redacted]").replace(/[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, "");
}
function isRiskyCommand(command) {
	return /(?:\brm\s+-[^\n]*r|\bmkfs(?:\.|\s)|\bdd\s+if=|\bshutdown\b|\breboot\b|\buserdel\b|\bchmod\s+777\b|>\s*\/dev\/)/iu.test(command);
}
function hasChinese(text) {
	return /[\u3400-\u9fff]/u.test(text);
}
function joinRemotePath(directory, name) {
	return directory === "/" ? `/${name}` : `${directory.replace(/\/$/u, "")}/${name}`;
}
//#endregion
export { HostKeyChallengeError, SshConsoleService, SshConsoleService as default, inject, name, sanitizeRemoteOutput };

//# sourceMappingURL=index.mjs.map