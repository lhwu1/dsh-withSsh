import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from './index.ts'
import { HostKeyChallengeError } from './index.ts'
import type { SshConnectInput } from './types.ts'

export const name = 'dsh-withssh-web'
export const inject = ['webServer', 'sshConsole']
const MAX_BODY_BYTES = 32 * 1024

/** Expose session-scoped SSH operations over same-origin, non-cacheable routes. */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const routes = [
      ctx.webServer.register({ kind: 'exact', path: '/dsh-withssh/state.json', async handler(request, response) { try { requireMethod(request, 'GET'); const sessionId = query(request, 'sessionId'); sendJson(response, 200, ctx.sshConsole.state(sessionId)) } catch (error) { sendError(response, error) } } }),
      ctx.webServer.register({ kind: 'exact', path: '/dsh-withssh/connect.json', async handler(request, response) { await connectRoute(ctx, request, response, false) } }),
      ctx.webServer.register({ kind: 'exact', path: '/dsh-withssh/confirm-host.json', async handler(request, response) { await connectRoute(ctx, request, response, true) } }),
      ctx.webServer.register({ kind: 'exact', path: '/dsh-withssh/disconnect.json', async handler(request, response) { try { requireMethod(request, 'POST'); const body = await readJson(request); if (!isSessionBody(body)) throw new TypeError('sessionId 无效'); await ctx.sshConsole.close(body.sessionId, 'browser request'); sendJson(response, 200, { status: 'closed' }) } catch (error) { sendError(response, error) } } }),
      ctx.webServer.register({ kind: 'exact', path: '/dsh-withssh/input.json', async handler(request, response) { try { requireMethod(request, 'POST'); const body = await readJson(request); if (!isInputBody(body)) throw new TypeError('终端输入无效'); ctx.sshConsole.input(body.sessionId, body.text, body.command); sendJson(response, 200, { status: 'accepted' }) } catch (error) { sendError(response, error) } } }),
      ctx.webServer.register({ kind: 'exact', path: '/dsh-withssh/stats.json', async handler(request, response) { try { requireMethod(request, 'GET'); sendJson(response, 200, await ctx.sshConsole.stats(query(request, 'sessionId'))) } catch (error) { sendError(response, error) } } }),
      ctx.webServer.register({ kind: 'exact', path: '/dsh-withssh/files.json', async handler(request, response) { try { requireMethod(request, 'GET'); const sessionId = query(request, 'sessionId'); const directory = new URL(request.url ?? '/', 'http://localhost').searchParams.get('path') ?? '/'; sendJson(response, 200, await ctx.sshConsole.files(sessionId, directory)) } catch (error) { sendError(response, error) } } }),
    ]
    return () => { for (const dispose of routes) dispose() }
  }, 'dsh-withssh: web routes')
}

async function connectRoute(ctx: Context, request: IncomingMessage, response: ServerResponse, confirmation: boolean): Promise<void> {
  if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
  try { const body = await readJson(request); if (!isConnectBody(body)) throw new TypeError('SSH 连接参数无效'); sendJson(response, 200, confirmation ? await ctx.sshConsole.confirmHostKey(body) : await ctx.sshConsole.connect(body)) } catch (error) { sendError(response, error) }
}
async function readJson(request: IncomingMessage): Promise<unknown> { const chunks: Buffer[] = []; let size = 0; for await (const chunk of request) { const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += data.byteLength; if (size > MAX_BODY_BYTES) throw new RangeError('请求体过大'); chunks.push(data) } return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
function query(request: IncomingMessage, name: string): string { const value = new URL(request.url ?? '/', 'http://localhost').searchParams.get(name); if (value === null || value.trim() === '' || value.length > 512) throw new TypeError(`${name} 无效`); return value }
function requireMethod(request: IncomingMessage, expected: 'GET' | 'POST'): void { if (request.method !== expected) throw new Error(`只允许使用 ${expected} 请求。`) }
function isSessionBody(value: unknown): value is { sessionId: string } { if (typeof value !== 'object' || value === null) return false; const sessionId = (value as { sessionId?: unknown }).sessionId; return typeof sessionId === 'string' && sessionId.trim() !== '' && sessionId.length <= 512 }
function isConnectBody(value: unknown): value is SshConnectInput { if (typeof value !== 'object' || value === null) return false; const v = value as Record<string, unknown>; return typeof v.sessionId === 'string' && typeof v.host === 'string' && typeof v.port === 'number' && typeof v.username === 'string' && typeof v.password === 'string' && (v.hostKey === undefined || typeof v.hostKey === 'string') }
function isInputBody(value: unknown): value is { sessionId: string, text: string, command?: string } { if (typeof value !== 'object' || value === null) return false; const v = value as Record<string, unknown>; return typeof v.sessionId === 'string' && v.sessionId.trim() !== '' && v.sessionId.length <= 512 && typeof v.text === 'string' && (v.command === undefined || typeof v.command === 'string') }
function sendJson(response: ServerResponse, status: number, value: unknown): void { response.writeHead(status, { 'cache-control': 'no-store', pragma: 'no-cache', 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)) }
function sendError(response: ServerResponse, error: unknown): void { if (error instanceof HostKeyChallengeError) { sendJson(response, 409, { error: 'HOST_KEY_CONFIRMATION_REQUIRED', fingerprint: error.fingerprint }); return } const message = error instanceof Error ? error.message : 'SSH 请求失败'; sendJson(response, 400, { error: message }) }
