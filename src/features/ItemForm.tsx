import { useState, type SubmitEvent } from 'react'
import { Sparkles, X } from 'lucide-react'
import { saveItem } from '../db'
import type { Item, List, RunAction } from '../types'

interface Props {
  list: List
  item?: Item
  run: RunAction
  onDone: () => void
  onSaved?: (message: string) => void
}

export function ItemForm({ list, item, run, onDone, onSaved }: Props) {
  const [name, setName] = useState(item?.name ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const emptyAttributes = () => Object.fromEntries(list.fields.map((field) => [field, '']))
  const [attributes, setAttributes] = useState(item?.attributes ?? emptyAttributes())

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const isEditing = Boolean(item)
    if (await run(() => saveItem(list.id, { name, notes, attributes }, item?.id))) {
      setName('')
      setNotes('')
      setAttributes(emptyAttributes())
      onSaved?.(isEditing ? 'Elemento actualizado.' : 'Elemento agregado al listado.')
      onDone()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={item ? 'Editar elemento' : 'Agregar elemento'}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg glass-panel rounded-t-3xl sm:rounded-3xl border border-slate-700/70 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-1 sm:hidden" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {item ? 'Editar elemento' : 'Agregar elemento'}
              </h3>
              <p className="text-xs text-slate-400">{list.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDone}
            aria-label="Cerrar formulario de elemento"
            className="touch-target p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
          <span>Nombre del elemento</span>
          <input
            required
            maxLength={120}
            placeholder="Ej. Malbec Reserva 2021"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </label>

        {list.fields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {list.fields.map((field) => (
              <label key={field} className="block space-y-1 text-xs font-semibold text-slate-300">
                <span>{field}</span>
                <input
                  value={attributes[field] ?? ''}
                  placeholder={`Valor de ${field}`}
                  onChange={(event) =>
                    setAttributes({ ...attributes, [field]: event.target.value })
                  }
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </label>
            ))}
          </div>
        )}

        <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
          <span>Notas y particularidades</span>
          <textarea
            maxLength={4000}
            rows={3}
            placeholder="Aromas, sensaciones, maridaje o detalles para recordar…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-y"
          />
        </label>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onDone}
            className="touch-target px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-xs font-semibold border border-slate-700/70 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="touch-target px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            {item ? 'Guardar cambios' : 'Agregar elemento'}
          </button>
        </div>
      </form>
    </div>
  )
}
