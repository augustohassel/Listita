import type { SyncSnapshot } from '../../utils/syncEngine'

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'token_expired'
  | 'not_configured'
  | 'error'

export type CloudSyncErrorCode =
  | 'OFFLINE'
  | 'NOT_CONFIGURED'
  | 'AUTH_DENIED'
  | 'TOKEN_EXPIRED'
  | 'NETWORK_ERROR'
  | 'INVALID_REMOTE_DATA'

export class CloudSyncError extends Error {
  readonly code: CloudSyncErrorCode

  constructor(code: CloudSyncErrorCode, message: string) {
    super(message)
    this.name = 'CloudSyncError'
    this.code = code
  }
}

export interface CloudSyncProvider {
  isConfigured(): boolean
  isConnected(): boolean
  getClientIdOverride(): string
  setClientIdOverride(clientId: string): void
  hasDefaultClientId(): boolean
  getLastSyncedAt(): number | null
  setLastSyncedAt(timestamp: number | null): void
  connect(): Promise<void>
  disconnect(): Promise<void>
  readRemoteBackup(): Promise<SyncSnapshot | null>
  writeRemoteBackup(snapshot: SyncSnapshot): Promise<void>
}

export interface SyncState {
  status: SyncStatus
  connected: boolean
  lastSyncedAt: number | null
  lastError: string | null
  pendingChanges: boolean
  hasDefaultClientId: boolean
  clientIdOverride: string
}
