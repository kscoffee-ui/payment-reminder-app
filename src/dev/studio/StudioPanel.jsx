import React, { useCallback, useEffect, useState } from 'react'
import { applyTheme } from '../../theme/applyTheme'
import { defaultTheme } from '../../theme/defaultTheme'
import { loadTheme, resetTheme, saveTheme } from '../../theme/themeStorage'

const CATEGORY_LABELS = {
  color: 'Color',
  radius: 'Radius',
  space: 'Space',
  fontSize: 'Font size',
  size: 'Size',
  shadow: 'Shadow',
}

const EDITABLE_COLOR_TOKENS = [
  'primary',
  'unpaid',
  'reported',
  'confirmed',
  'line',
  'background',
  'surface',
  'text',
  'textMuted',
]

const EDITABLE_RADIUS_TOKENS = ['card', 'control']
const RADIUS_MIN = 0
const RADIUS_MAX = 32

const EDITABLE_SPACE_TOKENS = ['cardY', 'cardX']
const SPACE_MIN = 8
const SPACE_MAX = 32

const EDITABLE_SIZE_TOKENS = ['buttonMinHeight', 'lineButtonMinHeight']
const SIZE_MIN = 40
const SIZE_MAX = 64

const EDITABLE_FONT_SIZE_TOKENS = ['badge', 'button']
const FONT_SIZE_LIMITS = {
  badge: { min: 10, max: 16, defaultValue: 12 },
  button: { min: 13, max: 18, defaultValue: 16 },
}

const COLOR_TOKEN_ROLES = {
  primary: '通常CTA / 進捗 / リンク',
  unpaid: '未払い。赤系で最も目立たせる',
  reported: '確認待ち。オレンジ系で表示',
  confirmed: '確認済み。緑系で完了を表示',
  line: '幹事側のLINE催促',
  background: '画面背景',
  surface: 'カード背景',
  text: '本文',
  textMuted: '補助テキスト',
}

const RADIUS_TOKEN_ROLES = {
  card: 'カード角丸',
  control: 'ボタン / 入力欄の角丸',
}

const SPACE_TOKEN_ROLES = {
  cardY: 'カード上下余白',
  cardX: 'カード左右余白',
}

const SIZE_TOKEN_ROLES = {
  buttonMinHeight: '通常ボタンの最小高さ',
  lineButtonMinHeight: 'LINE催促ボタンの最小高さ',
}

