import { defaultTheme } from './defaultTheme'

function toKebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function getApplyTarget(target) {
  if (target?.style?.setProperty) return target
  if (typeof document === 'undefined') return null
  return document.documentElement
}

function getThemeValue(theme, groupName, tokenName) {
  const fallback = defaultTheme[groupName][tokenName]
  const group = theme?.[groupName]
  if (!group || typeof group !== 'object') return fallback
  const value = group[tokenName]
  return value === undefined || value === null || value === '' ? fallback : value
}

export function applyTheme(theme = defaultTheme, target) {
  const element = getApplyTarget(target)
  if (!element) return false

  const source = theme && typeof theme === 'object' ? theme : defaultTheme

  for (const [groupName, tokens] of Object.entries(defaultTheme)) {
    for (const tokenName of Object.keys(tokens)) {
      const cssVariableName = `--ks-${toKebab(groupName)}-${toKebab(tokenName)}`
      element.style.setProperty(
        cssVariableName,
        String(getThemeValue(source, groupName, tokenName)),
      )
    }
  }

  return true
}
