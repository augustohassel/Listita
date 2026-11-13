import type { BackupData } from '../../types'
import type { SyncSnapshot } from '../../utils/syncEngine'
import { CloudSyncError, type CloudSyncProvider } from './types'

export const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const DRIVE_FOLDER_NAME = 'Listita'
export const DRIVE_BACKUP_FILENAME = 'listita-backup.json'

const STORAGE_KEY_CONNECTED = 'listita.cloudSync.connected'
const STORAGE_KEY_LAST_SYNC = 'listita.cloudSync.lastSyncedAt'
const STORAGE_KEY_CLIENT_ID_OVERRIDE = 'listita.cloudSync.clientIdOverride'
const SESSION_KEY_TOKEN = 'listita.cloudSync.accessToken'
const SESSION_KEY_EXPIRES_AT = 'listita.cloudSync.tokenExpiresAt'
const TOKEN_EXPIRY_SKEW_MS = 30_000

export const GIS_SCRIPT_TIMEOUT_MS = 8_000
export const SILENT_AUTH_TIMEOUT_MS = 8_000
export const INTERACTIVE_AUTH_TIMEOUT_MS = 60_000
export const DRIVE_FETCH_TIMEOUT_MS = 15_000

interface GisTokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

interface GoogleGlobal {
  accounts?: {
    oauth2?: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (response: GisTokenResponse) => void
        error_callback?: (error: { type?: string; message?: string }) => void
      }) => GisTokenClient
      revoke?: (token: string, done?: () => void) => void
    }
  }
}

function getGoogleGlobal(): GoogleGlobal | undefined {
  return (globalThis as { google?: GoogleGlobal }).google
}

function readStorage(key: string): string {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) ?? '' : ''
  } catch {
    return ''
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (value === null || value === '') {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // Ignorar errores de almacenamiento (modo privado / cuota)
  }
}

function readSessionStorage(key: string): string {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) ?? '' : ''
  } catch {
    return ''
  }
}

function writeSessionStorage(key: string, value: string | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    if (value === null || value === '') {
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
    }
  } catch {
    // Ignorar errores de almacenamiento (modo privado / cuota)
  }
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

let gisLoadPromise: Promise<void> | null = null

export function loadGisScript(): Promise<void> {
  if (getGoogleGlobal()?.accounts?.oauth2) {
    return Promise.resolve()
  }
  if (typeof document === 'undefined') {
    return Promise.reject(
      new CloudSyncError('NETWORK_ERROR', 'El navegador no está disponible para cargar Google Identity Services.'),
    )
  }
  if (gisLoadPromise) return gisLoadPromise

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      gisLoadPromise = null
      reject(
        new CloudSyncError(
          'NETWORK_ERROR',
          'Se agotó el tiempo de espera al cargar Google Identity Services.',
        ),
      )
    }, GIS_SCRIPT_TIMEOUT_MS)

    const finishResolve = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve()
    }

    const finishReject = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      gisLoadPromise = null
      reject(new CloudSyncError('OFFLINE', 'No se pudo cargar Google Identity Services. Verificá tu conexión.'))
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_URL}"]`)
    if (existing) {
      existing.addEventListener('load', finishResolve, { once: true })
      existing.addEventListener('error', finishReject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = finishResolve
    script.onerror = finishReject
    document.head.appendChild(script)
  })

  return gisLoadPromise
}

export class GoogleDriveProvider implements CloudSyncProvider {
  private accessToken: string | null = null
  private tokenExpiresAt = 0
  private silentRefreshPromise: Promise<string> | null = null
  private readonly defaultClientId: string

  constructor(defaultClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()) {
    this.defaultClientId = defaultClientId
    this.restoreTokenFromSession()
  }

  private saveToken(token: string, expiresAt: number): void {
    this.accessToken = token
    this.tokenExpiresAt = expiresAt
    writeSessionStorage(SESSION_KEY_TOKEN, token)
    writeSessionStorage(SESSION_KEY_EXPIRES_AT, String(expiresAt))
  }

  private clearToken(): void {
    this.accessToken = null
    this.tokenExpiresAt = 0
    writeSessionStorage(SESSION_KEY_TOKEN, null)
    writeSessionStorage(SESSION_KEY_EXPIRES_AT, null)
  }

  private restoreTokenFromSession(): void {
    const token = readSessionStorage(SESSION_KEY_TOKEN)
    const rawExpiresAt = readSessionStorage(SESSION_KEY_EXPIRES_AT)
    const expiresAt = Number(rawExpiresAt)
    if (token && Number.isFinite(expiresAt) && Date.now() < expiresAt) {
      this.accessToken = token
      this.tokenExpiresAt = expiresAt
    } else if (token || rawExpiresAt) {
      this.clearToken()
    }
  }

