import Dexie, { type EntityTable } from 'dexie'
import type { Item, List, Ranking } from '../types'

export const db = new Dexie('ListitaDB') as Dexie & {
  lists: EntityTable<List, 'id'>
  items: EntityTable<Item, 'id'>
  rankings: EntityTable<Ranking, 'id'>
}

db.version(1).stores({
  lists: '++id',
  items: '++id, listId',
  rankings: '++id, listId',
})

function requiredName(value: string) {
  const name = value.trim()
  if (!name || name.length > 120) {
    throw new Error('El nombre debe tener entre 1 y 120 caracteres.')
  }
  return name
}

async function requireList(listId: number) {
  const list = await db.lists.get(listId)
  if (!list) throw new Error('El listado ya no existe.')
  return list
}

export async function createList(name: string, category: string, fields: string[]) {
  const cleanFields = fields.map((field) => field.trim())
  if (
    cleanFields.length > 12 ||
    cleanFields.some((field) => !field || field.length > 60) ||
    new Set(cleanFields.map((field) => field.toLocaleLowerCase('es'))).size !== cleanFields.length
  ) {
    throw new Error('Usá hasta 12 atributos distintos, de entre 1 y 60 caracteres cada uno.')
  }
  if (category.trim().length > 120) throw new Error('La categoría es demasiado larga.')
  return db.lists.add({
    name: requiredName(name),
    category: category.trim(),
    fields: cleanFields,
  })
}

export async function saveItem(
  listId: number,
  values: Pick<Item, 'name' | 'notes' | 'attributes'>,
  itemId?: number,
) {
  return db.transaction('rw', db.lists, db.items, async () => {
    const list = await requireList(listId)
    if (itemId !== undefined) {
      const item = await db.items.get(itemId)
      if (!item || item.listId !== listId) throw new Error('El elemento ya no existe en este listado.')
    }
    if (values.notes.length > 4000) throw new Error('Las notas admiten hasta 4000 caracteres.')
    const item = {
      listId,
      name: requiredName(values.name),
      notes: values.notes.trim(),
      attributes: Object.fromEntries(
        list.fields.map((field) => [
          field,
          (Object.hasOwn(values.attributes, field) ? values.attributes[field] : '').trim(),
        ]),
      ),
    }
    if (itemId !== undefined) return db.items.put({ ...item, id: itemId })
    return db.items.add(item)
  })
}

export async function createRanking(listId: number, name: string) {
  return db.transaction('rw', db.lists, db.items, db.rankings, async () => {
    await requireList(listId)
    const items = await db.items.where({ listId }).toArray()
    if (!items.length) throw new Error('Agregá al menos un elemento antes de crear un ranking.')
    return db.rankings.add({
      listId,
      name: requiredName(name),
      itemIds: items.map((item) => item.id),
    })
  })
}

export async function setRankingItems(rankingId: number, itemIds: number[]) {
  return db.transaction('rw', db.items, db.rankings, async () => {
    const ranking = await db.rankings.get(rankingId)
    if (!ranking) throw new Error('El ranking ya no existe.')
    const items = await db.items.bulkGet(itemIds)
    if (
      new Set(itemIds).size !== itemIds.length ||
      items.some((item) => !item || item.listId !== ranking.listId)
    ) {
      throw new Error('El ranking solo admite elementos distintos de su listado.')
    }
    await db.rankings.update(rankingId, { itemIds })
  })
}

export async function deleteItem(itemId: number) {
  return db.transaction('rw', db.items, db.rankings, async () => {
    const item = await db.items.get(itemId)
    if (!item) return
    const rankings = await db.rankings.where({ listId: item.listId }).toArray()
    for (const ranking of rankings) {
      await db.rankings.update(ranking.id, {
        itemIds: ranking.itemIds.filter((id) => id !== itemId),
      })
    }
    await db.items.delete(itemId)
  })
}

export async function deleteList(listId: number) {
  return db.transaction('rw', db.lists, db.items, db.rankings, async () => {
    await db.items.where({ listId }).delete()
    await db.rankings.where({ listId }).delete()
    await db.lists.delete(listId)
  })
}
