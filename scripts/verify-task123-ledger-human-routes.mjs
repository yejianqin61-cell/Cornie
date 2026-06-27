import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from '../electron/server.js'
import { openDb } from '../electron/db.js'

async function listen(app) {
  const server = createHttpServer(app)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('failed to bind test server')
  }
  return { server, port: address.port }
}

async function requestJson(port, pathname, init = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    ...init
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new Error(`${pathname} failed: ${res.status} ${text}`)
  }

  return data
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-task123-'))
  const dbPath = path.join(tempRoot, 'task123.sqlite')
  const store = await openDb(dbPath)
  const app = createServer({ store })
  const { server, port } = await listen(app)

  try {
    const expenseCategory = await requestJson(port, '/api/ledger/categories/expense', {
      method: 'POST',
      body: JSON.stringify({
        id: 'exp_food_test',
        name: 'ZXQ123A',
        sortOrder: 10
      })
    })
    assert.equal(expenseCategory.category.id, 'exp_food_test')

    const incomeCategory = await requestJson(port, '/api/ledger/categories/income', {
      method: 'POST',
      body: JSON.stringify({
        id: 'inc_salary_test',
        name: 'ZXQ123B',
        sortOrder: 20
      })
    })
    assert.equal(incomeCategory.category.id, 'inc_salary_test')

    const expenseEntry = await requestJson(port, '/api/ledger/entries/expense', {
      method: 'POST',
      body: JSON.stringify({
        amount: 35.5,
        categoryId: 'exp_food_test',
        categoryName: 'ZXQ123A',
        item: '午餐'
      })
    })
    assert.equal(expenseEntry.entry.type, 'expense')

    const listedEntries = await requestJson(port, '/api/ledger/entries?recent=5')
    assert.ok(Array.isArray(listedEntries.items))
    assert.ok(listedEntries.items.some((item) => item.id === expenseEntry.entry.id))

    const categoryFiltered = await requestJson(port, '/api/ledger/entries?categoryId=exp_food_test')
    assert.ok(categoryFiltered.items.every((item) => item.categoryId === 'exp_food_test'))

    const entryDetail = await requestJson(port, `/api/ledger/entries/${encodeURIComponent(expenseEntry.entry.id)}`)
    assert.equal(entryDetail.entry.id, expenseEntry.entry.id)

    const updatedEntry = await requestJson(port, `/api/ledger/entries/${encodeURIComponent(expenseEntry.entry.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        amount: 48,
        item: '晚餐'
      })
    })
    assert.equal(updatedEntry.entry.amount, 48)

    const categories = await requestJson(port, '/api/ledger/categories')
    assert.ok(categories.items.some((item) => item.id === 'exp_food_test'))
    assert.ok(categories.items.some((item) => item.id === 'inc_salary_test'))

    const categoryDetail = await requestJson(port, '/api/ledger/categories/exp_food_test')
    assert.equal(categoryDetail.category.id, 'exp_food_test')

    const updatedCategory = await requestJson(port, '/api/ledger/categories/exp_food_test', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'ZXQ123C'
      })
    })
    assert.equal(updatedCategory.category.name, 'ZXQ123C')

    await requestJson(port, '/api/ledger/categories/exp_food_test', {
      method: 'PUT',
      body: JSON.stringify({
        isActive: false
      })
    })

    const restoredCategory = await requestJson(port, '/api/ledger/categories/exp_food_test/restore', {
      method: 'POST'
    })
    assert.equal(restoredCategory.category.isActive, true)

    const deletedEntry = await requestJson(port, `/api/ledger/entries/${encodeURIComponent(expenseEntry.entry.id)}`, {
      method: 'DELETE'
    })
    assert.equal(deletedEntry.entry.id, expenseEntry.entry.id)

    console.log('verify-task123-ledger-human-routes: passed')
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('verify-task123-ledger-human-routes: failed')
  console.error(error?.message ?? error)
  process.exit(1)
})
