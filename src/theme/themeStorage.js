export const THEME_STORAGE_KEY = 'kaishuruUiTheme:v1'

const THEME_STORAGE_VERSION = 1

function getStorage() {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function loadTheme() {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(THEME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== THEME_STORAGE_VERSION) return null
    if (!parsed.theme || typeof parsed.theme !== 'object') return null
    return parsed.theme
  } catch {
    return null
  }
}

export function saveTheme(theme) {
  if (!theme || typeof theme !== 'object') return false

  const storage = getStorage()
  if (!storage) return false

  try {
    storage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ version: THEME_STORAGE_VERSION, theme }),
    )
    return true
  } catch {
    return false
  }
}

export function resetTheme() {
  const storage = getStorage()
  if (!storage) return false

  try {
    storage.removeItem(THEME_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
