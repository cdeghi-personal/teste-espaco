const PREFIX = 'eca_'

export function storageGet(key) {
  try {
    const item = localStorage.getItem(PREFIX + key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.error('Storage error:', e)
  }
}

export function storageRemove(key) {
  localStorage.removeItem(PREFIX + key)
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}
