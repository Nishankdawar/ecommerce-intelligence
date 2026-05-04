/**
 * In-memory cache for engine results.
 * Lives for the duration of the server process.
 * Call bustCache() when new files are uploaded.
 */

const store = {}

export function getCached(key) {
  return store[key] ?? null
}

export function setCached(key, data) {
  store[key] = data
}

export function bustCache() {
  const keys = Object.keys(store)
  keys.forEach(k => delete store[k])
  return keys.length // how many entries were cleared
}

export function getCacheKeys() {
  return Object.keys(store)
}
