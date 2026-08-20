/** Public JSON vocabulary shared by the SSH host routes and browser view. */
export interface SshConnectInput {
  sessionId: string
  host: string
  port: number
  username: string
  password: string
  hostKey?: string
}

export interface SshProfileView {
  host: string
  port: number
  username: string
  fingerprint?: string
}

export interface SshRunView {
  runId: string
  source: 'ai' | 'human'
  command: string
  description: string
  status: 'running' | 'success' | 'failed' | 'timeout' | 'cancelled'
  stdout: string
  stderr: string
  exitCode: number | null
  startedAt: string
  finishedAt?: string
}

export interface SshServerStats {
  cpuPercent: number | null
  loadAverage?: readonly [number, number, number] | null
  memoryPercent: number | null
  memoryTotalBytes?: number | null
  memoryAvailableBytes?: number | null
  swapPercent?: number | null
  uptimeSeconds: number | null
  collectedAt: string
}

export interface SshFileEntry {
  name: string
  path: string
  kind: 'file' | 'directory' | 'link' | 'other'
  size: number | null
  modifiedAt: string | null
}

export interface SshConsoleState {
  sessionId: string
  status: 'unconfigured' | 'connecting' | 'host-key-confirmation' | 'connected' | 'disconnecting' | 'error'
  error?: string
  profile?: SshProfileView
  connectionId?: string
  hostKeyChallenge?: string
  stats?: SshServerStats
  files?: readonly SshFileEntry[]
  terminalOutput?: string
  runs: readonly SshRunView[]
}