const FONT_SIZE_TOKEN_ROLES = {
  badge: 'StatusBadgeの文字サイズ',
  button: 'KaishuruButton / 主要ボタンの文字サイズ',
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

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

function getSafeHexColor(value, fallback) {
  const fallbackValue = HEX_COLOR_PATTERN.test(fallback) ? fallback : '#000000'
  if (typeof value !== 'string') return fallbackValue
  const normalized = value.trim()
  return HEX_COLOR_PATTERN.test(normalized) ? normalized.toLowerCase() : fallbackValue
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function getSafeRadiusNumber(value, fallback) {
  const parsedValue = Number.parseFloat(value)
  const parsedFallback = Number.parseFloat(fallback)
  const fallbackValue = Number.isFinite(parsedFallback) ? parsedFallback : RADIUS_MIN
  const sourceValue = Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  return Math.round(clampNumber(sourceValue, RADIUS_MIN, RADIUS_MAX))
}

function getSafePixelRadius(value, fallback) {
  return `${getSafeRadiusNumber(value, fallback)}px`
}

function getSafeSpaceNumber(value, fallback) {
  const parsedValue = Number.parseFloat(value)
  const parsedFallback = Number.parseFloat(fallback)
  const fallbackValue = Number.isFinite(parsedFallback) ? parsedFallback : SPACE_MIN
  const sourceValue = Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  return Math.round(clampNumber(sourceValue, SPACE_MIN, SPACE_MAX))
}

function getSafePixelSpace(value, fallback) {
  return `${getSafeSpaceNumber(value, fallback)}px`
}

function getSafeSizeNumber(value, fallback) {
  const parsedValue = Number.parseFloat(value)
  const parsedFallback = Number.parseFloat(fallback)
  const fallbackValue = Number.isFinite(parsedFallback) ? parsedFallback : SIZE_MIN
  const sourceValue = Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  return Math.round(clampNumber(sourceValue, SIZE_MIN, SIZE_MAX))
}

function getSafePixelSize(value, fallback) {
  return `${getSafeSizeNumber(value, fallback)}px`
}

function getFontSizeLimit(tokenName) {
  return FONT_SIZE_LIMITS[tokenName] || { min: 10, max: 18, defaultValue: 14 }
}

function getSafeFontSizeNumber(value, fallback, tokenName) {
  const limit = getFontSizeLimit(tokenName)
  const normalizedValue = typeof value === 'string' ? value.trim() : value
  const valueIsPxOrNumber = typeof normalizedValue === 'number'
    || (typeof normalizedValue === 'string' && /^\d+(\.\d+)?(px)?$/.test(normalizedValue))
  const parsedValue = valueIsPxOrNumber ? Number.parseFloat(normalizedValue) : Number.NaN
  const fallbackIsPx = typeof fallback === 'string' && fallback.trim().endsWith('px')
  const parsedFallback = fallbackIsPx ? Number.parseFloat(fallback) : Number.NaN
  const fallbackValue = Number.isFinite(parsedFallback) ? parsedFallback : limit.defaultValue
  const sourceValue = Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  return Math.round(clampNumber(sourceValue, limit.min, limit.max))
}

function getSafePixelFontSize(value, fallback, tokenName) {
  return `${getSafeFontSizeNumber(value, fallback, tokenName)}px`
}

function getSafeFontSizeValue(tokenName, value) {
  const defaultValue = defaultTheme.fontSize[tokenName]
  if (value === defaultValue) return defaultValue
  return getSafePixelFontSize(value, defaultValue, tokenName)
}

function sanitizeStudioTheme(theme) {
  const color = isPlainObject(theme?.color) ? theme.color : {}
  const radius = isPlainObject(theme?.radius) ? theme.radius : {}
  const space = isPlainObject(theme?.space) ? theme.space : {}
  const fontSize = isPlainObject(theme?.fontSize) ? theme.fontSize : {}
  const size = isPlainObject(theme?.size) ? theme.size : {}

  return {
    ...theme,
    color: {
      ...color,
      ...Object.fromEntries(
        EDITABLE_COLOR_TOKENS.map((tokenName) => [
          tokenName,
          getSafeHexColor(color[tokenName], defaultTheme.color[tokenName]),
        ]),
      ),
    },
    radius: {
      ...radius,
      ...Object.fromEntries(
        EDITABLE_RADIUS_TOKENS.map((tokenName) => [
          tokenName,
          getSafePixelRadius(radius[tokenName], defaultTheme.radius[tokenName]),
        ]),
      ),
    },
    space: {
      ...space,
      ...Object.fromEntries(
        EDITABLE_SPACE_TOKENS.map((tokenName) => [
          tokenName,
          getSafePixelSpace(space[tokenName], defaultTheme.space[tokenName]),
        ]),
      ),
    },
    fontSize: {
      ...fontSize,
      ...Object.fromEntries(
        EDITABLE_FONT_SIZE_TOKENS.map((tokenName) => [
          tokenName,
          getSafeFontSizeValue(tokenName, fontSize[tokenName]),
        ]),
      ),
    },
    size: {
      ...size,
      ...Object.fromEntries(
        EDITABLE_SIZE_TOKENS.map((tokenName) => [
          tokenName,
          getSafePixelSize(size[tokenName], defaultTheme.size[tokenName]),
        ]),
      ),
    },
  }
}

function readSavedTheme() {
  try {
    return loadTheme()
  } catch {
    return null
  }
}

function createPanelState() {
  const savedTheme = readSavedTheme()
  return {
    theme: sanitizeStudioTheme(mergeTheme(defaultTheme, savedTheme)),
    hasSavedTheme: isPlainObject(savedTheme),
  }
}

async function copyTextToClipboard(text) {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function isEditableColorToken(category, key) {
  return category === 'color' && EDITABLE_COLOR_TOKENS.includes(key)
}

function isEditableRadiusToken(category, key) {
  return category === 'radius' && EDITABLE_RADIUS_TOKENS.includes(key)
}

function isEditableSpaceToken(category, key) {
  return category === 'space' && EDITABLE_SPACE_TOKENS.includes(key)
}

function isEditableSizeToken(category, key) {
  return category === 'size' && EDITABLE_SIZE_TOKENS.includes(key)
}

function isEditableFontSizeToken(category, key) {
  return category === 'fontSize' && EDITABLE_FONT_SIZE_TOKENS.includes(key)
}

function getOrderedColorEntries(colors) {
  const colorValues = isPlainObject(colors) ? colors : {}
  const entries = Object.entries(colorValues)
  const importantEntries = EDITABLE_COLOR_TOKENS
    .filter((key) => Object.prototype.hasOwnProperty.call(colorValues, key))
    .map((key) => [key, colorValues[key]])
  const remainingEntries = entries.filter(([key]) => !EDITABLE_COLOR_TOKENS.includes(key))
  return [...importantEntries, ...remainingEntries]
}

function getOrderedRadiusEntries(radius) {
  const radiusValues = isPlainObject(radius) ? radius : {}
  const entries = Object.entries(radiusValues)
  const editableEntries = EDITABLE_RADIUS_TOKENS
    .filter((key) => Object.prototype.hasOwnProperty.call(radiusValues, key))
    .map((key) => [key, radiusValues[key]])
  const remainingEntries = entries.filter(([key]) => !EDITABLE_RADIUS_TOKENS.includes(key))
  return [...editableEntries, ...remainingEntries]
}

function getOrderedSpaceEntries(space) {
  const spaceValues = isPlainObject(space) ? space : {}
  const entries = Object.entries(spaceValues)
  const editableEntries = EDITABLE_SPACE_TOKENS
    .filter((key) => Object.prototype.hasOwnProperty.call(spaceValues, key))
    .map((key) => [key, spaceValues[key]])
  const remainingEntries = entries.filter(([key]) => !EDITABLE_SPACE_TOKENS.includes(key))
  return [...editableEntries, ...remainingEntries]
}

function getOrderedSizeEntries(size) {
  const sizeValues = isPlainObject(size) ? size : {}
  const entries = Object.entries(sizeValues)
  const editableEntries = EDITABLE_SIZE_TOKENS
    .filter((key) => Object.prototype.hasOwnProperty.call(sizeValues, key))
    .map((key) => [key, sizeValues[key]])
  const remainingEntries = entries.filter(([key]) => !EDITABLE_SIZE_TOKENS.includes(key))
  return [...editableEntries, ...remainingEntries]
}

function getOrderedFontSizeEntries(fontSize) {
  const fontSizeValues = isPlainObject(fontSize) ? fontSize : {}
  const entries = Object.entries(fontSizeValues)
  const editableEntries = EDITABLE_FONT_SIZE_TOKENS
    .filter((key) => Object.prototype.hasOwnProperty.call(fontSizeValues, key))
    .map((key) => [key, fontSizeValues[key]])
  const remainingEntries = entries.filter(([key]) => !EDITABLE_FONT_SIZE_TOKENS.includes(key))
  return [...editableEntries, ...remainingEntries]
}

function renderTokenRow(
  category,
  key,
  value,
  onColorChange,
  onRadiusChange,
  onSpaceChange,
  onSizeChange,
  onFontSizeChange,
) {
  const isColor = category === 'color'
  const isRadius = category === 'radius'
  const isSpace = category === 'space'
  const isSize = category === 'size'
  const isFontSize = category === 'fontSize'
  const canEditColor = isEditableColorToken(category, key)
  const canEditRadius = isEditableRadiusToken(category, key)
  const canEditSpace = isEditableSpaceToken(category, key)
  const canEditSize = isEditableSizeToken(category, key)
  const canEditFontSize = isEditableFontSizeToken(category, key)
  const canEdit = canEditColor || canEditRadius || canEditSpace || canEditSize || canEditFontSize
  const safeColor = isColor ? getSafeHexColor(value, defaultTheme.color[key]) : value
  const safeRadiusNumber = canEditRadius ? getSafeRadiusNumber(value, defaultTheme.radius[key]) : null
  const safeRadiusValue = canEditRadius ? `${safeRadiusNumber}px` : null
  const safeSpaceNumber = canEditSpace ? getSafeSpaceNumber(value, defaultTheme.space[key]) : null
  const safeSpaceValue = canEditSpace ? `${safeSpaceNumber}px` : null
  const safeSizeNumber = canEditSize ? getSafeSizeNumber(value, defaultTheme.size[key]) : null
  const safeSizeValue = canEditSize ? `${safeSizeNumber}px` : null
  const safeFontSizeNumber = canEditFontSize
    ? getSafeFontSizeNumber(value, defaultTheme.fontSize[key], key)
    : null
  const safeFontSizeValue = canEditFontSize ? `${safeFontSizeNumber}px` : null
  const className = [
    'studio-token-row',
    isColor && 'studio-token-row--color',
    isRadius && 'studio-token-row--radius',
    isSpace && 'studio-token-row--space',
    isSize && 'studio-token-row--size',
    isFontSize && 'studio-token-row--font-size',
    canEdit && 'studio-token-row--editable',
  ].filter(Boolean).join(' ')

  return React.createElement('li', { className, key }, [
    React.createElement('div', { className: 'studio-token-main', key: 'main' }, [
      isColor && React.createElement('span', {
        className: 'studio-color-chip',
        style: { backgroundColor: safeColor },
        'aria-hidden': 'true',
        key: 'chip',
      }),
      React.createElement('span', { className: 'studio-token-label', key: 'label' }, [
        React.createElement('span', { className: 'studio-token-key', key: 'key' }, key),
        canEdit && React.createElement('span', { className: 'studio-token-role', key: 'role' },
          canEditColor
            ? COLOR_TOKEN_ROLES[key]
            : canEditRadius
              ? RADIUS_TOKEN_ROLES[key]
              : canEditSpace
                ? SPACE_TOKEN_ROLES[key]
                : canEditSize
                  ? SIZE_TOKEN_ROLES[key]
                  : FONT_SIZE_TOKEN_ROLES[key],
        ),
      ]),
    ]),
    canEditColor
      ? React.createElement('span', { className: 'studio-color-control', key: 'control' }, [
        React.createElement('input', {
          className: 'studio-color-input',
          type: 'color',
          value: safeColor,
          'aria-label': `${key} の色`,
          onChange: (event) => onColorChange(key, event.target.value),
          key: 'input',
        }),
        React.createElement('code', { className: 'studio-token-value', key: 'value' }, safeColor),
      ])
      : canEditRadius
        ? React.createElement('span', { className: 'studio-radius-control', key: 'control' }, [
          React.createElement('input', {
            className: 'studio-radius-range',
            type: 'range',
            min: RADIUS_MIN,
            max: RADIUS_MAX,
            step: 1,
            value: safeRadiusNumber,
            'aria-label': `${key} の角丸`,
            onChange: (event) => onRadiusChange(key, event.target.value),
            key: 'range',
          }),
          React.createElement('input', {
            className: 'studio-radius-number',
            type: 'number',
            min: RADIUS_MIN,
            max: RADIUS_MAX,
            step: 1,
            value: safeRadiusNumber,
            'aria-label': `${key} の角丸数値`,
            onChange: (event) => onRadiusChange(key, event.target.value),
            key: 'number',
          }),
          React.createElement('code', { className: 'studio-token-value', key: 'value' }, safeRadiusValue),
        ])
        : canEditSpace
          ? React.createElement('span', { className: 'studio-space-control', key: 'control' }, [
            React.createElement('input', {
              className: 'studio-space-range',
              type: 'range',
              min: SPACE_MIN,
              max: SPACE_MAX,
              step: 1,
              value: safeSpaceNumber,
              'aria-label': `${key} の余白`,
              onChange: (event) => onSpaceChange(key, event.target.value),
              key: 'range',
            }),
            React.createElement('input', {
              className: 'studio-space-number',
              type: 'number',
              min: SPACE_MIN,
              max: SPACE_MAX,
              step: 1,
              value: safeSpaceNumber,
              'aria-label': `${key} の余白数値`,
              onChange: (event) => onSpaceChange(key, event.target.value),
              key: 'number',
            }),
            React.createElement('code', { className: 'studio-token-value', key: 'value' }, safeSpaceValue),
          ])
          : canEditSize
            ? React.createElement('span', { className: 'studio-size-control', key: 'control' }, [
              React.createElement('input', {
                className: 'studio-size-range',
                type: 'range',
                min: SIZE_MIN,
                max: SIZE_MAX,
                step: 1,
                value: safeSizeNumber,
                'aria-label': `${key} の高さ`,
                onChange: (event) => onSizeChange(key, event.target.value),
                key: 'range',
              }),
              React.createElement('input', {
                className: 'studio-size-number',
                type: 'number',
                min: SIZE_MIN,
                max: SIZE_MAX,
                step: 1,
                value: safeSizeNumber,
                'aria-label': `${key} の高さ数値`,
                onChange: (event) => onSizeChange(key, event.target.value),
                key: 'number',
              }),
              React.createElement('code', { className: 'studio-token-value', key: 'value' }, safeSizeValue),
            ])
            : canEditFontSize
              ? React.createElement('span', { className: 'studio-font-size-control', key: 'control' }, [
                React.createElement('input', {
                  className: 'studio-font-size-range',
                  type: 'range',
                  min: getFontSizeLimit(key).min,
                  max: getFontSizeLimit(key).max,
                  step: 1,
                  value: safeFontSizeNumber,
                  'aria-label': `${key} の文字サイズ`,
                  onChange: (event) => onFontSizeChange(key, event.target.value),
                  key: 'range',
                }),
                React.createElement('input', {
                  className: 'studio-font-size-number',
                  type: 'number',
                  min: getFontSizeLimit(key).min,
                  max: getFontSizeLimit(key).max,
                  step: 1,
                  value: safeFontSizeNumber,
                  'aria-label': `${key} の文字サイズ数値`,
                  onChange: (event) => onFontSizeChange(key, event.target.value),
                  key: 'number',
                }),
                React.createElement('code', { className: 'studio-token-value', key: 'value' }, safeFontSizeValue),
              ])
      : React.createElement('code', { className: 'studio-token-value', key: 'value' }, String(value)),
  ])
}

function renderCategory(
  category,
  values,
  onColorChange,
  onRadiusChange,
  onSpaceChange,
  onSizeChange,
  onFontSizeChange,
) {
  const entries = category === 'color'
    ? getOrderedColorEntries(values)
    : category === 'radius'
      ? getOrderedRadiusEntries(values)
      : category === 'space'
        ? getOrderedSpaceEntries(values)
        : category === 'size'
          ? getOrderedSizeEntries(values)
          : category === 'fontSize'
            ? getOrderedFontSizeEntries(values)
            : Object.entries(values || {})

  return React.createElement('section', { className: 'studio-token-group', key: category }, [
    React.createElement('h2', { key: 'heading' }, CATEGORY_LABELS[category] || category),
    React.createElement('ul', { className: 'studio-token-list', key: 'list' },
      entries.map(([key, value]) => renderTokenRow(
        category,
        key,
        value,
        onColorChange,
        onRadiusChange,
        onSpaceChange,
        onSizeChange,
        onFontSizeChange,
      )),
    ),
  ])
}

export default function StudioPanel() {
  const [{ theme, hasSavedTheme }, setPanelState] = useState(createPanelState)
  const [feedbackStatus, setFeedbackStatus] = useState(null)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const handleColorChange = useCallback((tokenName, value) => {
    setFeedbackStatus(null)
    setPanelState((currentState) => {
      const safeColor = getSafeHexColor(value, currentState.theme.color[tokenName])
      return {
        ...currentState,
        theme: {
          ...currentState.theme,
          color: {
            ...currentState.theme.color,
            [tokenName]: safeColor,
          },
        },
      }
    })
  }, [])

  const handleRadiusChange = useCallback((tokenName, value) => {
    setFeedbackStatus(null)
    setPanelState((currentState) => {
      const safeRadius = getSafePixelRadius(value, currentState.theme.radius[tokenName])
      return {
        ...currentState,
        theme: {
          ...currentState.theme,
          radius: {
            ...currentState.theme.radius,
            [tokenName]: safeRadius,
          },
        },
      }
    })
  }, [])

  const handleSpaceChange = useCallback((tokenName, value) => {
    setFeedbackStatus(null)
    setPanelState((currentState) => {
      const currentSpace = isPlainObject(currentState.theme.space) ? currentState.theme.space : defaultTheme.space
      const safeSpace = getSafePixelSpace(value, currentSpace[tokenName])
      return {
        ...currentState,
        theme: {
          ...currentState.theme,
          space: {
            ...currentSpace,
            [tokenName]: safeSpace,
          },
        },
      }
    })
  }, [])

  const handleSizeChange = useCallback((tokenName, value) => {
    setFeedbackStatus(null)
    setPanelState((currentState) => {
      const currentSize = isPlainObject(currentState.theme.size) ? currentState.theme.size : defaultTheme.size
      const safeSize = getSafePixelSize(value, currentSize[tokenName])
      return {
        ...currentState,
        theme: {
          ...currentState.theme,
          size: {
            ...currentSize,
            [tokenName]: safeSize,
          },
        },
      }
    })
  }, [])

  const handleFontSizeChange = useCallback((tokenName, value) => {
    setFeedbackStatus(null)
    setPanelState((currentState) => {
      const currentFontSize = isPlainObject(currentState.theme.fontSize)
        ? currentState.theme.fontSize
        : defaultTheme.fontSize
      const safeFontSize = getSafePixelFontSize(value, currentFontSize[tokenName], tokenName)
      return {
        ...currentState,
        theme: {
          ...currentState.theme,
          fontSize: {
            ...currentFontSize,
            [tokenName]: safeFontSize,
          },
        },
      }
    })
  }, [])

  const handleSaveTheme = useCallback(() => {
    const safeTheme = sanitizeStudioTheme(theme)
    const succeeded = saveTheme(safeTheme)

    setFeedbackStatus(succeeded ? 'save-success' : 'save-error')
    if (succeeded) {
      setPanelState((currentState) => ({
        ...currentState,
        theme: safeTheme,
        hasSavedTheme: true,
      }))
    }
  }, [theme])

  const handleResetTheme = useCallback(() => {
    const succeeded = resetTheme()

    if (succeeded) {
      const defaultPanelTheme = sanitizeStudioTheme(defaultTheme)
      applyTheme(defaultTheme)
      setPanelState({
        theme: defaultPanelTheme,
        hasSavedTheme: false,
      })
    }

    setFeedbackStatus(succeeded ? 'reset-success' : 'reset-error')
  }, [])

  const handleCopyThemeJson = useCallback(async () => {
    try {
      const themeJson = JSON.stringify(sanitizeStudioTheme(theme), null, 2)
      const succeeded = await copyTextToClipboard(themeJson)
      setFeedbackStatus(succeeded ? 'copy-success' : 'copy-error')
    } catch {
      setFeedbackStatus('copy-error')
    }
  }, [theme])

  const feedbackMessage = {
    'save-success': '保存しました',
    'save-error': '保存できませんでした',
    'reset-success': '初期テーマに戻しました',
    'reset-error': 'Resetできませんでした',
    'copy-success': 'JSONをコピーしました',
    'copy-error': 'JSONをコピーできませんでした',
  }[feedbackStatus] || ''
  const isFeedbackSuccess = feedbackStatus?.endsWith('success')
  const isFeedbackError = feedbackStatus?.endsWith('error')

  // 保存・Reset・JSONコピーをStudio内だけで扱い、本体画面には影響させない
  return React.createElement('section', { className: 'studio-panel' }, [
    React.createElement('div', { className: 'studio-panel-head', key: 'head' }, [
      React.createElement('p', { className: 'studio-eyebrow', key: 'eyebrow' }, 'Kaishuru UI Studio'),
      React.createElement('h1', { key: 'title' }, 'Theme tokens'),
      React.createElement('p', { className: 'studio-lead', key: 'lead' }, '重要な色だけを一時的に調整できます。'),
      React.createElement('span', { className: 'studio-panel-source', key: 'source' },
        hasSavedTheme ? '保存済みテーマ + defaultTheme' : 'defaultTheme',
      ),
      React.createElement('div', { className: 'studio-save-row', key: 'save-row' }, [
        React.createElement('button', {
          className: 'btn btn-primary studio-save-button',
          type: 'button',
          onClick: handleSaveTheme,
          key: 'button',
        }, '保存'),
        React.createElement('button', {
          className: 'btn btn-secondary studio-save-button',
          type: 'button',
          onClick: handleResetTheme,
          key: 'reset',
        }, 'Reset'),
        React.createElement('button', {
          className: 'btn btn-secondary studio-save-button',
          type: 'button',
          onClick: handleCopyThemeJson,
          key: 'copy',
        }, 'JSONコピー'),
        React.createElement('span', {
          className: [
            'studio-save-status',
            isFeedbackSuccess && 'studio-save-status--success',
            isFeedbackError && 'studio-save-status--error',
          ].filter(Boolean).join(' '),
          'aria-live': 'polite',
          key: 'status',
        }, feedbackMessage),
      ]),
    ]),
    ...Object.keys(CATEGORY_LABELS).map((category) => renderCategory(
      category,
      theme[category],
      handleColorChange,
      handleRadiusChange,
      handleSpaceChange,
      handleSizeChange,
      handleFontSizeChange,
    )),
  ])
}
