import { useState, type SubmitEvent } from 'react'
import { createRanking, db, setRankingItems } from '../db'
import type { Item, Ranking, RunAction } from '../types'

interface Props {
  listId: number
  items: Item[]
  rankings: Ranking[]
  run: RunAction
}

export function Rankings({ listId, items, rankings, run }: Props) {
  const [name, setName] = useState('')

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await run(() => createRanking(listId, name))) setName('')
  }

  function move(ranking: Ranking, index: number, offset: number) {
    const ids = [...ranking.itemIds]
    const movedId = ids[index]
    ids[index] = ids[index + offset]
    ids[index + offset] = movedId
    void run(() => setRankingItems(ranking.id, ids))
  }

  return (
    <section className="stack" aria-labelledby="rankings-heading">
      <h3 id="rankings-heading">Rankings</h3>
      <p className="muted">Creá distintos rankings del listado. El orden se guarda al subir o bajar un elemento.</p>
      <form className="inline-form" onSubmit={submit}>
        <label>
          Nombre del ranking
          <input required maxLength={120} placeholder="Mis favoritos" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" disabled={!items.length}>Crear ranking</button>
      </form>
      {!items.length && <p>Agregá un elemento para empezar a armar rankings.</p>}
      {items.length > 0 && !rankings.length && <p>Todavía no hay rankings en este listado.</p>}
      {rankings.map((ranking) => (
        <article className="panel stack" key={ranking.id} aria-label={ranking.name}>
          <div className="section-heading">
            <h4>{ranking.name}</h4>
            <button type="button" className="danger secondary" onClick={() => {
              if (window.confirm(`¿Eliminar el ranking "${ranking.name}"?`)) {
                void run(() => db.rankings.delete(ranking.id))
              }
            }}>Eliminar ranking</button>
          </div>
          {ranking.itemIds.length === 0 && <p>Este ranking está vacío. Agregá elementos desde el selector.</p>}
          <ol className="ranking">
            {ranking.itemIds.map((id, index) => {
              const item = items.find((entry) => entry.id === id)
              if (!item) return null
              return (
                <li key={id}>
                  <span>{item.name}</span>
                  <div className="actions">
                    <button type="button" className="secondary" aria-label={`Subir ${item.name}`} disabled={index === 0} onClick={() => move(ranking, index, -1)}>↑</button>
                    <button type="button" className="secondary" aria-label={`Bajar ${item.name}`} disabled={index === ranking.itemIds.length - 1} onClick={() => move(ranking, index, 1)}>↓</button>
                    <button type="button" className="secondary" aria-label={`Quitar ${item.name} del ranking`} onClick={() => void run(() => setRankingItems(ranking.id, ranking.itemIds.filter((itemId) => itemId !== id)))}>Quitar</button>
                  </div>
                </li>
              )
            })}
          </ol>
          {items.some((item) => !ranking.itemIds.includes(item.id)) && (
            <label>
              Agregar al ranking
              <select value="" onChange={(event) => {
                const itemId = Number(event.target.value)
                if (itemId) void run(() => setRankingItems(ranking.id, [...ranking.itemIds, itemId]))
              }}>
                <option value="">Elegí un elemento…</option>
                {items.filter((item) => !ranking.itemIds.includes(item.id)).map((item) => (
                  <option value={item.id} key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          )}
        </article>
      ))}
    </section>
  )
}
