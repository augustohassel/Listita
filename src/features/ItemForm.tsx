import { useState, type SubmitEvent } from 'react'
import { saveItem } from '../db'
import type { Item, List, RunAction } from '../types'

interface Props {
  list: List
  item?: Item
  run: RunAction
  onDone: () => void
}

export function ItemForm({ list, item, run, onDone }: Props) {
  const [name, setName] = useState(item?.name ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const emptyAttributes = () => Object.fromEntries(list.fields.map((field) => [field, '']))
  const [attributes, setAttributes] = useState(item?.attributes ?? emptyAttributes())

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await run(() => saveItem(list.id, { name, notes, attributes }, item?.id))) {
      setName('')
      setNotes('')
      setAttributes(emptyAttributes())
      onDone()
    }
  }

  return (
    <form className="panel stack" onSubmit={submit}>
      <h3>{item ? 'Editar elemento' : 'Agregar elemento'}</h3>
      <label>
        Nombre del elemento
        <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <div className="attribute-fields">
        {list.fields.map((field) => (
          <label key={field}>
            {field}
            <input
              value={attributes[field] ?? ''}
              onChange={(event) => setAttributes({ ...attributes, [field]: event.target.value })}
            />
          </label>
        ))}
      </div>
      <label>
        Notas y particularidades
        <textarea maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="actions">
        <button type="submit">{item ? 'Guardar cambios' : 'Agregar elemento'}</button>
        {item && <button type="button" className="secondary" onClick={onDone}>Cancelar</button>}
      </div>
    </form>
  )
}
