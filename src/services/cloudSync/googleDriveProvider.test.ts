import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createList, db, saveItem } from '../../db'
import {
  DRIVE_FETCH_TIMEOUT_MS,
  GoogleDriveProvider,
  INTERACTIVE_AUTH_TIMEOUT_MS,
  SILENT_AUTH_TIMEOUT_MS,
} from './googleDriveProvider'
import { SyncService } from './syncService'
import { CloudSyncError, type CloudSyncProvider } from './types'

describe('GoogleDriveProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
    delete (globalThis as { google?: unknown }).google
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reporta NOT_CONFIGURED cuando falta el Client ID y permite override local', async () => {
    const provider = new GoogleDriveProvider('')
    expect(provider.isConfigured()).toBe(false)
    await expect(provider.connect()).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })

    provider.setClientIdOverride('custom-client-id.apps.googleusercontent.com')
    expect(provider.isConfigured()).toBe(true)
    expect(provider.getClientIdOverride()).toBe('custom-client-id.apps.googleusercontent.com')
  })

  it('reporta OFFLINE cuando no hay conexión sin lanzar errores no controlados', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    const provider = new GoogleDriveProvider('client-id')
    await expect(provider.connect()).rejects.toMatchObject({ code: 'OFFLINE' })
  })

  it('reporta AUTH_DENIED cuando el usuario rechaza permisos en GIS', async () => {
    ;(globalThis as { google?: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }: { callback: (res: { error?: string }) => void }) => ({
            requestAccessToken: () => callback({ error: 'access_denied' }),
          }),
        },
      },
    }

    const provider = new GoogleDriveProvider('client-id')
    await expect(provider.connect()).rejects.toMatchObject({ code: 'AUTH_DENIED' })
    expect(provider.isConnected()).toBe(false)
  })

  it('conecta vía GIS, lee y escribe Listita/listita-backup.json y detecta TOKEN_EXPIRED en 401', async () => {
    ;(globalThis as { google?: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback,
          }: {
            callback: (res: { access_token?: string; expires_in?: number }) => void
          }) => ({
            requestAccessToken: () => callback({ access_token: 'tok-123', expires_in: 3600 }),
          }),
          revoke: (_token: string, done?: () => void) => done?.(),
        },
      },
    }

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('application%2Fvnd.google-apps.folder') && !init?.method) {
        return new Response(JSON.stringify({ files: [{ id: 'folder-1' }] }), { status: 200 })
      }
      if (url.includes('listita-backup.json') && !init?.method) {
        return new Response(JSON.stringify({ files: [{ id: 'file-1' }] }), { status: 200 })
      }
      if (url.includes('/files/file-1?alt=media')) {
        return new Response(
          JSON.stringify({
            version: 2,
            exportedAt: '2026-11-12T00:00:00.000Z',
            lists: [{ id: 1, syncId: 'l1', name: 'Remoto', category: '', fields: [], updatedAt: 500 }],
            items: [],
            rankings: [],
            tombstones: [],
          }),
          { status: 200 },
        )
      }
      if (url.includes('/upload/drive/v3/files/file-1')) {
        return new Response(JSON.stringify({ id: 'file-1' }), { status: 200 })
      }
      return new Response('{}', { status: 401 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new GoogleDriveProvider('client-id')
    await provider.connect()
    expect(provider.isConnected()).toBe(true)

    const remote = await provider.readRemoteBackup()
    expect(remote?.lists[0]?.name).toBe('Remoto')

    await provider.writeRemoteBackup({
      lists: remote!.lists,
      items: [],
      rankings: [],
      tombstones: [],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/upload/drive/v3/files/file-1'),
      expect.objectContaining({ method: 'PATCH' }),
    )

    // Simular 401 -> TOKEN_EXPIRED
    fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
    await expect(provider.readRemoteBackup()).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' })
  })

  it('restaura el token vigente desde sessionStorage tras recargar sin exigir reconexión', async () => {
    const requestAccessToken = vi.fn()
    ;(globalThis as { google?: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback,
          }: {
            callback: (res: { access_token?: string; expires_in?: number }) => void
          }) => ({
            requestAccessToken: (opts?: { prompt?: string }) => {
              requestAccessToken(opts)
              callback({ access_token: 'tok-session', expires_in: 3600 })
            },
          }),
        },
      },
    }

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ files: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const provider1 = new GoogleDriveProvider('client-id')
    await provider1.connect()
    expect(requestAccessToken).toHaveBeenCalledTimes(1)

    // Simular recarga de página con nueva instancia del provider y sin llamar a GIS
    delete (globalThis as { google?: unknown }).google
    const provider2 = new GoogleDriveProvider('client-id')
    expect(provider2.isConnected()).toBe(true)
    await expect(provider2.readRemoteBackup()).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('intenta renovación silenciosa (prompt: "") cuando está conectado pero falta el token en sessionStorage', async () => {
    localStorage.setItem('listita.cloudSync.connected', 'true')
    const requestAccessToken = vi.fn()
    ;(globalThis as { google?: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback,
          }: {
            callback: (res: { access_token?: string; expires_in?: number }) => void
          }) => ({
            requestAccessToken: (opts?: { prompt?: string }) => {
              requestAccessToken(opts)
              callback({ access_token: 'tok-silent', expires_in: 3600 })
            },
          }),
        },
      },
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ files: [] }), { status: 200 })),
    )

    const provider = new GoogleDriveProvider('client-id')
    await expect(provider.readRemoteBackup()).resolves.toBeNull()
    expect(requestAccessToken).toHaveBeenCalledWith({ prompt: '' })
  })

  it('sale con TOKEN_EXPIRED si la renovación silenciosa agota el timeout sin callback', async () => {
    vi.useFakeTimers()
    localStorage.setItem('listita.cloudSync.connected', 'true')
    ;(globalThis as { google?: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: () => ({
            requestAccessToken: () => {
              // No invoca callback ni error_callback
            },
          }),
        },
      },
    }

    const provider = new GoogleDriveProvider('client-id')
    const promise = provider.readRemoteBackup()
    const assertion = expect(promise).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' })
    await vi.advanceTimersByTimeAsync(SILENT_AUTH_TIMEOUT_MS + 10)
    await assertion
  })

  it('sale con AUTH_DENIED si el flujo OAuth interactivo agota el timeout sin callback', async () => {
    vi.useFakeTimers()
    ;(globalThis as { google?: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: () => ({
            requestAccessToken: () => {
              // Popup cerrado o bloqueado sin callback
            },
          }),
        },
      },
    }

    const provider = new GoogleDriveProvider('client-id')
    const promise = provider.connect()
    const assertion = expect(promise).rejects.toMatchObject({ code: 'AUTH_DENIED' })
    await vi.advanceTimersByTimeAsync(INTERACTIVE_AUTH_TIMEOUT_MS + 10)
    await assertion
    expect(provider.isConnected()).toBe(false)
  })

  it('aborta driveFetch con NETWORK_ERROR si la red queda colgada más allá del timeout', async () => {
    vi.useFakeTimers()
    ;(globalThis as { google?: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback,
          }: {
            callback: (res: { access_token?: string; expires_in?: number }) => void
          }) => ({
            requestAccessToken: () => callback({ access_token: 'tok-hang', expires_in: 3600 }),
          }),
        },
      },
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'))
            })
          }),
      ),
    )

    const provider = new GoogleDriveProvider('client-id')
    await provider.connect()

    const promise = provider.readRemoteBackup()
    const assertion = expect(promise).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    await vi.advanceTimersByTimeAsync(DRIVE_FETCH_TIMEOUT_MS + 10)
    await assertion
  })
})

