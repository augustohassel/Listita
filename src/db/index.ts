import Dexie, { type EntityTable } from 'dexie'
import type { BackupData, Item, List, Ranking } from '../types'
import { DEMO_DATASET } from './seeds'

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

function validateFields(fields: string[]) {
  const cleanFields = fields.map((field) => field.trim())
  if (
    cleanFields.length > 12 ||
    cleanFields.some((field) => !field || field.length > 60) ||
    new Set(cleanFields.map((field) => field.toLocaleLowerCase('es'))).size !== cleanFields.length
  ) {
    throw new Error('Usá hasta 12 atributos distintos, de entre 1 y 60 caracteres cada uno.')
  }
  return cleanFields
}

async function requireList(listId: number) {
  const list = await db.lists.get(listId)
  if (!list) throw new Error('El listado ya no existe.')
  return list
}

export async function createList(name: string, category: string, fields: string[]) {
  const cleanFields = validateFields(fields)
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

export async function deleteRanking(rankingId: number) {
  await db.rankings.delete(rankingId)
}

export async function exportBackup(): Promise<string> {
  return db.transaction('r', db.lists, db.items, db.rankings, async () => {
    const [lists, items, rankings] = await Promise.all([
      db.lists.toArray(),
      db.items.toArray(),
      db.rankings.toArray(),
    ])
    const payload: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      lists,
      items,
      rankings,
    }
    return JSON.stringify(payload, null, 2)
  })
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function importBackup(jsonString: string): Promise<BackupData> {
  let raw: unknown
  try {
    raw = JSON.parse(jsonString)
  } catch {
    throw new Error('El archivo JSON está corrupto o tiene un formato inválido.')
  }

  if (
    !isPlainRecord(raw) ||
    !Array.isArray(raw.lists) ||
    !Array.isArray(raw.items) ||
    !Array.isArray(raw.rankings)
  ) {
    throw new Error('El backup no contiene las colecciones requeridas (lists, items, rankings).')
  }

  const listMap = new Map<number, List>()
  for (const entry of raw.lists) {
    if (
      !isPlainRecord(entry) ||
      !isPositiveInteger(entry.id) ||
      typeof entry.name !== 'string' ||
      typeof entry.category !== 'string' ||
      !Array.isArray(entry.fields) ||
      entry.fields.some((f) => typeof f !== 'string')
    ) {
      throw new Error('El backup contiene un listado con esquema inválido.')
    }
    if (listMap.has(entry.id)) {
      throw new Error('El backup contiene identificadores de listados duplicados.')
    }
    if (entry.category.trim().length > 120) {
      throw new Error('La categoría es demasiado larga.')
    }
    listMap.set(entry.id, {
      id: entry.id,
      name: requiredName(entry.name),
      category: entry.category.trim(),
      fields: validateFields(entry.fields as string[]),
    })
  }

  const itemMap = new Map<number, Item>()
  for (const entry of raw.items) {
    if (
      !isPlainRecord(entry) ||
      !isPositiveInteger(entry.id) ||
      !isPositiveInteger(entry.listId) ||
      typeof entry.name !== 'string' ||
      typeof entry.notes !== 'string' ||
      !isPlainRecord(entry.attributes)
    ) {
      throw new Error('El backup contiene un elemento con esquema inválido.')
    }
    if (itemMap.has(entry.id)) {
      throw new Error('El backup contiene identificadores de elementos duplicados.')
    }
    const parentList = listMap.get(entry.listId)
    if (!parentList) {
      throw new Error('El backup contiene elementos asociados a un listado inexistente.')
    }
    if (entry.notes.length > 4000) {
      throw new Error('Las notas admiten hasta 4000 caracteres.')
    }
    const rawAttributes = entry.attributes
    const attributes = Object.fromEntries(
      parentList.fields.map((field) => {
        const val = Object.hasOwn(rawAttributes, field) ? rawAttributes[field] : ''
        if (typeof val !== 'string') {
          throw new Error('Los atributos de cada elemento deben ser texto.')
        }
        return [field, val.trim()]
      }),
    )
    itemMap.set(entry.id, {
      id: entry.id,
      listId: entry.listId,
      name: requiredName(entry.name),
      notes: entry.notes.trim(),
      attributes,
    })
  }

  const rankingIds = new Set<number>()
  const cleanRankings: Ranking[] = []
  for (const entry of raw.rankings) {
    if (
      !isPlainRecord(entry) ||
      !isPositiveInteger(entry.id) ||
      !isPositiveInteger(entry.listId) ||
      typeof entry.name !== 'string' ||
      !Array.isArray(entry.itemIds) ||
      entry.itemIds.some((id) => !isPositiveInteger(id))
    ) {
      throw new Error('El backup contiene un ranking con esquema inválido.')
    }
    if (rankingIds.has(entry.id)) {
      throw new Error('El backup contiene identificadores de rankings duplicados.')
    }
    if (!listMap.has(entry.listId)) {
      throw new Error('El backup contiene rankings asociados a un listado inexistente.')
    }
    const itemIds = entry.itemIds as number[]
    if (
      new Set(itemIds).size !== itemIds.length ||
      itemIds.some((id) => itemMap.get(id)?.listId !== entry.listId)
    ) {
      throw new Error('El ranking solo admite elementos distintos de su listado.')
    }
    rankingIds.add(entry.id)
    cleanRankings.push({
      id: entry.id,
      listId: entry.listId,
      name: requiredName(entry.name),
      itemIds,
    })
  }

  const cleanLists = Array.from(listMap.values())
  const cleanItems = Array.from(itemMap.values())

  await db.transaction('rw', db.lists, db.items, db.rankings, async () => {
    await db.lists.clear()
    await db.items.clear()
    await db.rankings.clear()
    if (cleanLists.length > 0) await db.lists.bulkAdd(cleanLists)
    if (cleanItems.length > 0) await db.items.bulkAdd(cleanItems)
    if (cleanRankings.length > 0) await db.rankings.bulkAdd(cleanRankings)
  })

  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    lists: cleanLists,
    items: cleanItems,
    rankings: cleanRankings,
  }
}

export async function loadDemoData(): Promise<number | undefined> {
  return db.transaction('rw', db.lists, db.items, db.rankings, async () => {
    let firstListId: number | undefined
    for (const seed of DEMO_DATASET) {
      const listId = await db.lists.add({
        name: seed.name,
        category: seed.category,
        fields: seed.fields,
      })
      if (firstListId === undefined) firstListId = listId

      const createdItemIds: number[] = []
      for (const seedItem of seed.items) {
        const itemId = await db.items.add({
          listId,
          name: seedItem.name,
          notes: seedItem.notes,
          attributes: Object.fromEntries(
            seed.fields.map((field) => [field, seedItem.attributes[field] ?? '']),
          ),
        })
        createdItemIds.push(itemId)
      }

      for (const seedRanking of seed.rankings) {
        await db.rankings.add({
          listId,
          name: seedRanking.name,
          itemIds: seedRanking.itemIndexes
            .map((index) => createdItemIds[index])
            .filter((id): id is number => id !== undefined),
        })
      }
    }
    return firstListId
  })
}

export async function clearAllDatabase(): Promise<void> {
  await db.transaction('rw', db.lists, db.items, db.rankings, async () => {
    await db.lists.clear()
    await db.items.clear()
    await db.rankings.clear()
  })
}
