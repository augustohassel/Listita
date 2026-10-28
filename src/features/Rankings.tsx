import { useState, type SubmitEvent } from 'react'
import { ArrowDown, ArrowUp, Award, Plus, Trash2, Trophy } from 'lucide-react'
import { ModalSheet } from '../components/layout/ModalSheet'
import { createRanking, deleteRanking, setRankingItems } from '../db'
import type { Item, List, Ranking, RunAction } from '../types'

interface Props {
  listId: number
  listName?: string
  lists?: List[]
  onSelectList?: (listId: number) => void
  items: Item[]
  rankings: Ranking[]
  run: RunAction
  onToast?: (message: string) => void
}

function getPodiumStyle(index: number) {
  if (index === 0) {
    return {
      card: 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900/70 border-amber-400/50 shadow-md shadow-amber-500/10',
      badge: 'bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 ring-2 ring-amber-300/40',
      label: '#1 Oro',
    }
  }
  if (index === 1) {
    return {
      card: 'bg-gradient-to-r from-slate-300/12 via-slate-400/5 to-slate-900/70 border-slate-400/40',
      badge: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 ring-2 ring-slate-300/30',
      label: '#2 Plata',
    }
  }
  if (index === 2) {
    return {
      card: 'bg-gradient-to-r from-orange-500/15 via-orange-600/5 to-slate-900/70 border-orange-500/40',
      badge: 'bg-gradient-to-br from-orange-400 to-amber-700 text-white ring-2 ring-orange-400/30',
      label: '#3 Bronce',
    }
  }
  return {
    card: 'glass-card border-slate-800/80',
    badge: 'bg-slate-800 text-slate-300 border border-slate-700',
    label: `#${index + 1}`,
  }
}