  hasDefaultClientId(): boolean {
    return this.defaultClientId.length > 0
  }

  getClientIdOverride(): string {
    return readStorage(STORAGE_KEY_CLIENT_ID_OVERRIDE).trim()
  }

  setClientIdOverride(clientId: string): void {
    writeStorage(STORAGE_KEY_CLIENT_ID_OVERRIDE, clientId.trim() || null)
    this.clearToken()
  }

  private resolveClientId(): string {
    return this.getClientIdOverride() || this.defaultClientId
  }

  isConfigured(): boolean {
    return this.resolveClientId().length > 0
  }

  isConnected(): boolean {
    return readStorage(STORAGE_KEY_CONNECTED) === 'true'
  }

  getLastSyncedAt(): number | null {
    const raw = readStorage(STORAGE_KEY_LAST_SYNC)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  setLastSyncedAt(timestamp: number | null): void {
    writeStorage(STORAGE_KEY_LAST_SYNC, timestamp !== null ? String(timestamp) : null)
  }

  private assertConfiguredAndOnline(): string {
    const clientId = this.resolveClientId()
    if (!clientId) {
      throw new CloudSyncError(
        'NOT_CONFIGURED',
        'Falta configurar el Client ID de Google OAuth (VITE_GOOGLE_CLIENT_ID o en Ajustes).',
      )
    }
    if (!isOnline()) {
      throw new CloudSyncError('OFFLINE', 'Sin conexión a internet. Tus cambios siguen guardados localmente.')
    }
    return clientId
  }

  private async requestAccessToken(prompt: '' | 'consent'): Promise<string> {
    const clientId = this.assertConfiguredAndOnline()
    await loadGisScript()

    const oauth2 = getGoogleGlobal()?.accounts?.oauth2
    if (!oauth2) {
      throw new CloudSyncError('NETWORK_ERROR', 'Google Identity Services no se inicializó correctamente.')
    }

    const isSilent = prompt === ''
    const timeoutMs = isSilent ? SILENT_AUTH_TIMEOUT_MS : INTERACTIVE_AUTH_TIMEOUT_MS

    return new Promise<string>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        reject(
          isSilent
            ? new CloudSyncError(
                'TOKEN_EXPIRED',
                'Tu sesión de Google Drive expiró. Tocá «Reconectar» para volver a sincronizar.',
              )
            : new CloudSyncError(
                'AUTH_DENIED',
                'Se agotó el tiempo de espera o se cerró la ventana de autenticación con Google.',
              ),
        )
      }, timeoutMs)

