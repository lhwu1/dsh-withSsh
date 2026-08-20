window.__ModuleLoader__.load({
	id: "dsh-withssh",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/api.ts
		async function request(path, init) {
			const response = await fetch(path, {
				...init,
				cache: "no-store"
			});
			const payload = await response.json();
			if (!response.ok) {
				const error = new Error(typeof payload.error === "string" ? payload.error : `HTTP ${response.status}`);
				const record = payload;
				error.fingerprint = typeof record.fingerprint === "string" ? record.fingerprint : void 0;
				error.code = typeof payload.error === "string" ? payload.error : void 0;
				throw error;
			}
			return payload;
		}
		function state(sessionId) {
			return request(`/dsh-withssh/state.json?sessionId=${encodeURIComponent(sessionId)}`);
		}
		function connect(input, confirmation = false) {
			return request(confirmation ? "/dsh-withssh/confirm-host.json" : "/dsh-withssh/connect.json", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(input)
			});
		}
		function disconnect(sessionId) {
			return request("/dsh-withssh/disconnect.json", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sessionId })
			});
		}
		function input(sessionId, text, command) {
			return request("/dsh-withssh/input.json", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					sessionId,
					text,
					...command === void 0 ? {} : { command }
				})
			});
		}
		function stats(sessionId) {
			return request(`/dsh-withssh/stats.json?sessionId=${encodeURIComponent(sessionId)}`);
		}
		function files(sessionId, path = ".") {
			return request(`/dsh-withssh/files.json?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`);
		}
		//#endregion
		//#region src/client/styles.ts
		const STYLE_ID = "dsh-withssh-styles";
		const finalCss = `
.sshRoot{height:calc(100dvh - 300px);min-height:420px;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;background:#101827;color:#e5e7eb;font:13px/1.45 Inter,system-ui,sans-serif}
.sshGlass{display:flex;align-items:center;gap:9px;min-width:0;padding:10px 16px;border-bottom:1px solid #334155;background:rgb(15 23 42 / .86);backdrop-filter:blur(14px);color:#cbd5e1}.sshGlass strong{color:#f8fafc;font-size:15px}.sshGlass span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sshGlass button{margin-left:auto;border:1px solid #7f1d1d;border-radius:4px;background:#3f161c;color:#fecaca;padding:5px 10px;cursor:pointer}
.sshGrid{min-height:0;display:grid;grid-template-columns:270px minmax(0,1fr);grid-template-rows:minmax(0,1fr) 190px}.sshStatus{grid-row:1 / 3;min-width:0;overflow:auto;padding:16px;border-right:1px solid #334155;background:#172238}.sshStatus h2,.sshPanel h2{margin:0;color:#f8fafc;font-size:14px}.sshStatus dl{display:grid;gap:4px;margin:16px 0}.sshStatus dt{margin-top:8px;color:#94a3b8;font-size:11px;text-transform:uppercase}.sshStatus dd{margin:0;overflow-wrap:anywhere;color:#e2e8f0}.sshChart{display:grid;gap:14px;margin-top:28px;border-top:1px solid #334155;padding-top:16px}.sshChart p{margin:0;color:#cbd5e1}.sshMetric{display:grid;gap:6px}.sshMetric div:first-child{display:flex;justify-content:space-between;gap:8px;color:#cbd5e1}.sshMetric strong{color:#f8fafc}.sshMeter{height:7px;overflow:hidden;background:#0b1220}.sshMeter span{display:block;height:100%;background:#32b69a;transition:width .2s ease}.sshMetric:first-child .sshMeter span{background:#f4bb40}
.sshPanel{min-width:0;min-height:0;overflow:hidden;padding:12px 16px;background:#101827}.sshTerminal{display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;border-bottom:1px solid #334155}.sshToolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;color:#94a3b8}.sshToolbar span{font-size:12px}.sshRuns{min-height:0;overflow:auto;display:flex;flex-direction:column-reverse;gap:8px;padding-right:4px}.sshEmpty{margin:auto;color:#94a3b8}.sshRun{border-left:3px solid #64748b;background:#1d293b;padding:8px 10px}.sshRunAi{border-left-color:#facc15}.sshRunHuman{border-left-color:#3b82f6}.sshRunHead{display:flex;align-items:baseline;gap:8px;min-width:0}.sshSource{flex:0 0 auto;color:#cbd5e1;font-size:11px;font-weight:700}.sshCommand{min-width:0;overflow:hidden;color:#fef08a;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;text-overflow:ellipsis;white-space:nowrap}.sshRunHuman .sshCommand{color:#93c5fd}.sshMeaning{min-width:0;overflow:hidden;color:#cbd5e1;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.sshOutcome{margin-left:auto;color:#e2e8f0;font-size:11px}.sshOutput{max-height:150px;overflow:auto;margin:7px 0 0;color:#d1d5db;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
.sshPrompt{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;margin-top:10px;border:1px solid #3b4b62;background:#0b1220;padding:7px 9px;color:#7dd3fc;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}.sshPrompt textarea{height:22px;min-width:0;resize:none;overflow:auto;border:0;outline:0;background:transparent;color:#f8fafc;font:inherit}.sshPrompt button{border:0;background:#2563eb;color:#fff;padding:5px 10px;cursor:pointer}.sshPrompt button:disabled{opacity:.55}.sshError{margin:8px 0 0;color:#fca5a5}
.sshFiles{grid-column:2;border-top:1px solid #334155;padding-bottom:0}.sshFileList{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;min-height:0;height:calc(100% - 34px);overflow:auto;margin:0;padding:0;list-style:none;background:#334155}.sshFileList li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center;min-width:0;background:#172238;padding:7px 8px}.sshFileList li span{color:#7dd3fc;font-size:11px}.sshFileList li strong{overflow:hidden;color:#e2e8f0;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.sshFileList li small{color:#94a3b8}.sshFileList .sshEmpty{display:block;grid-column:1 / -1;background:#172238;color:#94a3b8}
.sshSetupRoot{height:calc(100dvh - 300px)}.sshSetup{display:grid;place-items:start center;box-sizing:border-box;overflow:auto;padding:16px 0}.sshForm{display:grid;gap:10px;width:min(440px,calc(100% - 32px));padding:8px 0 24px}.sshForm h2{margin:0 0 8px}.sshForm label{display:grid;gap:4px;color:#cbd5e1}.sshForm input,.sshForm button{min-height:34px;box-sizing:border-box;border:1px solid #4b5563;border-radius:4px;background:#111827;color:#f9fafb;padding:6px 9px;font:inherit}.sshForm button{border-color:#3b82f6;background:#2563eb;cursor:pointer}.sshNote{margin:0;color:#fbbf24;font-size:12px}
@media(max-width:760px){.sshRoot,.sshSetupRoot{height:calc(100dvh - 260px)}.sshGrid{grid-template-columns:150px minmax(0,1fr);grid-template-rows:minmax(0,1fr) 170px}.sshStatus{padding:10px}.sshStatus dd{font-size:12px}.sshFiles{padding:9px}.sshFileList{grid-template-columns:1fr}.sshMeaning{display:none}.sshPrompt{grid-template-columns:minmax(0,1fr) auto}.sshPrompt span{display:none}}
`.replace("\n", "\n.sshPtyOutput{min-height:100%;box-sizing:border-box;margin:0;padding:8px 10px;background:#0b1220;color:#d1fae5;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.sshRun{padding:3px 10px;border-left:0;background:transparent}.sshRunAi{border-left-color:transparent}.sshRunHuman{border-left-color:transparent}.sshPrompt{border:0;border-top:1px solid #334155;border-radius:0;background:#0b1220;margin-top:0;padding:8px 10px}.sshPrompt textarea{height:22px;padding:0}.sshFiles{grid-column:2;border-top:1px solid #334155;padding-bottom:0}.sshPath{margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cbd5e1}.sshToolbar button{border:1px solid #475569;background:#1e293b;color:#cbd5e1;padding:3px 7px;cursor:pointer}.sshFileBrowser{display:grid;grid-template-columns:190px minmax(0,1fr);height:calc(100% - 34px);min-height:0;border:1px solid #334155}.sshTree,.sshFileList{min-height:0;overflow:auto;margin:0;padding:3px;list-style:none}.sshTree{border-right:1px solid #334155;background:#111b2d}.sshTree li button{width:100%;border:0;background:transparent;color:#cbd5e1;text-align:left;padding:5px 7px;cursor:pointer}.sshTree li button.selected,.sshTree li button:hover{background:#294a6b;color:#fff}.sshFileList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#334155}.sshFileList li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center;min-width:0;background:#172238;padding:5px 8px}.sshFileList li strong button{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit}.sshTraffic{display:grid;grid-template-columns:1fr 1fr;gap:5px;color:#cbd5e1;font-size:11px}.sshTrafficPlot{grid-column:1 / -1;height:42px;border:1px solid #51657c;background:repeating-linear-gradient(90deg,transparent 0 7px,#334155 8px),linear-gradient(165deg,transparent 0 35%,#a79d76 36% 100%)}\n").replace(/\n$/, "\n.sshRuns .sshRun{padding:3px 10px;border-left:0;background:transparent}.sshRuns .sshRunAi{border-left-color:transparent}.sshRuns .sshRunHuman{border-left-color:transparent}.sshPrompt{border:0;border-top:1px solid #334155;border-radius:0;background:#0b1220;margin-top:0;padding:8px 10px}.sshPrompt textarea{height:22px;padding:0}.sshFiles{grid-column:2;border-top:1px solid #334155;padding-bottom:0}.sshFileBrowser{display:grid;grid-template-columns:190px minmax(0,1fr);height:calc(100% - 34px);min-height:0;border:1px solid #334155}.sshTree,.sshFileList{min-height:0;overflow:auto;margin:0;padding:3px;list-style:none}.sshTree{border-right:1px solid #334155;background:#111b2d}.sshTree li button{width:100%;border:0;background:transparent;color:#cbd5e1;text-align:left;padding:5px 7px;cursor:pointer}.sshTree li button.selected,.sshTree li button:hover{background:#294a6b;color:#fff}.sshFileList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#334155}.sshFileList li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center;min-width:0;background:#172238;padding:5px 8px}.sshFileList li strong button{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit}.sshPath{margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cbd5e1}.sshToolbar button{border:1px solid #475569;background:#1e293b;color:#cbd5e1;padding:3px 7px;cursor:pointer}.sshTraffic{display:grid;grid-template-columns:1fr 1fr;gap:5px;color:#cbd5e1;font-size:11px}.sshTrafficPlot{grid-column:1 / -1;height:42px;border:1px solid #51657c;background:repeating-linear-gradient(90deg,transparent 0 7px,#334155 8px),linear-gradient(165deg,transparent 0 35%,#a79d76 36% 100%)}\n") + "\n.sshRoot{height:calc(100dvh - 175px);min-height:520px}.sshRuns{display:flex;flex-direction:column;min-height:0;overflow-y:auto;overflow-x:hidden;gap:5px;padding-right:6px}.sshRuns .sshPtyOutput{min-height:0;flex:0 0 auto;max-height:320px;overflow:auto}.sshInlineCommand{font-weight:700}.sshInlineAi{color:#fbbf24}.sshInlineHuman{color:#60a5fa}.sshInlineMeaning{display:inline-block;margin-left:8px;color:#cbd5e1;font-size:12px}.sshInfo{display:inline-grid;place-items:center;width:17px;height:17px;margin:0 4px;padding:0;border:1px solid currentColor;border-radius:50%;background:transparent;color:#fbbf24;font:bold 11px/1 ui-sans-serif;cursor:pointer;vertical-align:middle}.sshFiles{grid-column:2;border-top:1px solid #334155;padding-bottom:0}.sshFileBrowser{display:grid;grid-template-columns:190px minmax(0,1fr);height:calc(100% - 34px);min-height:0;border:1px solid #334155}.sshTree,.sshFileList{min-height:0;overflow:auto;margin:0;padding:3px;list-style:none}.sshTree{border-right:1px solid #334155;background:#111b2d}.sshTree li button{width:100%;border:0;background:transparent;color:#cbd5e1;text-align:left;padding:5px 7px;cursor:pointer}.sshTree li button.selected,.sshTree li button:hover{background:#294a6b;color:#fff}.sshFileList{display:grid;grid-template-columns:minmax(180px,2fr) minmax(150px,1.5fr) minmax(100px,1fr) minmax(70px,.7fr);grid-auto-rows:minmax(31px,auto);gap:0;background:#334155}.sshFileList li{display:contents}.sshFileList li > *{display:flex;align-items:center;min-width:0;overflow:hidden;background:#172238;color:#e2e8f0;padding:6px 10px;border-bottom:1px solid #334155;text-overflow:ellipsis;white-space:nowrap}.sshFileList li > small{justify-content:flex-end;color:#94a3b8}.sshFileList li strong button{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit}.sshFileList .sshFileHeader{display:contents}.sshFileList .sshFileHeader > *{background:#21314b;color:#cbd5e1;font-size:12px}.sshFileList .sshEmpty{display:block;grid-column:1 / -1;background:#172238;color:#94a3b8}.sshPath{margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cbd5e1}.sshToolbar button{border:1px solid #475569;background:#1e293b;color:#cbd5e1;padding:3px 7px;cursor:pointer}.sshPrompt{border:0;border-top:1px solid #334155;border-radius:0;background:#0b1220;margin-top:0;padding:8px 10px}.sshPrompt textarea{height:22px;padding:0}.sshTraffic{display:grid;grid-template-columns:1fr 1fr;gap:5px;color:#cbd5e1;font-size:11px}.sshTrafficPlot{grid-column:1 / -1;height:42px;border:1px solid #51657c;background:repeating-linear-gradient(90deg,transparent 0 7px,#334155 8px),linear-gradient(165deg,transparent 0 35%,#a79d76 36% 100%)}";
		function ensureStyles() {
			const existing = document.getElementById(STYLE_ID);
			const style = existing instanceof HTMLStyleElement ? existing : document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = finalCss;
			if (existing === null) document.head.append(style);
		}
		//#endregion
		//#region src/client/SshConsoleView.tsx
		let lastMountedSessionId;
		/** Embedded SSH workspace bound to exactly one conversation. */
		function SshConsoleView({ sessionId, t }) {
			const [snapshot, setSnapshot] = (0, react.useState)({
				sessionId,
				status: "unconfigured",
				runs: []
			});
			const [form, setForm] = (0, react.useState)({
				host: "",
				port: "22",
				username: "",
				password: "",
				hostKey: ""
			});
			const [command, setCommand] = (0, react.useState)("");
			const [terminalOutput, setTerminalOutput] = (0, react.useState)("");
			const [error, setError] = (0, react.useState)(null);
			const [statsValue, setStatsValue] = (0, react.useState)(null);
			const [entries, setEntries] = (0, react.useState)([]);
			const [directory, setDirectory] = (0, react.useState)("/");
			const [busy, setBusy] = (0, react.useState)(false);
			const [expandedRun, setExpandedRun] = (0, react.useState)(null);
			const closing = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				ensureStyles();
				let active = true;
				const load = async () => {
					try {
						const value = await state(sessionId);
						if (active) {
							setSnapshot(value);
							setTerminalOutput(value.terminalOutput ?? "");
						}
					} catch (cause) {
						if (active) setError(message(cause));
					}
				};
				load();
				const timer = window.setInterval(() => {
					load();
				}, 1e3);
				return () => {
					active = false;
					window.clearInterval(timer);
				};
			}, [sessionId]);
			(0, react.useEffect)(() => {
				const previous = lastMountedSessionId;
				lastMountedSessionId = sessionId;
				if (previous === void 0) return;
				if (previous === sessionId || closing.current) return;
				state(previous).then((value) => {
					if (value.status !== "connected") return;
					if (window.confirm("切换会话将关闭当前 SSH 连接，未完成命令也会终止。是否继续？")) {
						closing.current = true;
						disconnect(previous).finally(() => {
							closing.current = false;
						});
					}
				}).catch(() => void 0);
			}, [sessionId]);
			(0, react.useEffect)(() => {
				if (snapshot.status !== "connected") return;
				let active = true;
				const load = async () => {
					try {
						const [serverStats, serverFiles] = await Promise.all([stats(sessionId), files(sessionId, directory)]);
						if (active) {
							setStatsValue(serverStats);
							setEntries(serverFiles);
						}
					} catch {}
				};
				load();
				const timer = window.setInterval(() => {
					load();
				}, 1e4);
				return () => {
					active = false;
					window.clearInterval(timer);
				};
			}, [
				directory,
				sessionId,
				snapshot.status
			]);
			const submitConnect = (0, react.useCallback)(async (confirmation = false) => {
				setBusy(true);
				setError(null);
				try {
					const value = await connect({
						sessionId,
						host: form.host.trim(),
						port: Number(form.port),
						username: form.username,
						password: form.password,
						...form.hostKey.trim() === "" ? {} : { hostKey: form.hostKey.trim() }
					}, confirmation);
					setSnapshot(value);
					setForm((current) => ({
						...current,
						password: ""
					}));
				} catch (cause) {
					const failure = cause;
					if (failure.code === "HOST_KEY_CONFIRMATION_REQUIRED" && failure.fingerprint !== void 0) {
						const fingerprint = failure.fingerprint;
						setForm((current) => ({
							...current,
							hostKey: fingerprint
						}));
						setError(`主机密钥指纹为 ${fingerprint}。请核对后再次点击“确认并连接”。`);
					} else setError(message(cause));
				} finally {
					setBusy(false);
				}
			}, [form, sessionId]);
			const submitCommand = (0, react.useCallback)(async () => {
				if (command.trim() === "") {
					setError("请输入命令。");
					return;
				}
				setBusy(true);
				setError(null);
				try {
					await input(sessionId, `${command}\r`, command);
					setCommand("");
				} catch (cause) {
					setError(message(cause));
				} finally {
					setBusy(false);
				}
			}, [command, sessionId]);
			const close = (0, react.useCallback)(async () => {
				if (!window.confirm("确认关闭当前 SSH 连接？")) return;
				closing.current = true;
				setBusy(true);
				try {
					await disconnect(sessionId);
					setSnapshot({
						sessionId,
						status: "unconfigured",
						runs: []
					});
					setStatsValue(null);
					setEntries([]);
					setDirectory("/");
				} catch (cause) {
					setError(message(cause));
				} finally {
					closing.current = false;
					setBusy(false);
				}
			}, [sessionId]);
			if (snapshot.status !== "connected") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "sshRoot sshSetupRoot",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sshGlass",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "SSH 控制台" }),
						" · ",
						snapshot.status === "unconfigured" ? t("unconfigured") : snapshot.status
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "sshSetup",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: "sshForm",
						onSubmit: (event) => {
							event.preventDefault();
							submitConnect(form.hostKey.trim() !== "");
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("connect") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [t("host"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: form.host,
								autoComplete: "off",
								onChange: (event) => setForm({
									...form,
									host: event.target.value
								}),
								required: true
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [t("port"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: form.port,
								inputMode: "numeric",
								onChange: (event) => setForm({
									...form,
									port: event.target.value
								}),
								required: true
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [t("username"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: form.username,
								autoComplete: "off",
								onChange: (event) => setForm({
									...form,
									username: event.target.value
								}),
								required: true
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [t("password"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "password",
								value: form.password,
								autoComplete: "new-password",
								onChange: (event) => setForm({
									...form,
									password: event.target.value
								}),
								required: true
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [t("hostKey"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: form.hostKey,
								placeholder: "首次连接后显示",
								onChange: (event) => setForm({
									...form,
									hostKey: event.target.value
								})
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "sshNote",
								children: t("untrusted")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: busy,
								children: form.hostKey.trim() === "" ? t("connect") : t("confirmHost")
							}),
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "sshError",
								children: error
							})
						]
					})
				})]
			});
			const cpu = percentage(statsValue?.cpuPercent);
			const memory = percentage(statsValue?.memoryPercent);
			const directories = entries.filter((entry) => entry.kind === "directory");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "sshRoot",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "sshGlass",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
							snapshot.profile?.username,
							"@",
							snapshot.profile?.host
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "已连接" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: snapshot.runs[0] === void 0 ? "SSH 已连接，AI 可使用 ssh_exec" : `最近：${snapshot.runs[0].description}` }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								close();
							},
							children: "断开"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sshGrid",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
							className: "sshStatus",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "系统信息" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "IP 地址" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [
										snapshot.profile?.host,
										":",
										snapshot.profile?.port
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "账号" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: snapshot.profile?.username }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Host key" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: snapshot.profile?.fingerprint })
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: "sshChart",
									"aria-label": "服务器资源图表",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
											label: "CPU",
											value: cpu
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											className: "sshLoad",
											children: ["负载 ", statsValue?.loadAverage?.map((value) => value.toFixed(2)).join(", ") ?? "暂不可用"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
											label: "内存",
											value: memory
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
											label: "交换",
											value: percentage(statsValue?.swapPercent)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "sshMemoryCaption",
											children: [
												formatBytes((statsValue?.memoryTotalBytes ?? 0) - (statsValue?.memoryAvailableBytes ?? 0)),
												" / ",
												formatBytes(statsValue?.memoryTotalBytes ?? 0)
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "sshTraffic",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "↑ 0 B" }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "↓ 0 B" }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: "sshTrafficPlot",
													"aria-hidden": "true"
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: ["运行时间 ", statsValue?.uptimeSeconds === null || statsValue === null ? "暂不可用" : `${Math.floor(statsValue.uptimeSeconds / 86400)} 天`] })
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "sshPanel sshTerminal",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "sshToolbar",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "终端" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [snapshot.runs.length, " 条命令"] })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "sshRuns",
									"aria-live": "polite",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "sshPtyOutput",
										children: terminalOutput === "" ? "终端已就绪，等待 AI 或人工输入。" : renderTerminalOutput(terminalOutput, snapshot.runs, expandedRun, setExpandedRun)
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
									className: "sshPrompt",
									onSubmit: (event) => {
										event.preventDefault();
										submitCommand();
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											"aria-hidden": "true",
											children: [
												snapshot.profile?.username,
												"@",
												snapshot.profile?.host,
												":~$"
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											autoFocus: true,
											value: command,
											rows: 1,
											placeholder: "输入命令，Enter 执行，Shift+Enter 换行",
											onChange: (event) => setCommand(event.target.value),
											onKeyDown: (event) => {
												if (event.key === "Enter" && !event.shiftKey) {
													event.preventDefault();
													submitCommand();
												}
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "submit",
											disabled: busy,
											"aria-label": "执行终端命令",
											children: "执行"
										})
									]
								}),
								error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "sshError",
									children: error
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "sshPanel sshFiles",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sshToolbar",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "服务器文件" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "sshPath",
										children: directory
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setDirectory("/"),
										children: "根目录"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sshFileBrowser",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
									className: "sshTree",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: directory === "/" ? "selected" : "",
										onClick: () => setDirectory("/"),
										children: "📁 /"
									}) }), directories.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: directory === entry.path ? "selected" : "",
										onClick: () => setDirectory(entry.path),
										children: ["📁 ", entry.name]
									}) }, entry.path))]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
									className: "sshFileList",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
											className: "sshFileHeader",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "名称" }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "修改时间" }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "类型" }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "大小" })
											]
										}),
										entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
											className: "sshEmpty",
											children: "正在读取目录…"
										}),
										entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: entry.kind === "directory" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => setDirectory(entry.path),
												children: ["📁 ", entry.name]
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
												entry.kind === "file" ? "📄" : "🔗",
												" ",
												entry.name
											] }) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatModified(entry.modifiedAt) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fileTypeLabel(entry) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: entry.size === null ? "" : formatBytes(entry.size) })
										] }, entry.path))
									]
								})]
							})]
						})
					]
				})]
			});
		}
		function Metric({ label, value }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sshMetric",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: value === null ? "暂不可用" : `${value.toFixed(1)}%` })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "sshMeter",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { width: `${value ?? 0}%` } })
				})]
			});
		}
		function percentage(value) {
			return value === null || value === void 0 || !Number.isFinite(value) ? null : Math.max(0, Math.min(100, value));
		}
		function formatBytes(value) {
			if (!Number.isFinite(value) || value <= 0) return "0 B";
			if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)}G`;
			if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)}M`;
			return `${Math.round(value / 1024)}K`;
		}
		function formatModified(value) {
			if (value === null || value === "") return "-";
			return value.replace("T", " ").slice(0, 16);
		}
		function fileTypeLabel(entry) {
			if (entry.kind === "directory") return "文件夹";
			if (entry.kind === "link") return "链接";
			const extension = entry.name.includes(".") ? entry.name.split(".").pop()?.toUpperCase() : "";
			return extension === void 0 || extension === "" ? "文件" : `${extension} 文件`;
		}
		function renderTerminalOutput(text, runs, expandedRun, setExpandedRun) {
			const ordered = [...runs].sort((a, b) => b.command.length - a.command.length);
			return text.split(/\r?\n/u).map((line, index) => {
				const run = ordered.find((item) => line.includes(item.command));
				if (run === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: line }, index);
				const start = line.indexOf(run.command);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: line.slice(0, start) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `sshInlineCommand sshInline${run.source === "ai" ? "Ai" : "Human"}`,
						children: run.command
					}),
					run.source === "ai" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "sshInfo",
						"aria-label": `查看命令说明：${run.command}`,
						onClick: () => setExpandedRun(expandedRun === run.runId ? null : run.runId),
						children: "?"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: line.slice(start + run.command.length) }),
					run.source === "ai" && expandedRun === run.runId && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "sshInlineMeaning",
						children: run.description
					})
				] }, index);
			});
		}
		function message(error) {
			return error instanceof Error ? error.message : String(error);
		}
		//#endregion
		//#region src/client/locales.ts
		const NS = "dsh-withssh";
		const zh = {
			view: "SSH 控制台",
			connect: "连接服务器",
			disconnect: "断开连接",
			host: "主机",
			port: "端口",
			username: "账号",
			password: "密码",
			hostKey: "主机密钥指纹",
			confirmHost: "确认并连接",
			untrusted: "首次连接必须核对主机密钥指纹。",
			command: "输入命令",
			description: "命令含义（必填）",
			execute: "执行",
			connected: "已连接",
			unconfigured: "尚未配置 SSH 连接"
		};
		const en = {
			view: "SSH Console",
			connect: "Connect server",
			disconnect: "Disconnect",
			host: "Host",
			port: "Port",
			username: "Username",
			password: "Password",
			hostKey: "Host key fingerprint",
			confirmHost: "Confirm and connect",
			untrusted: "Verify the host key fingerprint before continuing.",
			command: "Command",
			description: "Command meaning (required)",
			execute: "Run",
			connected: "Connected",
			unconfigured: "SSH is not configured"
		};
		//#endregion
		//#region src/client/index.ts
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-withssh: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "dsh-withssh-console",
				order: 20,
				label: () => t("view"),
				locale: NS
			}, SshConsoleView));
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "dsh-withssh-status",
				order: 20,
				locale: NS
			}, () => null));
		}
		//#endregion
		exports.SshConsoleView = SshConsoleView;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map