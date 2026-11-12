import { describe, expect, it } from 'vitest'
import { isUnmodifiedSeedSnapshot, mergeSnapshots, type SyncSnapshot } from './syncEngine'

const emptySnapshot: SyncSnapshot = {
  lists: [],
  items: [],
  rankings: [],
  tombstones: [],
}

describe('syncEngine (LWW + tombstones)', () => {
  it('combina registros de dos dispositivos sin colisiones de IDs numéricos y resuelve LWW por updatedAt', () => {
    const local: SyncSnapshot = {
      lists: [
        { id: 1, syncId: 'list-a', name: 'Vinos Local Viejo', category: 'Vinos', fields: ['Cepa'], updatedAt: 100 },
        { id: 2, syncId: 'list-b', name: 'Cafés', category: '', fields: ['Origen'], updatedAt: 200 },
      ],
      items: [
        { id: 1, listId: 1, syncId: 'item-a1', name: 'Malbec', notes: 'Local', attributes: { Cepa: 'Malbec' }, updatedAt: 300 },
        { id: 2, listId: 2, syncId: 'item-b1', name: 'Etiopía', notes: '', attributes: { Origen: 'ET' }, updatedAt: 210 },
      ],
      rankings: [
        { id: 1, listId: 1, syncId: 'rank-a1', name: 'Top Vinos', itemIds: [1], updatedAt: 150 },
      ],
      tombstones: [],
    }

    const remote: SyncSnapshot = {
      lists: [
        { id: 1, syncId: 'list-a', name: 'Vinos Remoto Nuevo', category: 'Tintos', fields: ['Cepa'], updatedAt: 500 },
        { id: 2, syncId: 'list-c', name: 'Bares', category: 'Salidas', fields: [], updatedAt: 250 },
      ],
      items: [
        { id: 1, listId: 1, syncId: 'item-a1', name: 'Malbec Viejo', notes: 'Remoto', attributes: { Cepa: 'Malbec' }, updatedAt: 120 },
        { id: 2, listId: 1, syncId: 'item-a2', name: 'Cabernet', notes: '', attributes: { Cepa: 'CS' }, updatedAt: 400 },
      ],
      rankings: [
        { id: 1, listId: 1, syncId: 'rank-a1', name: 'Top Vinos', itemIds: [2, 1], updatedAt: 450 },
      ],
      tombstones: [],
    }

    const merged = mergeSnapshots(local, remote)

    expect(merged.lists.map((l) => l.name)).toEqual(['Vinos Remoto Nuevo', 'Cafés', 'Bares'])
    const listA = merged.lists.find((l) => l.syncId === 'list-a')!
    const itemA1 = merged.items.find((i) => i.syncId === 'item-a1')!
    const itemA2 = merged.items.find((i) => i.syncId === 'item-a2')!
    const rankA1 = merged.rankings.find((r) => r.syncId === 'rank-a1')!

    expect(itemA1.name).toBe('Malbec')
    expect(itemA1.listId).toBe(listA.id)
    expect(itemA2.listId).toBe(listA.id)
    expect(rankA1.listId).toBe(listA.id)
    expect(rankA1.itemIds).toEqual([itemA2.id, itemA1.id])

    // Idempotencia
    const secondPass = mergeSnapshots(merged, remote)
    expect(secondPass).toEqual(merged)
  })

  it('respeta tombstones y evita la resurrección de elementos o listados eliminados', () => {
    const local: SyncSnapshot = {
      lists: [
        { id: 1, syncId: 'list-1', name: 'Vinos', category: '', fields: [], updatedAt: 100 },
      ],
      items: [
        { id: 1, listId: 1, syncId: 'item-1', name: 'Malbec', notes: '', attributes: {}, updatedAt: 100 },
        { id: 2, listId: 1, syncId: 'item-2', name: 'Merlot', notes: '', attributes: {}, updatedAt: 200 },
      ],
      rankings: [
        { id: 1, listId: 1, syncId: 'rank-1', name: 'Top', itemIds: [1, 2], updatedAt: 100 },
      ],
      tombstones: [],
    }

    const remote: SyncSnapshot = {
      lists: [
        { id: 1, syncId: 'list-1', name: 'Vinos', category: '', fields: [], updatedAt: 100 },
      ],
      items: [
        { id: 2, listId: 1, syncId: 'item-2', name: 'Merlot', notes: '', attributes: {}, updatedAt: 200 },
      ],
      rankings: [
        { id: 1, listId: 1, syncId: 'rank-1', name: 'Top', itemIds: [2], updatedAt: 300 },
      ],
      tombstones: [
        { id: 'item-1', entityType: 'item', deletedAt: 250 },
      ],
    }

    const merged = mergeSnapshots(local, remote)
    expect(merged.items.map((i) => i.syncId)).toEqual(['item-2'])
    expect(merged.rankings[0]?.itemIds).toEqual([merged.items[0]!.id])
    expect(merged.tombstones).toEqual([{ id: 'item-1', entityType: 'item', deletedAt: 250 }])
  })

  it('descarta DemoData local sin editar cuando existe un respaldo remoto real', () => {
    const demoLocal: SyncSnapshot = {
      lists: [{ id: 1, syncId: 'demo-list', name: 'Demo', category: '', fields: [], updatedAt: 1 }],
      items: [{ id: 1, listId: 1, syncId: 'demo-item', name: 'Demo Item', notes: '', attributes: {}, updatedAt: 1 }],
      rankings: [{ id: 1, listId: 1, syncId: 'demo-rank', name: 'Demo Rank', itemIds: [1], updatedAt: 1 }],
      tombstones: [],
    }
    expect(isUnmodifiedSeedSnapshot(demoLocal)).toBe(true)

    const remote: SyncSnapshot = {
      lists: [{ id: 1, syncId: 'real-list', name: 'Mis Bares', category: '', fields: [], updatedAt: 5000 }],
      items: [],
      rankings: [],
      tombstones: [],
    }

    const merged = mergeSnapshots(demoLocal, remote)
    expect(merged.lists.map((l) => l.syncId)).toEqual(['real-list'])
    expect(merged.items).toEqual([])

    // Si el remoto está vacío, se conserva la semilla local
    const mergedWithEmptyRemote = mergeSnapshots(demoLocal, emptySnapshot)
    expect(mergedWithEmptyRemote.lists.map((l) => l.syncId)).toEqual(['demo-list'])
  })

  it('conserva datos locales si el usuario modificó la semilla (updatedAt > 1)', () => {
    const editedDemo: SyncSnapshot = {
      lists: [{ id: 1, syncId: 'demo-list', name: 'Demo Editada', category: '', fields: [], updatedAt: 2000 }],
      items: [],
      rankings: [],
      tombstones: [],
    }
    expect(isUnmodifiedSeedSnapshot(editedDemo)).toBe(false)

    const remote: SyncSnapshot = {
      lists: [{ id: 1, syncId: 'real-list', name: 'Mis Bares', category: '', fields: [], updatedAt: 5000 }],
      items: [],
      rankings: [],
      tombstones: [],
    }

    const merged = mergeSnapshots(editedDemo, remote)
    expect(merged.lists.map((l) => l.syncId).sort()).toEqual(['demo-list', 'real-list'])
  })
})