      const finishResolve = (token: string) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(token)
      }

      const finishReject = (err: CloudSyncError) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err)
      }

      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error || !response.access_token) {
            finishReject(
              isSilent
                ? new CloudSyncError(
                    'TOKEN_EXPIRED',
                    'Tu sesión de Google Drive expiró. Tocá «Reconectar» para volver a sincronizar.',
                  )
                : new CloudSyncError(
                    'AUTH_DENIED',
                    response.error_description || 'No se autorizó el acceso a Google Drive.',
                  ),
            )
            return
          }
          const expiresInSec = typeof response.expires_in === 'number' ? response.expires_in : 3600
          const expiresAt = Date.now() + expiresInSec * 1000 - TOKEN_EXPIRY_SKEW_MS
          this.saveToken(response.access_token, expiresAt)
          finishResolve(response.access_token)
        },
        error_callback: (err) => {
          finishReject(
            isSilent
              ? new CloudSyncError(
                  'TOKEN_EXPIRED',
                  'Tu sesión de Google Drive expiró. Tocá «Reconectar» para volver a sincronizar.',
                )
              : new CloudSyncError(
                  'AUTH_DENIED',
                  err.message || 'Se canceló o rechazó la autenticación con Google.',
                ),
          )
        },
      })

      try {
        client.requestAccessToken({ prompt })
      } catch (err) {
        finishReject(
          isSilent
            ? new CloudSyncError(
                'TOKEN_EXPIRED',
                'Tu sesión de Google Drive expiró. Tocá «Reconectar» para volver a sincronizar.',
              )
            : new CloudSyncError(
                'AUTH_DENIED',
                err instanceof Error ? err.message : 'No se pudo iniciar la autenticación con Google.',
              ),
        )
      }
    })
  }

  private silentRefresh(): Promise<string> {
    if (!this.silentRefreshPromise) {
      this.silentRefreshPromise = this.requestAccessToken('').finally(() => {
        this.silentRefreshPromise = null
      })
    }
    return this.silentRefreshPromise
  }

  private async ensureValidToken(): Promise<string> {
    this.assertConfiguredAndOnline()
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    this.clearToken()
    if (!this.isConnected()) {
      throw new CloudSyncError(
        'TOKEN_EXPIRED',
        'Tu sesión de Google Drive expiró. Tocá «Reconectar» para volver a sincronizar.',
      )
    }

    return this.silentRefresh()
  }

  async connect(): Promise<void> {
    await this.requestAccessToken('consent')
    writeStorage(STORAGE_KEY_CONNECTED, 'true')
  }

  async disconnect(): Promise<void> {
    const token = this.accessToken
    this.clearToken()
    writeStorage(STORAGE_KEY_CONNECTED, null)

    const revoke = getGoogleGlobal()?.accounts?.oauth2?.revoke
    if (token && revoke) {
      await new Promise<void>((resolve) => {
        try {
          revoke(token, () => resolve())
        } catch {
          resolve()
        }
      })
    }
  }

  private async driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.ensureValidToken()
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)

    const controller = new AbortController()
    const externalSignal = init.signal
    const onExternalAbort = () => controller.abort()
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort()
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true })
      }
    }
    const timer = setTimeout(() => controller.abort(), DRIVE_FETCH_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(url, { ...init, headers, signal: controller.signal })
    } catch {
      throw new CloudSyncError(
        isOnline() ? 'NETWORK_ERROR' : 'OFFLINE',
        isOnline()
          ? 'Error de red o tiempo de espera agotado al comunicarse con Google Drive.'
          : 'Sin conexión a internet. Tus cambios siguen guardados localmente.',
      )
    } finally {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', onExternalAbort)
    }

    if (response.status === 401) {
      this.clearToken()
      throw new CloudSyncError(
        'TOKEN_EXPIRED',
        'Tu sesión de Google Drive expiró. Tocá «Reconectar» para volver a sincronizar.',
      )
    }

    if (!response.ok) {
      throw new CloudSyncError(
        'NETWORK_ERROR',
        `Google Drive respondió con error (${response.status}).`,
      )
    }

    return response
  }

  private async findFolderId(): Promise<string | null> {
    const q = `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`
    const res = await this.driveFetch(url)
    const data = (await res.json()) as { files?: Array<{ id: string }> }
    return data.files?.[0]?.id ?? null
  }

  private async findOrCreateFolderId(): Promise<string> {
    const existing = await this.findFolderId()
    if (existing) return existing

    const res = await this.driveFetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    })
    const created = (await res.json()) as { id?: string }
    if (!created.id) {
      throw new CloudSyncError('NETWORK_ERROR', 'No se pudo crear la carpeta Listita en Google Drive.')
    }
    return created.id
  }

  private async findBackupFileId(folderId: string): Promise<string | null> {
    const q = `name = '${DRIVE_BACKUP_FILENAME}' and '${folderId}' in parents and trashed = false`
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`
    const res = await this.driveFetch(url)
    const data = (await res.json()) as { files?: Array<{ id: string }> }
    return data.files?.[0]?.id ?? null
  }

  async readRemoteBackup(): Promise<SyncSnapshot | null> {
    const folderId = await this.findFolderId()
    if (!folderId) return null
    const fileId = await this.findBackupFileId(folderId)
    if (!fileId) return null

    const res = await this.driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    )

    let parsed: unknown
    try {
      parsed = await res.json()
    } catch {
      throw new CloudSyncError('INVALID_REMOTE_DATA', 'El archivo de respaldo en Google Drive está corrupto.')
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as BackupData).lists) ||
      !Array.isArray((parsed as BackupData).items) ||
      !Array.isArray((parsed as BackupData).rankings)
    ) {
      throw new CloudSyncError(
        'INVALID_REMOTE_DATA',
        'El respaldo remoto no tiene el formato esperado de Listita.',
      )
    }

    const backup = parsed as BackupData
    return {
      lists: backup.lists,
      items: backup.items,
      rankings: backup.rankings,
      tombstones: Array.isArray(backup.tombstones) ? backup.tombstones : [],
    }
  }

  async writeRemoteBackup(snapshot: SyncSnapshot): Promise<void> {
    const folderId = await this.findOrCreateFolderId()
    const existingFileId = await this.findBackupFileId(folderId)

    const payload: BackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      lists: snapshot.lists,
      items: snapshot.items,
      rankings: snapshot.rankings,
      tombstones: snapshot.tombstones,
    }
    const content = JSON.stringify(payload, null, 2)

    const boundary = `listita_boundary_${Date.now()}`
    const metadata = existingFileId
      ? { name: DRIVE_BACKUP_FILENAME, mimeType: 'application/json' }
      : { name: DRIVE_BACKUP_FILENAME, parents: [folderId], mimeType: 'application/json' }

    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

    await this.driveFetch(url, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    })
  }
}
