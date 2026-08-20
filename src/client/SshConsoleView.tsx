import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SshConsoleState, SshFileEntry, SshRunView, SshServerStats } from '../host/types.ts'
import { connect, disconnect, files, input, state, stats } from './api.ts'
import { ensureStyles } from './styles.ts'

type ErrorWithFingerprint = Error & { fingerprint?: string, code?: string }
type Props = ConvViewProps & PropsLocale<'dsh-withssh'>
let lastMountedSessionId: string | undefined

/** Embedded SSH workspace bound to exactly one conversation. */
export function SshConsoleView({ sessionId, t }: Props) {
  const [snapshot, setSnapshot] = useState<SshConsoleState>({ sessionId, status: 'unconfigured', runs: [] })
  const [form, setForm] = useState({ host: '', port: '22', username: '', password: '', hostKey: '' })
  const [command, setCommand] = useState('')
  const [terminalOutput, setTerminalOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statsValue, setStatsValue] = useState<SshServerStats | null>(null)
  const [entries, setEntries] = useState<readonly SshFileEntry[]>([])
  const [directory, setDirectory] = useState('/')
  const [busy, setBusy] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const closing = useRef(false)

  useEffect(() => {
    ensureStyles()
    let active = true
    const load = async (): Promise<void> => { try { const value = await state(sessionId); if (active) { setSnapshot(value); setTerminalOutput(value.terminalOutput ?? '') } } catch (cause) { if (active) setError(message(cause)) } }
    void load()
    const timer = window.setInterval(() => { void load() }, 1000)
    return () => { active = false; window.clearInterval(timer) }
  }, [sessionId])
  useEffect(() => {
    const previous = lastMountedSessionId
    lastMountedSessionId = sessionId
    if (previous === undefined) return
    if (previous === sessionId || closing.current) return
    void state(previous).then(value => {
      if (value.status !== 'connected') return
      if (window.confirm('切换会话将关闭当前 SSH 连接，未完成命令也会终止。是否继续？')) {
        closing.current = true
        void disconnect(previous).finally(() => { closing.current = false })
      }
    }).catch(() => undefined)
  }, [sessionId])
  useEffect(() => {
    if (snapshot.status !== 'connected') return
    let active = true
    const load = async (): Promise<void> => { try { const [serverStats, serverFiles] = await Promise.all([stats(sessionId), files(sessionId, directory)]); if (active) { setStatsValue(serverStats); setEntries(serverFiles) } } catch { /* The connection state view remains authoritative. */ } }
    void load()
    const timer = window.setInterval(() => { void load() }, 10_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [directory, sessionId, snapshot.status])
  const submitConnect = useCallback(async (confirmation = false): Promise<void> => {
    setBusy(true); setError(null)
    try {
      const value = await connect({ sessionId, host: form.host.trim(), port: Number(form.port), username: form.username, password: form.password, ...(form.hostKey.trim() === '' ? {} : { hostKey: form.hostKey.trim() }) }, confirmation)
      setSnapshot(value)
      setForm(current => ({ ...current, password: '' }))
    } catch (cause) {
      const failure = cause as ErrorWithFingerprint
      if (failure.code === 'HOST_KEY_CONFIRMATION_REQUIRED' && failure.fingerprint !== undefined) {
        const fingerprint = failure.fingerprint
        setForm(current => ({ ...current, hostKey: fingerprint }))
        setError(`主机密钥指纹为 ${fingerprint}。请核对后再次点击“确认并连接”。`)
      } else setError(message(cause))
    } finally { setBusy(false) }
  }, [form, sessionId])
  const submitCommand = useCallback(async (): Promise<void> => {
    if (command.trim() === '') { setError('请输入命令。'); return }
    setBusy(true); setError(null)
    try { await input(sessionId, `${command}\r`, command); setCommand('') } catch (cause) { setError(message(cause)) } finally { setBusy(false) }
  }, [command, sessionId])
  const close = useCallback(async (): Promise<void> => {
    if (!window.confirm('确认关闭当前 SSH 连接？')) return
    closing.current = true; setBusy(true)
    try { await disconnect(sessionId); setSnapshot({ sessionId, status: 'unconfigured', runs: [] }); setStatsValue(null); setEntries([]); setDirectory('/') } catch (cause) { setError(message(cause)) } finally { closing.current = false; setBusy(false) }
  }, [sessionId])

  if (snapshot.status !== 'connected') return <section className="sshRoot sshSetupRoot"><div className="sshGlass"><strong>SSH 控制台</strong> · {snapshot.status === 'unconfigured' ? t('unconfigured') : snapshot.status}</div><div className="sshSetup"><form className="sshForm" onSubmit={event => { event.preventDefault(); void submitConnect(form.hostKey.trim() !== '') }}><h2>{t('connect')}</h2><label>{t('host')}<input value={form.host} autoComplete="off" onChange={event => setForm({ ...form, host: event.target.value })} required /></label><label>{t('port')}<input value={form.port} inputMode="numeric" onChange={event => setForm({ ...form, port: event.target.value })} required /></label><label>{t('username')}<input value={form.username} autoComplete="off" onChange={event => setForm({ ...form, username: event.target.value })} required /></label><label>{t('password')}<input type="password" value={form.password} autoComplete="new-password" onChange={event => setForm({ ...form, password: event.target.value })} required /></label><label>{t('hostKey')}<input value={form.hostKey} placeholder="首次连接后显示" onChange={event => setForm({ ...form, hostKey: event.target.value })} /></label><p className="sshNote">{t('untrusted')}</p><button type="submit" disabled={busy}>{form.hostKey.trim() === '' ? t('connect') : t('confirmHost')}</button>{error !== null && <p className="sshError">{error}</p>}</form></div></section>

  const cpu = percentage(statsValue?.cpuPercent)
  const memory = percentage(statsValue?.memoryPercent)
  const directories = entries.filter(entry => entry.kind === 'directory')
  return <section className="sshRoot"><header className="sshGlass"><strong>{snapshot.profile?.username}@{snapshot.profile?.host}</strong><span>已连接</span><span>{snapshot.runs[0] === undefined ? 'SSH 已连接，AI 可使用 ssh_exec' : `最近：${snapshot.runs[0].description}`}</span><button type="button" onClick={() => { void close() }}>断开</button></header><div className="sshGrid"><aside className="sshStatus"><h2>系统信息</h2><dl><dt>IP 地址</dt><dd>{snapshot.profile?.host}:{snapshot.profile?.port}</dd><dt>账号</dt><dd>{snapshot.profile?.username}</dd><dt>Host key</dt><dd>{snapshot.profile?.fingerprint}</dd></dl><section className="sshChart" aria-label="服务器资源图表"><Metric label="CPU" value={cpu} /><p className="sshLoad">负载 {statsValue?.loadAverage?.map(value => value.toFixed(2)).join(', ') ?? '暂不可用'}</p><Metric label="内存" value={memory} /><Metric label="交换" value={percentage(statsValue?.swapPercent)} /><div className="sshMemoryCaption">{formatBytes((statsValue?.memoryTotalBytes ?? 0) - (statsValue?.memoryAvailableBytes ?? 0))} / {formatBytes(statsValue?.memoryTotalBytes ?? 0)}</div><div className="sshTraffic"><span>↑ 0 B</span><span>↓ 0 B</span><div className="sshTrafficPlot" aria-hidden="true" /></div><p>运行时间 {statsValue?.uptimeSeconds === null || statsValue === null ? '暂不可用' : `${Math.floor(statsValue.uptimeSeconds / 86400)} 天`}</p></section></aside><section className="sshPanel sshTerminal"><div className="sshToolbar"><h2>终端</h2><span>{snapshot.runs.length} 条命令</span></div><div className="sshRuns" aria-live="polite"><div className="sshPtyOutput">{terminalOutput === '' ? '终端已就绪，等待 AI 或人工输入。' : renderTerminalOutput(terminalOutput, snapshot.runs, expandedRun, setExpandedRun)}</div></div><form className="sshPrompt" onSubmit={event => { event.preventDefault(); void submitCommand() }}><span aria-hidden="true">{snapshot.profile?.username}@{snapshot.profile?.host}:~$</span><textarea autoFocus value={command} rows={1} placeholder="输入命令，Enter 执行，Shift+Enter 换行" onChange={event => setCommand(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submitCommand() } }} /><button type="submit" disabled={busy} aria-label="执行终端命令">执行</button></form>{error !== null && <p className="sshError">{error}</p>}</section><section className="sshPanel sshFiles"><div className="sshToolbar"><h2>服务器文件</h2><span className="sshPath">{directory}</span><button type="button" onClick={() => setDirectory('/')}>根目录</button></div><div className="sshFileBrowser"><ul className="sshTree"><li><button type="button" className={directory === '/' ? 'selected' : ''} onClick={() => setDirectory('/')}>📁 /</button></li>{directories.map(entry => <li key={entry.path}><button type="button" className={directory === entry.path ? 'selected' : ''} onClick={() => setDirectory(entry.path)}>📁 {entry.name}</button></li>)}</ul><ul className="sshFileList"><li className="sshFileHeader"><span>名称</span><span>修改时间</span><span>类型</span><span>大小</span></li>{entries.length === 0 && <li className="sshEmpty">正在读取目录…</li>}{entries.map(entry => <li key={entry.path}><strong>{entry.kind === 'directory' ? <button type="button" onClick={() => setDirectory(entry.path)}>📁 {entry.name}</button> : <span>{entry.kind === 'file' ? '📄' : '🔗'} {entry.name}</span>}</strong><span>{formatModified(entry.modifiedAt)}</span><span>{fileTypeLabel(entry)}</span><small>{entry.size === null ? '' : formatBytes(entry.size)}</small></li>)}</ul></div></section></div></section>
}

function Metric({ label, value }: { label: string, value: number | null }) { return <div className="sshMetric"><div><span>{label}</span><strong>{value === null ? '暂不可用' : `${value.toFixed(1)}%`}</strong></div><div className="sshMeter"><span style={{ width: `${value ?? 0}%` }} /></div></div> }
function percentage(value: number | null | undefined): number | null { return value === null || value === undefined || !Number.isFinite(value) ? null : Math.max(0, Math.min(100, value)) }
function formatBytes(value: number): string { if (!Number.isFinite(value) || value <= 0) return '0 B'; if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)}G`; if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)}M`; return `${Math.round(value / 1024)}K` }
function formatModified(value: string | null): string { if (value === null || value === '') return '-'; return value.replace('T', ' ').slice(0, 16) }
function fileTypeLabel(entry: SshFileEntry): string { if (entry.kind === 'directory') return '文件夹'; if (entry.kind === 'link') return '链接'; const extension = entry.name.includes('.') ? entry.name.split('.').pop()?.toUpperCase() : ''; return extension === undefined || extension === '' ? '文件' : `${extension} 文件` }
function renderTerminalOutput(text: string, runs: readonly SshRunView[], expandedRun: string | null, setExpandedRun: (runId: string | null) => void): ReactNode { const ordered = [...runs].sort((a, b) => b.command.length - a.command.length); return text.split(/\r?\n/u).map((line, index) => { const run = ordered.find(item => line.includes(item.command)); if (run === undefined) return <div key={index}>{line}</div>; const start = line.indexOf(run.command); return <div key={index}><span>{line.slice(0, start)}</span><span className={`sshInlineCommand sshInline${run.source === 'ai' ? 'Ai' : 'Human'}`}>{run.command}</span>{run.source === 'ai' && <button type="button" className="sshInfo" aria-label={`查看命令说明：${run.command}`} onClick={() => setExpandedRun(expandedRun === run.runId ? null : run.runId)}>?</button>}<span>{line.slice(start + run.command.length)}</span>{run.source === 'ai' && expandedRun === run.runId && <span className="sshInlineMeaning">{run.description}</span>}</div> }) }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error) }