export function Rankings({
  listId,
  listName,
  lists,
  onSelectList,
  items,
  rankings,
  run,
  onToast,
}: Props) {
  const [name, setName] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRankingId, setSelectedRankingId] = useState<number>()
  const [confirmDeleteId, setConfirmDeleteId] = useState<number>()

  const activeRanking =
    rankings.find((r) => r.id === selectedRankingId) ?? rankings[0]

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    let createdId: number | undefined
    if (
      await run(async () => {
        createdId = await createRanking(listId, name)
      })
    ) {
      setName('')
      setIsModalOpen(false)
      if (createdId !== undefined) setSelectedRankingId(createdId)
      onToast?.('Ranking creado.')
    }
  }

  function move(ranking: Ranking, index: number, offset: number) {
    const ids = [...ranking.itemIds]
    const movedId = ids[index]
    ids[index] = ids[index + offset]
    ids[index + offset] = movedId
    void run(() => setRankingItems(ranking.id, ids))
  }

  return (
    <section className="space-y-4" aria-labelledby="rankings-heading">
      {lists && lists.length > 1 && onSelectList && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {lists.map((entry) => {
            const active = entry.id === listId
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectList(entry.id)}
                className={`touch-target shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {entry.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 id="rankings-heading" className="text-base font-bold text-slate-100 truncate">
              Rankings {listName ? `· ${listName}` : ''}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ordená manualmente tus favoritos. El podio destaca tu top 3.
          </p>
        </div>

        <button
          type="button"
          disabled={!items.length}
          onClick={() => setIsModalOpen(true)}
          className="touch-target shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo ranking</span>
        </button>
      </div>

      {!items.length && (
        <div className="glass-card rounded-2xl p-6 text-center space-y-1">
          <p className="text-sm font-medium text-slate-200">
            Agregá un elemento para empezar a armar rankings.
          </p>
          <p className="text-xs text-slate-400">
            Cada ranking comienza con los elementos existentes del listado.
          </p>
        </div>
      )}

      {items.length > 0 && !rankings.length && (
        <div className="glass-card rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-slate-300">Todavía no hay rankings en este listado.</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Crear ranking</span>
          </button>
        </div>
      )}

      {rankings.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Selector de rankings">
          {rankings.map((r) => {
            const isSelected = activeRanking?.id === r.id
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedRankingId(r.id)}
                className={`touch-target shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{r.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {activeRanking && (
        <article
          key={activeRanking.id}
          aria-label={activeRanking.name}
          className="glass-card rounded-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400">
                Ranking manual
              </span>
              <h4 className="text-base font-bold text-slate-100">{activeRanking.name}</h4>
            </div>

            {confirmDeleteId === activeRanking.id ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = activeRanking.id
                    setConfirmDeleteId(undefined)
                    void run(async () => {
                      await deleteRanking(idToDelete)
                      onToast?.('Ranking eliminado.')
                    })
                  }}
                  className="touch-target px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold"
                >
                  Confirmar eliminación
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(undefined)}
                  className="touch-target px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(activeRanking.id)}
                className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar ranking</span>
              </button>
            )}
          </div>

          {activeRanking.itemIds.length === 0 && (
            <p className="text-xs text-slate-400 py-3 text-center">
              Este ranking está vacío. Agregá elementos desde el selector.
            </p>
          )}

          <ol className="space-y-2.5 list-none m-0 p-0">
            {activeRanking.itemIds.map((id, index) => {
              const item = items.find((entry) => entry.id === id)
              if (!item) return null
              const podium = getPodiumStyle(index)

              return (
                <li
                  key={id}
                  className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 transition-all ${podium.card}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      title={podium.label}
                      className={`w-8 h-8 shrink-0 rounded-xl font-extrabold text-xs flex items-center justify-center ${podium.badge}`}
                    >
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-100 truncate">
                          {item.name}
                        </span>
                        {index < 3 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/70 text-amber-300 border border-amber-500/30">
                            {podium.label}
                          </span>
                        )}
                      </div>
                      {Object.entries(item.attributes).some(([, val]) => Boolean(val)) && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.entries(item.attributes)
                            .filter(([, val]) => Boolean(val))
                            .slice(0, 3)
                            .map(([key, val]) => (
                              <span
                                key={key}
                                className="text-[11px] text-slate-300 bg-slate-900/70 px-2 py-0.5 rounded-md border border-slate-800"
                              >
                                {key}: {val}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Subir ${item.name}`}
                      disabled={index === 0}
                      onClick={() => move(activeRanking, index, -1)}
                      className="touch-target p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/70 disabled:opacity-35 flex items-center justify-center"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Bajar ${item.name}`}
                      disabled={index === activeRanking.itemIds.length - 1}
                      onClick={() => move(activeRanking, index, 1)}
                      className="touch-target p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/70 disabled:opacity-35 flex items-center justify-center"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar ${item.name} del ranking`}
                      onClick={() =>
                        void run(() =>
                          setRankingItems(
                            activeRanking.id,
                            activeRanking.itemIds.filter((itemId) => itemId !== id),
                          ),
                        )
                      }
                      className="touch-target px-2.5 py-2 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/70 text-xs font-medium"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>

          {items.some((item) => !activeRanking.itemIds.includes(item.id)) && (
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
                <span>Agregar al ranking</span>
                <select
                  value=""
                  onChange={(event) => {
                    const itemId = Number(event.target.value)
                    if (itemId) {
                      void run(() =>
                        setRankingItems(activeRanking.id, [...activeRanking.itemIds, itemId]),
                      )
                    }
                  }}
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Elegí un elemento…</option>
                  {items
                    .filter((item) => !activeRanking.itemIds.includes(item.id))
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}
        </article>
      )}

      {isModalOpen && (
        <ModalSheet
          title="Nuevo ranking"
          subtitle={`Incluirá los ${items.length} elementos actuales para que los ordenes.`}
          ariaLabel="Crear nuevo ranking"
          icon={Trophy}
          closeLabel="Cerrar modal de ranking"
          maxWidthClass="max-w-md"
          onClose={() => setIsModalOpen(false)}
          onSubmit={submit}
        >
          <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
            <span>Nombre del ranking</span>
            <input
              required
              maxLength={120}
              placeholder="Mis favoritos, Precio/calidad…"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="touch-target px-4 py-2.5 rounded-xl bg-slate-800/90 text-slate-200 text-xs font-semibold border border-slate-700/70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!items.length}
              className="touch-target px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-40"
            >
              Crear ranking
            </button>
          </div>
        </ModalSheet>
      )}
    </section>
  )
}
