import { describe, expect, it } from 'vitest'
import { createList, createRanking, db, deleteItem, deleteList, saveItem, setRankingItems } from './index'

const wine = { name: 'Malbec', notes: 'Frutado', attributes: { Bodega: 'Mendoza' } }

describe('listados y elementos', () => {
  it('guarda atributos propios de cada listado y permite editar las particularidades', async () => {
    const listId = await createList(' Vinos ', ' Vinos tintos ', [' Bodega ', 'Cepa'])
    const id = await saveItem(listId, wine)
    expect(await db.lists.get(listId)).toMatchObject({
      name: 'Vinos', category: 'Vinos tintos', fields: ['Bodega', 'Cepa'],
    })
    expect(await db.items.get(id)).toMatchObject({
      name: 'Malbec', notes: 'Frutado', attributes: { Bodega: 'Mendoza', Cepa: '' },
    })
    await saveItem(listId, { ...wine, notes: 'Para acompañar pastas' }, id)
    expect(await db.items.count()).toBe(1)
    expect((await db.items.get(id))?.notes).toBe('Para acompañar pastas')
  })

  it('rechaza nombres vacíos y atributos inválidos sin guardar datos parciales', async () => {
    await expect(createList(' ', '', [])).rejects.toThrow('nombre')
    await expect(createList('Vinos', '', ['Cepa', ' cepa '])).rejects.toThrow('atributos')
    await expect(createList('Vinos', '', [''])).rejects.toThrow('atributos')
    await expect(createList('Vinos', '', Array.from({ length: 13 }, (_, i) => `Campo ${i}`))).rejects.toThrow('atributos')
    expect(await db.lists.count()).toBe(0)
    const listId = await createList('Vinos', '', [])
    await expect(saveItem(listId, { ...wine, name: ' ' })).rejects.toThrow('nombre')
    await expect(saveItem(listId, { ...wine, notes: 'x'.repeat(4001) })).rejects.toThrow('notas')
    expect(await db.items.count()).toBe(0)
  })

  it('impide agregar elementos a listados inexistentes o editar elementos de otro listado', async () => {
    await expect(saveItem(999, wine)).rejects.toThrow('listado ya no existe')
    const first = await createList('Vinos', '', [])
    const second = await createList('Bares', '', [])
    const id = await saveItem(first, wine)
    await expect(saveItem(second, { ...wine, name: 'Cambio' }, id)).rejects.toThrow('elemento')
    expect((await db.items.get(id))?.name).toBe('Malbec')
  })

  it('admite atributos cuyos nombres coinciden con propiedades de Object', async () => {
    const listId = await createList('Prueba', '', ['constructor', '__proto__'])
    const id = await saveItem(listId, { ...wine, attributes: {} })
    expect((await db.items.get(id))?.attributes).toEqual(
      Object.fromEntries([['constructor', ''], ['__proto__', '']]),
    )
    await saveItem(listId, {
      ...wine, attributes: Object.fromEntries([['constructor', 'Texto'], ['__proto__', 'Nota']]),
    }, id)
    expect((await db.items.get(id))?.attributes.__proto__).toBe('Nota')
    expect(Object.prototype).not.toHaveProperty('listId')
  })
})

describe('rankings persistentes', () => {
  it('guarda rankings independientes, su orden y la selección de elementos al reabrir la base', async () => {
    const listId = await createList('Vinos', '', [])
    const first = await saveItem(listId, wine)
    const second = await saveItem(listId, { ...wine, name: 'Merlot' })
    const favorites = await createRanking(listId, 'Favoritos')
    const value = await createRanking(listId, 'Precio/calidad')
    await setRankingItems(favorites, [second, first])
    await setRankingItems(value, [first])
    db.close()
    await db.open()
    expect((await db.rankings.get(favorites))?.itemIds).toEqual([second, first])
    expect((await db.rankings.get(value))?.itemIds).toEqual([first])
    await setRankingItems(value, [])
    expect((await db.rankings.get(value))?.itemIds).toEqual([])
  })

  it('rechaza elementos duplicados, inexistentes o de otro listado sin alterar el ranking', async () => {
    const listId = await createList('Vinos', '', [])
    const other = await createList('Bares', '', [])
    const id = await saveItem(listId, wine)
    const foreignId = await saveItem(other, { ...wine, name: 'Bar' })
    const rankingId = await createRanking(listId, 'Favoritos')
    for (const ids of [[id, id], [999], [foreignId]]) {
      await expect(setRankingItems(rankingId, ids)).rejects.toThrow('elementos distintos de su listado')
      expect((await db.rankings.get(rankingId))?.itemIds).toEqual([id])
    }
    await expect(setRankingItems(999, [id])).rejects.toThrow('ranking ya no existe')
  })

  it('requiere un listado existente con elementos para crear rankings', async () => {
    const listId = await createList('Vinos', '', [])
    await expect(createRanking(listId, 'Favoritos')).rejects.toThrow('al menos un elemento')
    await expect(createRanking(999, 'Favoritos')).rejects.toThrow('listado ya no existe')
    await saveItem(listId, wine)
    await expect(createRanking(listId, ' ')).rejects.toThrow('nombre')
    expect(await db.rankings.count()).toBe(0)
  })

  it('quita un elemento eliminado de todos sus rankings sin cambiar el orden restante', async () => {
    const listId = await createList('Vinos', '', [])
    const first = await saveItem(listId, wine)
    const second = await saveItem(listId, { ...wine, name: 'Merlot' })
    const favorite = await createRanking(listId, 'Favoritos')
    const value = await createRanking(listId, 'Precio/calidad')
    await setRankingItems(favorite, [second, first])
    await deleteItem(first)
    expect(await db.items.get(first)).toBeUndefined()
    expect((await db.rankings.get(favorite))?.itemIds).toEqual([second])
    expect((await db.rankings.get(value))?.itemIds).toEqual([second])
  })

  it('elimina un listado con sus elementos y rankings sin tocar otros listados', async () => {
    const listId = await createList('Vinos', '', [])
    const other = await createList('Bares', '', [])
    await saveItem(listId, wine)
    const bar = await saveItem(other, { ...wine, name: 'Bar' })
    await createRanking(listId, 'Favoritos')
    const rankingId = await createRanking(other, 'Para volver')
    await deleteList(listId)
    expect(await db.lists.toArray()).toEqual([expect.objectContaining({ id: other })])
    expect(await db.items.toArray()).toEqual([expect.objectContaining({ id: bar })])
    expect(await db.rankings.toArray()).toEqual([expect.objectContaining({ id: rankingId })])
  })
})
