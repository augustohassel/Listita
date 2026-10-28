import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Edit3, Package, Plus, Tag, Trash2, Trophy } from 'lucide-react'
import { db, deleteItem, deleteList } from '../db'
import type { List, RunAction } from '../types'
import { ItemForm } from './ItemForm'

interface Props {
  list: List
  lists?: List[]
  onSelectList?: (listId: number) => void
  onOpenRankings?: () => void
  run: RunAction
  onToast?: (message: string) => void
}

export function ListDetail({
  list,
  lists,
  onSelectList,
  onOpenRankings,
  run,
  onToast,
}: Props) {
  const items = useLiveQuery(() => db.items.where({ listId: list.id }).toArray(), [list.id])
  const rankings = useLiveQuery(() => db.rankings.where({ listId: list.id }).toArray(), [list.id])
  const [editingId, setEditingId] = useState<number>()
  const [isCreatingItem, setIsCreatingItem] = useState(false)
  const [confirmDeleteList, setConfirmDeleteList] = useState(false)
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<number>()
  const [expandedNotesIds, setExpandedNotesIds] = useState<Record<number, boolean>>({})

  if (!items || !rankings) {
    return (
      <p role="status" className="text-center text-sm text-ink-muted py-8">
        Cargando listado…
      </p>
    )
  }

  const editingItem = items.find((item) => item.id === editingId)
  const isItemModalOpen = isCreatingItem || editingItem !== undefined

  return (
    <section className="space-y-4" aria-label={list.name}>
      {lists && lists.length > 1 && onSelectList && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {lists.map((entry) => {
            const active = entry.id === list.id
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectList(entry.id)}
                className={`touch-target shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'bg-surface/90 text-ink-muted border border-line/20 hover:border-line/40'
                }`}
              >
                {entry.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-accent">
              {list.category || 'Listado personal'}
            </p>
            <h2 className="text-lg font-extrabold text-ink leading-snug">{list.name}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenRankings && (
              <button
                type="button"
                onClick={onOpenRankings}
                className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/90 hover:bg-surface text-accent border border-line/25 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Rankings ({rankings.length})</span>
              </button>
            )}
            {confirmDeleteList ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteList(false)
                    void run(async () => {
                      await deleteList(list.id)
                      onToast?.('Listado eliminado.')
                    })
                  }}
                  className="touch-target px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold"
                >
                  Confirmar eliminación
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteList(false)}
                  className="touch-target px-2.5 py-1.5 rounded-xl bg-surface text-ink-muted border border-line/20 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteList(true)}
                className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/25 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar listado</span>
              </button>
            )}
          </div>
        </div>

        {list.fields.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {list.fields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-surface/80 text-ink-muted border border-line/20"
              >
                <Tag className="w-2.5 h-2.5 text-accent" />
                {field}
              </span>
            ))}
          </div>
        )}
      </div>

      <section className="space-y-3" aria-labelledby="items-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-accent" />
            <h3 id="items-heading" className="text-sm font-bold text-ink">
              Elementos ({items.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingId(undefined)
              setIsCreatingItem(true)
            }}
            className="touch-target inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-on-accent font-bold text-xs shadow-lg shadow-accent/20 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo elemento</span>
          </button>
        </div>

        {!items.length && (
          <div className="glass-card rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm text-ink-muted">
              Todavía no hay elementos. Agregá el primero con sus particularidades.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingId(undefined)
                setIsCreatingItem(true)
              }}
              className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/15 border border-accent/30 text-accent text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar elemento</span>
            </button>
          </div>
        )}

        {items.map((item) => {
          const isLongNote = item.notes.length > 180
          const isExpanded = Boolean(expandedNotesIds[item.id])
          const visibleNote =
            isLongNote && !isExpanded ? `${item.notes.slice(0, 180)}…` : item.notes

          return (
            <article className="glass-card rounded-2xl p-4 space-y-3" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-base font-bold text-ink leading-snug">{item.name}</h4>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label={`Editar ${item.name}`}
                    onClick={() => {
                      setIsCreatingItem(false)
                      setEditingId(item.id)
                    }}
                    className="touch-target px-2.5 py-1.5 rounded-xl bg-surface/90 hover:bg-surface text-ink border border-line/25 text-xs font-semibold inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-accent" />
                    <span>Editar</span>
                  </button>

                  {confirmDeleteItemId === item.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Confirmar eliminar ${item.name}`}
                        onClick={() => {
                          setConfirmDeleteItemId(undefined)
                          void run(async () => {
                            await deleteItem(item.id)
                            onToast?.('Elemento eliminado.')
                          })
                        }}
                        className="touch-target px-2.5 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteItemId(undefined)}
                        className="touch-target px-2 py-1.5 rounded-xl bg-surface text-ink-muted border border-line/20 text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Eliminar ${item.name}`}
                      onClick={() => setConfirmDeleteItemId(item.id)}
                      className="touch-target px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/25 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>

              {list.fields.some((field) => item.attributes[field]) && (
                <dl className="flex flex-wrap gap-2 m-0">
                  {list.fields
                    .filter((field) => item.attributes[field])
                    .map((field) => (
                      <div
                        key={field}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface/80 border border-line/20 text-xs"
                      >
                        <dt className="text-ink-muted font-medium">{field}:</dt>
                        <dd className="m-0 text-accent font-semibold">
                          {item.attributes[field]}
                        </dd>
                      </div>
                    ))}
                </dl>
              )}

              {item.notes && (
                <div className="space-y-1">
                  <p className="text-xs text-ink-muted whitespace-pre-wrap leading-relaxed bg-surface/50 rounded-xl p-3 border border-line/15">
                    {visibleNote}
                  </p>
                  {isLongNote && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNotesIds((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="text-xs font-semibold text-accent hover:opacity-80"
                    >
                      {isExpanded ? 'Ver menos' : 'Ver nota completa'}
                    </button>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </section>

      {isItemModalOpen && (
        <ItemForm
          key={editingItem?.id ?? 'new'}
          list={list}
          item={editingItem}
          run={run}
          onSaved={onToast}
          onDone={() => {
            setEditingId(undefined)
            setIsCreatingItem(false)
          }}
        />
      )}
    </section>
  )
}
