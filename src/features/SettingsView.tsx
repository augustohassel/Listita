import { useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Database,
  Download,
  HardDrive,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { clearAllDatabase, db, exportBackup, importBackup, loadDemoData } from '../db'
import type { RunAction } from '../types'

interface Props {
  run: RunAction
  onToast: (message: string) => void
  onDataLoaded?: (firstListId?: number) => void
}

export function SettingsView({ run, onToast, onDataLoaded }: Props) {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'
  const listsCount = useLiveQuery(() => db.lists.count(), []) ?? 0
  const itemsCount = useLiveQuery(() => db.items.count(), []) ?? 0
  const rankingsCount = useLiveQuery(() => db.rankings.count(), []) ?? 0
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Almacenamiento Local</h2>
            <p className="text-xs text-slate-400">
              Tus listados viven únicamente en este navegador sobre IndexedDB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
            <span className="block text-lg font-extrabold text-amber-400">{listsCount}</span>
            <span className="text-[11px] text-slate-400 font-medium">Listados</span>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
            <span className="block text-lg font-extrabold text-amber-400">{itemsCount}</span>
            <span className="text-[11px] text-slate-400 font-medium">Elementos</span>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
            <span className="block text-lg font-extrabold text-amber-400">{rankingsCount}</span>
            <span className="text-[11px] text-slate-400 font-medium">Rankings</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Zero-Backend: sin cuentas, sin servidores externos ni telemetría.</span>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">Copias de Seguridad (JSON)</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Descargá un respaldo completo o restaurá un archivo JSON previamente exportado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="touch-target flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700/80 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exportar backup JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="touch-target flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700/80 text-xs font-semibold transition-colors"
          >
            <Upload className="w-4 h-4 text-amber-400" />
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
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">Dataset de Demostración</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Agregá colecciones de ejemplo (Vinos tintos y Cafés de especialidad) con atributos, notas
          y rankings armados para explorar la interfaz.
        </p>
        <button
          type="button"
          onClick={() => void handleLoadDemo()}
          className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>Cargar datos de demostración</span>
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3 border border-rose-500/20">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-rose-300">Zona de Peligro</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Elimina de forma permanente todos los listados, elementos y rankings almacenados en este
          navegador.
        </p>

        {confirmClear ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleClearAll()}
              className="touch-target flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold"
            >
              Confirmar borrado total
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="touch-target px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-bold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Borrar todos los datos</span>
          </button>
        )}
      </div>

      <div className="pt-2 pb-6 text-center">
        <p className="text-[11px] font-mono text-slate-500">
          Listita <span className="text-slate-400 font-semibold">v{version}</span> • PWA Local
        </p>
      </div>
    </section>
  )
}

