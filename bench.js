import { indexedDB } from './build/esm/index.js'

const NUM_RECORDS = 1000

async function main() {

  let db
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('keyvalues', 1)
    req.onerror = reject
    req.onupgradeneeded = () => {
      db = req.result
      const store = db.createObjectStore('keyvalues', { keyPath: 'a' })
      store.createIndex('b', 'b', { multiEntry: true })
    }
    req.onsuccess = () => resolve()
  })

  const start = performance.now()

  await new Promise((resolve, reject) => {
    const txn = db.transaction('keyvalues', 'readwrite')
    const store = txn.objectStore('keyvalues')
    txn.oncomplete = () => resolve()
    txn.onerror = () => reject(txn.error)
    for (let i = 0; i < NUM_RECORDS; i++) {
      store.put({
        a: i,
        b: Array(100).fill().map((_, i) => i),
      })
    }
  })

  const end = performance.now()
  console.log('Total time (ms)', end - start)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
