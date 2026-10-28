import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteItem, deleteList } from '../db'
import type { List, RunAction } from '../types'
import { ItemForm } from './ItemForm'
import { Rankings } from './Rankings'

export function ListDetail({ list, run }: { list: List; run: RunAction }) {
  const items = useLiveQuery(() => db.items.where({ listId: list.id }).toArray(), [list.id])
  const rankings = useLiveQuery(() => db.rankings.where({ listId: list.id }).toArray(), [list.id])
  const [editingId, setEditingId] = useState<number>()

  if (!items || !rankings) return <p role="status">Cargando listado…</p>
  const editingItem = items.find((item) => item.id === editingId)

  return (
    <section className="stack detail" aria-label={list.name}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{list.category || 'Listado personal'}</p>
          <h2>{list.name}</h2>
        </div>
        <button type="button" className="danger secondary" onClick={() => {
          if (window.confirm(`¿Eliminar "${list.name}", sus elementos y sus rankings?`)) {
            void run(() => deleteList(list.id))
          }
        }}>Eliminar listado</button>
      </div>
      <ItemForm key={editingItem?.id ?? 'new'} list={list} item={editingItem} run={run} onDone={() => setEditingId(undefined)} />
      <section className="stack" aria-labelledby="items-heading">
        <h3 id="items-heading">Elementos ({items.length})</h3>
        {!items.length && <p>Todavía no hay elementos. Agregá el primero con sus particularidades.</p>}
        {items.map((item) => (
          <article className="panel stack" key={item.id}>
            <div className="section-heading">
              <h4>{item.name}</h4>
              <div className="actions">
                <button type="button" className="secondary" aria-label={`Editar ${item.name}`} onClick={() => setEditingId(item.id)}>Editar</button>
                <button type="button" className="danger secondary" aria-label={`Eliminar ${item.name}`} onClick={() => {
                  if (window.confirm(`¿Eliminar "${item.name}" y quitarlo de sus rankings?`)) {
                    void run(() => deleteItem(item.id))
                  }
                }}>Eliminar</button>
              </div>
            </div>
            <dl className="attributes">
              {list.fields.filter((field) => item.attributes[field]).map((field) => (
                <div key={field}><dt>{field}</dt><dd>{item.attributes[field]}</dd></div>
              ))}
            </dl>
            {item.notes && <p className="notes">{item.notes}</p>}
          </article>
        ))}
      </section>
      <Rankings listId={list.id} items={items} rankings={rankings} run={run} />
    </section>
  )
}