describe('SyncService', () => {
  it('sincroniza de forma segura y maneja errores OFFLINE y TOKEN_EXPIRED sin romper operaciones locales', async () => {
    const listId = await createList('Local', '', [])
    await saveItem(listId, { name: 'Item 1', notes: '', attributes: {} })

    let mode: 'ok' | 'offline' | 'expired' = 'ok'
    let writtenCount = 0

    const mockProvider: CloudSyncProvider = {
      isConfigured: () => true,
      isConnected: () => true,
      getClientIdOverride: () => '',
      setClientIdOverride: () => {},
      hasDefaultClientId: () => true,
      getLastSyncedAt: () => null,
      setLastSyncedAt: () => {},
      connect: async () => {},
      disconnect: async () => {},
      readRemoteBackup: async () => {
        if (mode === 'offline') throw new CloudSyncError('OFFLINE', 'Sin red')
        if (mode === 'expired') throw new CloudSyncError('TOKEN_EXPIRED', 'Expirado')
        return {
          lists: [{ id: 1, syncId: 'remote-l1', name: 'Remota', category: '', fields: [], updatedAt: 999 }],
          items: [],
          rankings: [],
          tombstones: [],
        }
      },
      writeRemoteBackup: async () => {
        writtenCount += 1
      },
    }

    const service = new SyncService(mockProvider)
    expect(await service.syncNow()).toBe(true)
    expect(service.getState().status).toBe('synced')
    expect(writtenCount).toBe(1)
    expect(await db.lists.count()).toBe(2)

    mode = 'offline'
    expect(await service.syncNow()).toBe(false)
    expect(service.getState().status).toBe('offline')
    expect(service.getState().pendingChanges).toBe(true)

    mode = 'expired'
    expect(await service.syncNow()).toBe(false)
    expect(service.getState().status).toBe('token_expired')
  })

  it('sale de syncing hacia token_expired al cancelar reconexión si ya estaba conectado y preserva datos locales', async () => {
    const listId = await createList('Mis Vinos', '', [])
    await saveItem(listId, { name: 'Malbec', notes: '', attributes: {} })

    const mockProvider: CloudSyncProvider = {
      isConfigured: () => true,
      isConnected: () => true,
      getClientIdOverride: () => '',
      setClientIdOverride: () => {},
      hasDefaultClientId: () => true,
      getLastSyncedAt: () => null,
      setLastSyncedAt: () => {},
      connect: async () => {
        throw new CloudSyncError('AUTH_DENIED', 'Popup cerrado por el usuario')
      },
      disconnect: async () => {},
      readRemoteBackup: async () => null,
      writeRemoteBackup: async () => {},
    }

    const service = new SyncService(mockProvider)
    expect(await service.connectAndSync()).toBe(false)
    expect(service.getState().status).toBe('token_expired')
    expect(service.getState().pendingChanges).toBe(true)
    expect(await db.lists.count()).toBe(1)
    expect(await db.items.count()).toBe(1)
  })

  it('sale de syncing hacia error al cancelar conexión inicial y serializa llamadas concurrentes', async () => {
    let connectCalls = 0
    const mockProvider: CloudSyncProvider = {
      isConfigured: () => true,
      isConnected: () => false,
      getClientIdOverride: () => '',
      setClientIdOverride: () => {},
      hasDefaultClientId: () => true,
      getLastSyncedAt: () => null,
      setLastSyncedAt: () => {},
      connect: async () => {
        connectCalls += 1
        throw new CloudSyncError('AUTH_DENIED', 'Cancelado')
      },
      disconnect: async () => {},
      readRemoteBackup: async () => null,
      writeRemoteBackup: async () => {},
    }

    const service = new SyncService(mockProvider)
    const [r1, r2] = await Promise.all([service.connectAndSync(), service.connectAndSync()])
    expect(r1).toBe(false)
    expect(r2).toBe(false)
    expect(connectCalls).toBe(1)
    expect(service.getState().status).toBe('error')
  })
})
