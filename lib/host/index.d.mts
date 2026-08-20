import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
//#region src/host/types.d.ts
/** Public JSON vocabulary shared by the SSH host routes and browser view. */
interface SshConnectInput {
  sessionId: string;
  host: string;
  port: number;
  username: string;
  password: string;
  hostKey?: string;
}
interface SshProfileView {
  host: string;
  port: number;
  username: string;
  fingerprint?: string;
}
interface SshRunView {
  runId: string;
  source: 'ai' | 'human';
  command: string;
  description: string;
  status: 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startedAt: string;
  finishedAt?: string;
}
interface SshServerStats {
  cpuPercent: number | null;
  loadAverage?: readonly [number, number, number] | null;
  memoryPercent: number | null;
  memoryTotalBytes?: number | null;
  memoryAvailableBytes?: number | null;
  swapPercent?: number | null;
  uptimeSeconds: number | null;
  collectedAt: string;
}
interface SshFileEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory' | 'link' | 'other';
  size: number | null;
  modifiedAt: string | null;
}
interface SshConsoleState {
  sessionId: string;
  status: 'unconfigured' | 'connecting' | 'host-key-confirmation' | 'connected' | 'disconnecting' | 'error';
  error?: string;
  profile?: SshProfileView;
  connectionId?: string;
  hostKeyChallenge?: string;
  stats?: SshServerStats;
  files?: readonly SshFileEntry[];
  terminalOutput?: string;
  runs: readonly SshRunView[];
}
//#endregion
//#region src/host/index.d.ts
declare const name = "dsh-withssh";
declare const inject: string[];
/** Owns one ephemeral SSH connection per Harness session. Authentication data never enters a session event. */
declare class SshConsoleService extends Service {
  static inject: string[];
  static Config: z<{
    connectTimeoutMs?: number;
  }>;
  private readonly connections;
  private readonly pendingConnections;
  private readonly leases;
  private readonly connectTimeoutMs;
  constructor(ctx: Context, config: {
    connectTimeoutMs?: number;
  });
  state(sessionId: string): SshConsoleState;
  connect(input: SshConnectInput): Promise<SshConsoleState>;
  confirmHostKey(input: SshConnectInput): Promise<SshConsoleState>;
  run(sessionId: string, command: string, description: string, source: 'ai' | 'human'): Promise<SshRunView>;
  /** Write user keystrokes to this session's persistent PTY without creating a model-visible tool call. */
  input(sessionId: string, text: string, command?: string): void;
  stats(sessionId: string): Promise<SshServerStats>;
  files(sessionId: string, directory?: string): Promise<readonly SshFileEntry[]>;
  close(sessionId: string, _reason?: string): Promise<void>;
  closeAll(reason: string): Promise<void>;
  /** Execute a display-neutral maintenance command without creating a terminal history row. */
  private internalCommand;
  private openInteractiveShell;
  private openClient;
  private leaseValue;
  private destroyLease;
}
declare class HostKeyChallengeError extends Error {
  readonly fingerprint: string;
  readonly leaseId: string;
  constructor(fingerprint: string, leaseId: string);
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    sshConsole: SshConsoleService;
  }
}
declare function sanitizeRemoteOutput(text: string): string;
//#endregion
export { HostKeyChallengeError, SshConsoleService, SshConsoleService as default, inject, name, sanitizeRemoteOutput };
//# sourceMappingURL=index.d.mts.map