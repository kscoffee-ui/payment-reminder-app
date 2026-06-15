import React, { useMemo } from 'react'
import { defaultTheme } from '../../theme/defaultTheme'
import { loadTheme } from '../../theme/themeStorage'

const CATEGORY_LABELS = {
  color: 'Color',
  radius: 'Radius',
  space: 'Space',
  fontSize: 'Font size',
  size: 'Size',
  shadow: 'Shadow',
}

const IMPORTANT_COLORS = ['primary', 'unpaid', 'reported', 'confirmed', 'line']

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeTheme(baseTheme, savedTheme) {
  if (!isPlainObject(baseTheme)) return {}
  if (!isPlainObject(savedTheme)) return baseTheme

  return Object.fromEntries(
    Object.entries(baseTheme).map(([category, defaultValue]) => {
      const savedValue = savedTheme[category]
      if (isPlainObject(defaultValue)) {
        return [category, mergeTheme(defaultValue, savedValue)]
      }
      return [category, savedValue ?? defaultValue]
    }),
  )
}

function readSavedTheme() {
  try {
    return loadTheme()
  } catch {
    return null
  }
}

function getOrderedColorEntries(colors) {
  const colorValues = isPlainObject(colors) ? colors : {}
  const entries = Object.entries(colorValues)
  const importantEntries = IMPORTANT_COLORS
    .filter((key) => Object.prototype.hasOwnProperty.call(colorValues, key))
    .map((key) => [key, colorValues[key]])
  const remainingEntries = entries.filter(([key]) => !IMPORTANT_COLORS.includes(key))
  return [...importantEntries, ...remainingEntries]
}

function renderTokenRow(category, key, value) {
  const isColor = category === 'color'
  const className = ['studio-token-row', isColor && 'studio-token-row--color'].filter(Boolean).join(' ')

  return React.createElement('li', { className, key }, [
    React.createElement('div', { className: 'studio-token-main', key: 'main' }, [
      isColor && React.createElement('span', {
        className: 'studio-color-chip',
        style: { backgroundColor: value },
        'aria-hidden': 'true',
        key: 'chip',
      }),
      React.createElement('span', { className: 'studio-token-key', key: 'key' }, key),
    ]),
    React.createElement('code', { className: 'studio-token-value', key: 'value' }, String(value)),
  ])
}

function renderCategory(category, values) {
  const entries = category === 'color' ? getOrderedColorEntries(values) : Object.entries(values || {})

  return React.createElement('section', { className: 'studio-token-group', key: category }, [
    React.createElement('h2', { key: 'heading' }, CATEGORY_LABELS[category] || category),
    React.createElement('ul', { className: 'studio-token-list', key: 'list' },
      entries.map(([key, value]) => renderTokenRow(category, key, value)),
    ),
  ])
}

export default function StudioPanel() {
  const { theme, hasSavedTheme } = useMemo(() => {
    const savedTheme = readSavedTheme()
    return {
      theme: mergeTheme(defaultTheme, savedTheme),
      hasSavedTheme: isPlainObject(savedTheme),
    }
  }, [])

  // まだ編集せず、現在反映されるテーマ値を確認するための読み取り専用パネル
  return React.createElement('section', { className: 'studio-panel' }, [
    React.createElement('div', { className: 'studio-panel-head', key: 'head' }, [
      React.createElement('p', { className: 'studio-eyebrow', key: 'eyebrow' }, 'Kaishuru UI Studio'),
      React.createElement('h1', { key: 'title' }, 'Theme tokens'),
      React.createElement('p', { className: 'studio-lead', key: 'lead' }, '現在読み込まれているテーマ値を確認できます。'),
      React.createElement('span', { className: 'studio-panel-source', key: 'source' },
        hasSavedTheme ? '保存済みテーマ + defaultTheme' : 'defaultTheme',
      ),
    ]),
    ...Object.keys(CATEGORY_LABELS).map((category) => renderCategory(category, theme[category])),
  ])
}
