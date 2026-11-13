import type { Item, List, Ranking, Tombstone } from '../types'

export interface SyncSnapshot {
  lists: List[]
  items: Item[]
  rankings: Ranking[]
  tombstones: Tombstone[]
}

interface SourcedItem {
  item: Item
  listSyncId: string
}

interface SourcedRanking {
  ranking: Ranking
  listSyncId: string
  itemSyncIds: string[]
}

export function isUnmodifiedSeedSnapshot(snapshot: SyncSnapshot): boolean {
  const totalEntities =
    snapshot.lists.length + snapshot.items.length + snapshot.rankings.length
  if (totalEntities === 0 || snapshot.tombstones.length > 0) {
    return false
  }
  const allAreSeed = (entities: Array<{ updatedAt?: number }>) =>
    entities.every((entity) => (entity.updatedAt ?? 0) <= 1)

  return (
    allAreSeed(snapshot.lists) &&
    allAreSeed(snapshot.items) &&
    allAreSeed(snapshot.rankings)
  )
}

function hasAnyData(snapshot: SyncSnapshot): boolean {
  return (
    snapshot.lists.length > 0 ||
    snapshot.items.length > 0 ||
    snapshot.rankings.length > 0 ||
    snapshot.tombstones.length > 0
  )
}

function mergeTombstones(
  localTombstones: Tombstone[],
  remoteTombstones: Tombstone[],
): Map<string, Tombstone> {
  const map = new Map<string, Tombstone>()
  for (const tombstone of [...localTombstones, ...remoteTombstones]) {
    if (!tombstone.id) continue
    const existing = map.get(tombstone.id)
    if (!existing || tombstone.deletedAt > existing.deletedAt) {
      map.set(tombstone.id, { ...tombstone })
    }
  }
  return map
}

function pickLatestBySyncId<T>(
  entries: T[],
  getSyncId: (entry: T) => string | undefined,
  getUpdatedAt: (entry: T) => number,
  tombstones: Map<string, Tombstone>,
): T[] {
  const winners = new Map<string, T>()

  for (const entry of entries) {
    const syncId = getSyncId(entry)
    if (!syncId) continue
    const updatedAt = getUpdatedAt(entry)
    const existing = winners.get(syncId)
    if (!existing || updatedAt > getUpdatedAt(existing)) {
      winners.set(syncId, entry)
    }
  }

  const alive: T[] = []
  for (const [syncId, winner] of winners.entries()) {
    const tombstone = tombstones.get(syncId)
    if (tombstone && tombstone.deletedAt >= getUpdatedAt(winner)) {
      continue
    }
    alive.push(winner)
  }

  return alive.sort((a, b) => (getSyncId(a) ?? '').localeCompare(getSyncId(b) ?? ''))
}

function indexSnapshotRelations(snapshot: SyncSnapshot): {
  items: SourcedItem[]
  rankings: SourcedRanking[]
} {
  const listSyncById = new Map<number, string>()
  for (const list of snapshot.lists) {
    if (list.syncId) listSyncById.set(list.id, list.syncId)
  }

  const itemSyncById = new Map<number, string>()
  const sourcedItems: SourcedItem[] = []
  for (const item of snapshot.items) {
    const listSyncId = listSyncById.get(item.listId)
    if (!item.syncId || !listSyncId) continue
    itemSyncById.set(item.id, item.syncId)
    sourcedItems.push({ item, listSyncId })
  }

  const sourcedRankings: SourcedRanking[] = []
  for (const ranking of snapshot.rankings) {
    const listSyncId = listSyncById.get(ranking.listId)
    if (!ranking.syncId || !listSyncId) continue
    const itemSyncIds = ranking.itemIds
      .map((itemId) => itemSyncById.get(itemId))
      .filter((syncId): syncId is string => Boolean(syncId))
    sourcedRankings.push({ ranking, listSyncId, itemSyncIds })
  }

  return { items: sourcedItems, rankings: sourcedRankings }
}

/**
 * Combina dos snapshots (local y remoto) de forma determinística e idempotente
 * usando Last-Write-Wins (LWW) por `syncId` + `updatedAt` y `tombstones`.
 * Reasigna IDs numéricos locales de manera consistente para evitar colisiones.
 */
export function mergeSnapshots(
  local: SyncSnapshot,
  remote: SyncSnapshot,
): SyncSnapshot {
  const effectiveLocal: SyncSnapshot =
    isUnmodifiedSeedSnapshot(local) && hasAnyData(remote)
      ? { lists: [], items: [], rankings: [], tombstones: [] }
      : local

  const tombstonesMap = mergeTombstones(
    effectiveLocal.tombstones,
    remote.tombstones,
  )

  const mergedListsRaw = pickLatestBySyncId(
    [...effectiveLocal.lists, ...remote.lists],
    (list) => list.syncId,
    (list) => list.updatedAt ?? 0,
    tombstonesMap,
  )

  const listIdBySyncId = new Map<string, number>()
  const lists: List[] = mergedListsRaw.map((list, index) => {
    const id = index + 1
    listIdBySyncId.set(list.syncId!, id)
    return {
      ...list,
      id,
      fields: [...list.fields],
    }
  })

  const localRel = indexSnapshotRelations(effectiveLocal)
  const remoteRel = indexSnapshotRelations(remote)

  const mergedItemsRaw = pickLatestBySyncId(
    [...localRel.items, ...remoteRel.items],
    (entry) => entry.item.syncId,
    (entry) => entry.item.updatedAt ?? 0,
    tombstonesMap,
  ).filter((entry) => listIdBySyncId.has(entry.listSyncId))

  const itemIdBySyncId = new Map<string, number>()
  const itemListSyncBySyncId = new Map<string, string>()
  const items: Item[] = mergedItemsRaw.map((entry, index) => {
    const id = index + 1
    const syncId = entry.item.syncId!
    itemIdBySyncId.set(syncId, id)
    itemListSyncBySyncId.set(syncId, entry.listSyncId)
    return {
      ...entry.item,
      id,
      listId: listIdBySyncId.get(entry.listSyncId)!,
      attributes: { ...entry.item.attributes },
    }
  })

  const mergedRankingsRaw = pickLatestBySyncId(
    [...localRel.rankings, ...remoteRel.rankings],
    (entry) => entry.ranking.syncId,
    (entry) => entry.ranking.updatedAt ?? 0,
    tombstonesMap,
  ).filter((entry) => listIdBySyncId.has(entry.listSyncId))

  const rankings: Ranking[] = mergedRankingsRaw.map((entry, index) => {
    const seen = new Set<number>()
    const itemIds: number[] = []
    for (const itemSyncId of entry.itemSyncIds) {
      if (itemListSyncBySyncId.get(itemSyncId) !== entry.listSyncId) continue
      const numericId = itemIdBySyncId.get(itemSyncId)
      if (numericId === undefined || seen.has(numericId)) continue
      seen.add(numericId)
      itemIds.push(numericId)
    }
    return {
      ...entry.ranking,
      id: index + 1,
      listId: listIdBySyncId.get(entry.listSyncId)!,
      itemIds,
    }
  })

  const tombstones = Array.from(tombstonesMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  )

  return { lists, items, rankings, tombstones }
}
