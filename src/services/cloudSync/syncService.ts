import { db, subscribeLocalMutations } from '../../db'
import { mergeSnapshots, type SyncSnapshot } from '../../utils/syncEngine'
import { GoogleDriveProvider } from './googleDriveProvider'
import { CloudSyncError, type CloudSyncProvider, type SyncState } from './types'

const EMPTY_SNAPSHOT: SyncSnapshot = {
  lists: [],
  items: [],
  rankings: [],
  tombstones: [],
}

const OPPORTUNISTIC_DEBOUNCE_MS = 1500

async function readLocalSnapshot(): Promise<SyncSnapshot> {
  return db.transaction('r', db.lists, db.items, db.rankings, db.tombstones, async () => {
    const [lists, items, rankings, tombstones] = await Promise.all([
      db.lists.toArray(),
      db.items.toArray(),
      db.rankings.toArray(),
      db.tombstones.toArray(),
    ])
    return { lists, items, rankings, tombstones }
  })
}

async function writeLocalSnapshot(snapshot: SyncSnapshot): Promise<void> {
  await db.transaction('rw', db.lists, db.items, db.rankings, db.tombstones, async () => {
    await db.lists.clear()
    await db.items.clear()
    await db.rankings.clear()
    await db.tombstones.clear()
    if (snapshot.lists.length > 0) await db.lists.bulkAdd(snapshot.lists)
    if (snapshot.items.length > 0) await db.items.bulkAdd(snapshot.items)
    if (snapshot.rankings.length > 0) await db.rankings.bulkAdd(snapshot.rankings)
    if (snapshot.tombstones.length > 0) await db.tombstones.bulkPut(snapshot.tombstones)
  })
}

export class SyncService {
  private readonly provider: CloudSyncProvider
  private state: SyncState
  private readonly listeners = new Set<(state: SyncState) => void>()
  private inFlightSync: Promise<boolean> | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(provider: CloudSyncProvider = new GoogleDriveProvider()) {
    this.provider = provider
    this.state = {
      status: provider.isConfigured() ? 'idle' : 'not_configured',
      connected: provider.isConnected(),
      lastSyncedAt: provider.getLastSyncedAt(),
      lastError: null,
      pendingChanges: false,
      hasDefaultClientId: provider.hasDefaultClientId(),
      clientIdOverride: provider.getClientIdOverride(),
    }
  }

  getState(): SyncState {
    return { ...this.state }
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(patch: Partial<SyncState>): void {
    this.state = { ...this.state, ...patch }
    const snapshot = this.getState()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }

  setClientIdOverride(clientId: string): void {
    this.provider.setClientIdOverride(clientId)
    const configured = this.provider.isConfigured()
    this.setState({
      clientIdOverride: this.provider.getClientIdOverride(),
      status: configured ? 'idle' : 'not_configured',
      lastError: null,
    })
  }

  async connectAndSync(): Promise<boolean> {
    if (this.inFlightSync) return this.inFlightSync

    this.inFlightSync = this.executeConnectAndSync().finally(() => {
      this.inFlightSync = null
    })
    return this.inFlightSync
  }

  private async executeConnectAndSync(): Promise<boolean> {
    const wasConnected = this.provider.isConnected()
    this.setState({ status: 'syncing', lastError: null })
    try {
      await this.provider.connect()
      this.setState({ connected: true })
      return await this.performSync()
    } catch (err) {
      if (
        wasConnected &&
        err instanceof CloudSyncError &&
        err.code === 'AUTH_DENIED'
      ) {
        this.setState({
          status: 'token_expired',
          lastError: err.message,
          pendingChanges: true,
        })
        return false
      }
      this.handleSyncError(err)
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    await this.provider.disconnect()
    this.provider.setLastSyncedAt(null)
    this.setState({
      connected: false,
      lastSyncedAt: null,
      lastError: null,
      pendingChanges: false,
      status: this.provider.isConfigured() ? 'idle' : 'not_configured',
    })
  }

  async syncNow(options: { interactive?: boolean } = {}): Promise<boolean> {
    if (this.inFlightSync) return this.inFlightSync

    this.inFlightSync = this.executeSync(options).finally(() => {
      this.inFlightSync = null
    })
    return this.inFlightSync
  }

  private async executeSync(options: { interactive?: boolean }): Promise<boolean> {
    if (!this.provider.isConfigured()) {
      this.setState({ status: 'not_configured', lastError: null })
      return false
    }

    if (!this.provider.isConnected()) {
      if (!options.interactive) return false
      return this.executeConnectAndSync()
    }

    this.setState({ status: 'syncing', lastError: null })

    try {
      return await this.performSync()
    } catch (err) {
      if (
        options.interactive &&
        err instanceof CloudSyncError &&
        err.code === 'TOKEN_EXPIRED'
      ) {
        return this.executeConnectAndSync()
      }
      this.handleSyncError(err)
      return false
    }
  }

  private async performSync(): Promise<boolean> {
    const [local, remote] = await Promise.all([
      readLocalSnapshot(),
      this.provider.readRemoteBackup(),
    ])

    const merged = mergeSnapshots(local, remote ?? EMPTY_SNAPSHOT)
    await writeLocalSnapshot(merged)
    await this.provider.writeRemoteBackup(merged)

    const syncedAt = Date.now()
    this.provider.setLastSyncedAt(syncedAt)
    this.setState({
      status: 'synced',
      connected: true,
      lastSyncedAt: syncedAt,
      lastError: null,
      pendingChanges: false,
    })
    return true
  }

  private handleSyncError(err: unknown): void {
    if (err instanceof CloudSyncError) {
      switch (err.code) {
        case 'OFFLINE':
          this.setState({
            status: 'offline',
            lastError: err.message,
            pendingChanges: true,
          })
          return
        case 'TOKEN_EXPIRED':
          this.setState({
            status: 'token_expired',
            lastError: err.message,
            pendingChanges: true,
          })
          return
        case 'NOT_CONFIGURED':
          this.setState({
            status: 'not_configured',
            lastError: err.message,
          })
          return
        case 'AUTH_DENIED':
        case 'NETWORK_ERROR':
        case 'INVALID_REMOTE_DATA':
          this.setState({
            status: 'error',
            lastError: err.message,
          })
          return
      }
    }

    this.setState({
      status: 'error',
      lastError:
        err instanceof Error
          ? err.message
          : 'No se pudo completar la sincronización con Google Drive.',
    })
  }

  scheduleOpportunisticSync(): void {
    if (!this.provider.isConnected() || !this.provider.isConfigured()) return
    this.setState({ pendingChanges: true })
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      void this.syncNow({ interactive: false })
    }, OPPORTUNISTIC_DEBOUNCE_MS)
  }

  startAutoSync(): () => void {
    const unsubMutations = subscribeLocalMutations(() => {
      this.scheduleOpportunisticSync()
    })

    const handleVisibility = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        this.provider.isConnected()
      ) {
        void this.syncNow({ interactive: false })
      }
    }

    const handleOnline = () => {
      if (this.provider.isConnected()) {
        void this.syncNow({ interactive: false })
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
    }

    if (this.provider.isConnected()) {
      void this.syncNow({ interactive: false })
    }

    return () => {
      unsubMutations()
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
        this.debounceTimer = null
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
      }
    }
  }
}

export const syncService = new SyncService()
