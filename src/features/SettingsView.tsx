import { useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Database,
  Download,
  HardDrive,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import { clearAllDatabase, db, exportBackup, importBackup, loadDemoData } from '../db'
import type { RunAction, ThemeMode } from '../types'

interface Props {
  run: RunAction
  onToast: (message: string) => void
  onDataLoaded?: (firstListId?: number) => void
  theme?: ThemeMode
  onSelectTheme?: (theme: ThemeMode) => void
}

export function SettingsView({
  run,
  onToast,
  onDataLoaded,
  theme,
  onSelectTheme,
}: Props) {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'
  const listsCount = useLiveQuery(() => db.lists.count(), []) ?? 0
  const itemsCount = useLiveQuery(() => db.items.count(), []) ?? 0
  const rankingsCount = useLiveQuery(() => db.rankings.count(), []) ?? 0
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [internalTheme, setInternalTheme] = useState<ThemeMode>(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('listita_theme')
      if (stored === 'light' || stored === 'dark') return stored
    }
    return 'dark'
  })

  const currentTheme = theme ?? internalTheme

  function handleThemeChange(newTheme: ThemeMode) {
    if (onSelectTheme) {
      onSelectTheme(newTheme)
    } else {
      setInternalTheme(newTheme)
      try {
        localStorage.setItem('listita_theme', newTheme)
      } catch {
        // Storage unavailable
      }
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }
    onToast(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado.`)
  }

  async function handleExport() {
    await run(async () => {
      const json = await exportBackup()
      if (typeof URL.createObjectURL === 'function') {
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `listita-backup-${new Date().toISOString().split('T')[0]}.json`
        anchor.click()
        URL.revokeObjectURL(url)
      }
      onToast('Copia de seguridad exportada en JSON.')
    })
  }

  async function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    event.target.value = ''
    await run(async () => {
      const result = await importBackup(text)
      onToast(
        `Backup restaurado: ${result.lists.length} listados, ${result.items.length} elementos y ${result.rankings.length} rankings.`,
      )
      onDataLoaded?.(result.lists[0]?.id)
    })
  }

  async function handleLoadDemo() {
    await run(async () => {
      const firstId = await loadDemoData()
      onToast('Datos de demostración cargados.')
      onDataLoaded?.(firstId)
    })
  }

  async function handleClearAll() {
    setConfirmClear(false)
    await run(async () => {
      await clearAllDatabase()
      onToast('Base de datos local vaciada.')
      onDataLoaded?.(undefined)
    })
  }

  return (
    <section className="space-y-4" aria-label="Ajustes y datos locales">
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">Almacenamiento Local</h2>
            <p className="text-xs text-ink-muted">
              Tus listados viven únicamente en este navegador sobre IndexedDB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl bg-surface/80 border border-line/20 p-3">
            <span className="block text-lg font-extrabold text-accent">{listsCount}</span>
            <span className="text-[11px] text-ink-muted font-medium">Listados</span>
          </div>
          <div className="rounded-xl bg-surface/80 border border-line/20 p-3">
            <span className="block text-lg font-extrabold text-accent">{itemsCount}</span>
            <span className="text-[11px] text-ink-muted font-medium">Elementos</span>
          </div>
          <div className="rounded-xl bg-surface/80 border border-line/20 p-3">
            <span className="block text-lg font-extrabold text-accent">{rankingsCount}</span>
            <span className="text-[11px] text-ink-muted font-medium">Rankings</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Zero-Backend: sin cuentas, sin servidores externos ni telemetría.</span>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-ink">Apariencia</h3>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          Elegí si preferís un tema claro u oscuro para la interfaz.
        </p>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface/80 border border-line/30">
          {(
            [
              { id: 'light', label: 'Claro', icon: Sun },
              { id: 'dark', label: 'Oscuro', icon: Moon },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon
            const active = currentTheme === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThemeChange(opt.id)}
                className={`touch-target flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-ink">Copias de Seguridad (JSON)</h3>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          Descargá un respaldo completo o restaurá un archivo JSON previamente exportado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="touch-target flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface/90 hover:bg-surface text-ink border border-line/25 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Download className="w-4 h-4 text-accent" />
            <span>Exportar backup JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="touch-target flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface/90 hover:bg-surface text-ink border border-line/25 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Upload className="w-4 h-4 text-accent" />
            <span>Importar backup JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Importar archivo de backup JSON"
            onChange={(event) => void handleImportChange(event)}
            className="sr-only"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-ink">Dataset de Demostración</h3>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          Agregá colecciones de ejemplo (Vinos tintos y Cafés de especialidad) con atributos, notas
          y rankings armados para explorar la interfaz.
        </p>
        <button
          type="button"
          onClick={() => void handleLoadDemo()}
          className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <Sparkles className="w-4 h-4" />
          <span>Cargar datos de demostración</span>
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3 border border-red-500/20">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          <h3 className="text-sm font-bold text-red-700 dark:text-red-300">Zona de Peligro</h3>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          Elimina de forma permanente todos los listados, elementos y rankings almacenados en este
          navegador.
        </p>

        {confirmClear ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleClearAll()}
              className="touch-target flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Confirmar borrado total
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="touch-target px-4 py-2.5 rounded-xl bg-surface text-ink-muted border border-line/20 text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/25 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <Trash2 className="w-4 h-4" />
            <span>Borrar todos los datos</span>
          </button>
        )}
      </div>

      <div className="pt-2 pb-6 text-center">
        <p className="text-[11px] font-mono text-ink-muted/70">
          Listita <span className="text-ink-muted font-semibold">v{version}</span> • PWA Local
        </p>
      </div>
    </section>
  )
}

