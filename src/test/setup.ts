import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { db } from '../db'

beforeEach(async () => {
  await db.transaction('rw', db.lists, db.items, db.rankings, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
})
afterEach(cleanup)
