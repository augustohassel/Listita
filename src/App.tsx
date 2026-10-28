import { useState, type SubmitEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createList, db } from './db'
import { ListDetail } from './features/ListDetail'
import type { RunAction } from './types'

export default function App() {
  const lists = useLiveQuery(() => db.lists.toArray())
  const [selectedId, setSelectedId] = useState<number>()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [fields, setFields] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = lists?.find((list) => list.id === selectedId) ?? lists?.[0]

  const run: RunAction = async (action) => {
    setError('')
    setBusy(true)
    try {
      await action()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cambio. Intentá nuevamente.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await run(async () => {
      const id = await createList(name, category, fields.split(',').map((field) => field.trim()).filter(Boolean))
      setSelectedId(id)
    })) {
      setName('')
      setCategory('')
      setFields('')
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="brand">Listita<span>Listados con personalidad.</span></div>
        <p>Tus descubrimientos, tus notas, tu orden.</p>
      </header>
      <main>
        {error && <p role="alert" className="error">{error}</p>}
        <fieldset disabled={busy} className="workspace">
          <legend className="sr-only">Gestionar listados y rankings</legend>
          <aside className="stack sidebar">
            <h1>Mis listados</h1>
            {lists === undefined && <p role="status">Cargando listados…</p>}
            {lists?.length === 0 && <p>Vinos, bares, comidas… empezá por un listado.</p>}
            <nav aria-label="Listados" className="stack list-nav">
              {lists?.map((list) => (
                <button type="button" className={selected?.id === list.id ? 'active' : 'secondary'} aria-pressed={selected?.id === list.id} key={list.id} onClick={() => setSelectedId(list.id)}>
                  {list.name}
                </button>
              ))}
            </nav>
            <form className="panel stack" onSubmit={submit}>
              <h2>Nuevo listado</h2>
              <label>
                Nombre del listado
                <input required maxLength={120} placeholder="Vinos para volver a probar" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>
                Categoría
                <input maxLength={120} placeholder="Vinos, bares, comidas…" value={category} onChange={(event) => setCategory(event.target.value)} />
              </label>
              <label>
                Atributos del listado
                <input placeholder="Bodega, Cepa, Año" value={fields} onChange={(event) => setFields(event.target.value)} aria-describedby="fields-help" />
              </label>
              <small id="fields-help">Separá con comas hasta 12 atributos. Cada elemento tendrá sus propios valores y notas.</small>
              <button type="submit">Crear listado</button>
            </form>
          </aside>
          {selected ? <ListDetail key={selected.id} list={selected} run={run} /> : (
            <section className="empty panel">
              <h2>Todo empieza con una buena lista.</h2>
              <p>Anotá las particularidades de cada descubrimiento y armá rankings a tu manera.</p>
            </section>
          )}
        </fieldset>
      </main>
      <footer>Guardado en este navegador · Sin cuenta ni servidor · No se sincroniza entre dispositivos</footer>
    </>
  )
}
