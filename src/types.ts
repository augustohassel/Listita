export interface List {
  id: number
  name: string
  category: string
  fields: string[]
}

export interface Item {
  id: number
  listId: number
  name: string
  notes: string
  attributes: Record<string, string>
}

export interface Ranking {
  id: number
  listId: number
  name: string
  itemIds: number[]
}

export interface BackupData {
  version: number
  exportedAt: string
  lists: List[]
  items: Item[]
  rankings: Ranking[]
}

export type NavTab = 'lists' | 'items' | 'rankings' | 'settings'

export type RunAction = (action: () => Promise<unknown>) => Promise<boolean>
