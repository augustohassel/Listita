export type SyncEntityType = 'list' | 'item' | 'ranking'

export interface Tombstone {
  id: string
  entityType: SyncEntityType
  deletedAt: number
}

export interface List {
  id: number
  name: string
  category: string
  fields: string[]
  syncId?: string
  updatedAt?: number
}

export interface Item {
  id: number
  listId: number
  name: string
  notes: string
  attributes: Record<string, string>
  syncId?: string
  updatedAt?: number
}

export interface Ranking {
  id: number
  listId: number
  name: string
  itemIds: number[]
  syncId?: string
  updatedAt?: number
}

export interface BackupData {
  version: number
  exportedAt: string
  lists: List[]
  items: Item[]
  rankings: Ranking[]
  tombstones?: Tombstone[]
}

export type NavTab = 'lists' | 'items' | 'rankings' | 'settings'

export type ThemeMode = 'dark' | 'light'

export type RunAction = (action: () => Promise<unknown>) => Promise<boolean>
