import React, { useCallback, useEffect, useState } from 'react'
import { applyTheme } from '../../theme/applyTheme'
import { defaultTheme } from '../../theme/defaultTheme'
import { loadTheme, resetTheme, saveTheme } from '../../theme/themeStorage'

const NAVIGATION_CATEGORY = 'headerNavigation'

const CATEGORY_LABELS = {
  color: 'Color',
  [NAVIGATION_CATEGORY]: 'ヘッダー・ナビゲーション',
  radius: 'Radius',
  space: 'Space',
  fontSize: 'Font size',
  size: 'Size',
  shadow: 'Shadow',
}

const DEFAULT_OPEN_CATEGORIES = Object.fromEntries(
  Object.keys(CATEGORY_LABELS).map((category) => [category, category === 'color']),
)

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
  'headerIcon',
  'notificationBadge',
  'tabActive',
  'tabInactive',
  'headerBorder',
]

const EDITABLE_RADIUS_TOKENS = ['card', 'control']
const RADIUS_MIN = 0
const RADIUS_MAX = 32

const EDITABLE_SPACE_TOKENS = ['cardY', 'cardX', 'headerX', 'headerY', 'headerGap']
const SPACE_MIN = 8
const SPACE_MAX = 32
const SPACE_LIMITS = {
  headerX: { min: 12, max: 28 },
  headerY: { min: 8, max: 24 },
  headerGap: { min: 8, max: 24 },
}

const EDITABLE_SIZE_TOKENS = [
  'buttonMinHeight',
  'lineButtonMinHeight',
  'headerIcon',
  'headerAction',
  'notificationDot',
]
const SIZE_MIN = 40
const SIZE_MAX = 64
const SIZE_LIMITS = {
  headerIcon: { min: 16, max: 28 },
  headerAction: { min: 36, max: 52 },
  notificationDot: { min: 5, max: 12 },
}

const EDITABLE_FONT_SIZE_TOKENS = ['badge', 'button']
const FONT_SIZE_LIMITS = {
  badge: { min: 10, max: 16, defaultValue: 12 },
  button: { min: 13, max: 18, defaultValue: 16 },
}

const EDITABLE_SHADOW_TOKENS = ['card', 'subtle']
const SHADOW_MIN = 0
const SHADOW_MAX = 24
const SHADOW_DEFAULT_STRENGTH = {
  card: 10,
  subtle: 4,
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
  headerIcon: 'ヘッダー操作アイコン',
  notificationBadge: '通知ドット',
  tabActive: '下タブの選択中',
  tabInactive: '下タブの非選択',
  headerBorder: 'ヘッダー / 下タブの区切り線',
}

const RADIUS_TOKEN_ROLES = {
  card: 'カード角丸',
  control: 'ボタン / 入力欄の角丸',
}

const SPACE_TOKEN_ROLES = {
  cardY: 'カード上下余白',
  cardX: 'カード左右余白',
  headerX: 'ヘッダー左右余白',
  headerY: 'ヘッダー上下余白',
  headerGap: 'タイトルと操作ボタンの間隔',
}

const SIZE_TOKEN_ROLES = {
  buttonMinHeight: '通常ボタンの最小高さ',
  lineButtonMinHeight: 'LINE催促ボタンの最小高さ',
  headerIcon: 'ベルなどのアイコン表示サイズ',
  headerAction: 'ベルボタンのタップ領域',
  notificationDot: '通知ドットの大きさ',
}

const FONT_SIZE_TOKEN_ROLES = {
  badge: 'StatusBadgeの文字サイズ',
  button: 'KaishuruButton / 主要ボタンの文字サイズ',
}

const SHADOW_TOKEN_ROLES = {
  card: '通常カードの影',
  subtle: '控えめな影',
}

const HEADER_NAVIGATION_SECTIONS = [
  {
    title: 'ヘッダー余白',
    tokens: [
      { category: 'space', key: 'headerX' },
      { category: 'space', key: 'headerY' },
      { category: 'space', key: 'headerGap' },
    ],
  },
  {
    title: 'アイコン・タップ領域',
    tokens: [
      { category: 'size', key: 'headerIcon' },
      { category: 'size', key: 'headerAction' },
      { category: 'size', key: 'notificationDot' },
    ],
  },
  {
    title: '色',
    tokens: [
      { category: 'color', key: 'headerIcon' },
      { category: 'color', key: 'notificationBadge' },
      { category: 'color', key: 'tabActive' },
      { category: 'color', key: 'tabInactive' },
      { category: 'color', key: 'headerBorder' },
    ],
  },
]

const HEADER_NAVIGATION_TOKENS_BY_CATEGORY = HEADER_NAVIGATION_SECTIONS
  .flatMap((section) => section.tokens)
  .reduce((tokensByCategory, token) => {
    return {
      ...tokensByCategory,
      [token.category]: [...(tokensByCategory[token.category] || []), token.key],
    }
  }, {})

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

function isHeaderNavigationToken(category, key) {
  return Boolean(HEADER_NAVIGATION_TOKENS_BY_CATEGORY[category]?.includes(key))
}

function getSpaceLimit(tokenName) {
  return SPACE_LIMITS[tokenName] || { min: SPACE_MIN, max: SPACE_MAX }
}

function getSizeLimit(tokenName) {
  return SIZE_LIMITS[tokenName] || { min: SIZE_MIN, max: SIZE_MAX }
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

function getSafeSpaceNumber(value, fallback, tokenName) {
  const limit = getSpaceLimit(tokenName)
  const parsedValue = Number.parseFloat(value)
  const parsedFallback = Number.parseFloat(fallback)
  const fallbackValue = Number.isFinite(parsedFallback) ? parsedFallback : limit.min
  const sourceValue = Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  return Math.round(clampNumber(sourceValue, limit.min, limit.max))
}

function getSafePixelSpace(value, fallback, tokenName) {
  return `${getSafeSpaceNumber(value, fallback, tokenName)}px`
}

function getSafeSizeNumber(value, fallback, tokenName) {
  const limit = getSizeLimit(tokenName)
  const parsedValue = Number.parseFloat(value)
  const parsedFallback = Number.parseFloat(fallback)
  const fallbackValue = Number.isFinite(parsedFallback) ? parsedFallback : limit.min
  const sourceValue = Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  return Math.round(clampNumber(sourceValue, limit.min, limit.max))
}

function getSafePixelSize(value, fallback, tokenName) {
  return `${getSafeSizeNumber(value, fallback, tokenName)}px`
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

function getShadowDefaultStrength(tokenName) {
  return SHADOW_DEFAULT_STRENGTH[tokenName] ?? 0
}

function getShadowStrength(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return Number.NaN
  const normalized = value.trim()
  if (normalized === 'none') return 0
  if (/^\d+(\.\d+)?$/.test(normalized)) return Number.parseFloat(normalized)
  const firstPixelValue = normalized.match(/-?\d+(\.\d+)?px/)
  return firstPixelValue ? Number.parseFloat(firstPixelValue[0]) : Number.NaN
}

function getSafeShadowStrength(value, fallback, tokenName) {
  const parsedValue = getShadowStrength(value)
  const parsedFallback = getShadowStrength(fallback)
  const fallbackValue = Number.isFinite(parsedFallback) ? parsedFallback : getShadowDefaultStrength(tokenName)
  const sourceValue = Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  return Math.round(clampNumber(sourceValue, SHADOW_MIN, SHADOW_MAX))
}

function buildShadowValue(tokenName, strength) {
  if (strength <= 0) return 'none'
  const blur = strength * 3
  const opacity = tokenName === 'subtle'
    ? Math.min(8, Math.max(1, Math.round(strength)))
    : Math.min(12, Math.max(1, Math.round(strength * 0.7)))
  return `0 ${strength}px ${blur}px rgb(15 23 42 / ${opacity}%)`
}

function getSafeShadowValue(tokenName, value) {
  const defaultValue = defaultTheme.shadow[tokenName]
  if (value === defaultValue) return defaultValue
  const strength = getSafeShadowStrength(value, defaultValue, tokenName)
  return buildShadowValue(tokenName, strength)
}

function sanitizeStudioTheme(theme) {
  const color = isPlainObject(theme?.color) ? theme.color : {}
  const radius = isPlainObject(theme?.radius) ? theme.radius : {}
  const space = isPlainObject(theme?.space) ? theme.space : {}
  const fontSize = isPlainObject(theme?.fontSize) ? theme.fontSize : {}
  const size = isPlainObject(theme?.size) ? theme.size : {}
  const shadow = isPlainObject(theme?.shadow) ? theme.shadow : {}

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
          getSafePixelSpace(space[tokenName], defaultTheme.space[tokenName], tokenName),
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
          getSafePixelSize(size[tokenName], defaultTheme.size[tokenName], tokenName),
        ]),
      ),
    },
    shadow: {
      ...shadow,
      ...Object.fromEntries(
        EDITABLE_SHADOW_TOKENS.map((tokenName) => [
          tokenName,
          getSafeShadowValue(tokenName, shadow[tokenName]),
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

function isEditableShadowToken(category, key) {
  return category === 'shadow' && EDITABLE_SHADOW_TOKENS.includes(key)
}

function getOrderedColorEntries(colors) {
  const colorValues = isPlainObject(colors) ? colors : {}
  const entries = Object.entries(colorValues)
  const importantEntries = EDITABLE_COLOR_TOKENS
    .filter((key) => (
      Object.prototype.hasOwnProperty.call(colorValues, key)
      && !isHeaderNavigationToken('color', key)
    ))
    .map((key) => [key, colorValues[key]])
  const remainingEntries = entries.filter(([key]) => (
    !EDITABLE_COLOR_TOKENS.includes(key)
    && !isHeaderNavigationToken('color', key)
  ))
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
    .filter((key) => (
      Object.prototype.hasOwnProperty.call(spaceValues, key)
      && !isHeaderNavigationToken('space', key)
    ))
    .map((key) => [key, spaceValues[key]])
  const remainingEntries = entries.filter(([key]) => (
    !EDITABLE_SPACE_TOKENS.includes(key)
    && !isHeaderNavigationToken('space', key)
  ))
  return [...editableEntries, ...remainingEntries]
}

function getOrderedSizeEntries(size) {
  const sizeValues = isPlainObject(size) ? size : {}
  const entries = Object.entries(sizeValues)
  const editableEntries = EDITABLE_SIZE_TOKENS
    .filter((key) => (
      Object.prototype.hasOwnProperty.call(sizeValues, key)
      && !isHeaderNavigationToken('size', key)
    ))
    .map((key) => [key, sizeValues[key]])
  const remainingEntries = entries.filter(([key]) => (
    !EDITABLE_SIZE_TOKENS.includes(key)
    && !isHeaderNavigationToken('size', key)
  ))
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

function getOrderedShadowEntries(shadow) {
  const shadowValues = isPlainObject(shadow) ? shadow : {}
  const entries = Object.entries(shadowValues)
  const editableEntries = EDITABLE_SHADOW_TOKENS
    .filter((key) => Object.prototype.hasOwnProperty.call(shadowValues, key))
    .map((key) => [key, shadowValues[key]])
  const remainingEntries = entries.filter(([key]) => !EDITABLE_SHADOW_TOKENS.includes(key))
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
  onShadowChange,
  rowKey = key,
) {
  const isColor = category === 'color'
  const isRadius = category === 'radius'
  const isSpace = category === 'space'
  const isSize = category === 'size'
  const isFontSize = category === 'fontSize'
  const isShadow = category === 'shadow'
  const canEditColor = isEditableColorToken(category, key)
  const canEditRadius = isEditableRadiusToken(category, key)
  const canEditSpace = isEditableSpaceToken(category, key)
  const canEditSize = isEditableSizeToken(category, key)
  const canEditFontSize = isEditableFontSizeToken(category, key)
  const canEditShadow = isEditableShadowToken(category, key)
  const canEdit = canEditColor || canEditRadius || canEditSpace || canEditSize || canEditFontSize || canEditShadow
  const safeColor = isColor ? getSafeHexColor(value, defaultTheme.color[key]) : value
  const safeRadiusNumber = canEditRadius ? getSafeRadiusNumber(value, defaultTheme.radius[key]) : null
  const safeRadiusValue = canEditRadius ? `${safeRadiusNumber}px` : null
  const safeSpaceLimit = canEditSpace ? getSpaceLimit(key) : null
  const safeSpaceNumber = canEditSpace ? getSafeSpaceNumber(value, defaultTheme.space[key], key) : null
  const safeSpaceValue = canEditSpace ? `${safeSpaceNumber}px` : null
  const safeSizeLimit = canEditSize ? getSizeLimit(key) : null
  const safeSizeNumber = canEditSize ? getSafeSizeNumber(value, defaultTheme.size[key], key) : null
  const safeSizeValue = canEditSize ? `${safeSizeNumber}px` : null
  const safeFontSizeNumber = canEditFontSize
    ? getSafeFontSizeNumber(value, defaultTheme.fontSize[key], key)
    : null
  const safeFontSizeValue = canEditFontSize ? `${safeFontSizeNumber}px` : null
  const safeShadowStrength = canEditShadow
    ? getSafeShadowStrength(value, defaultTheme.shadow[key], key)
    : null
  const safeShadowValue = canEditShadow ? getSafeShadowValue(key, value) : null
  const className = [
    'studio-token-row',
    isColor && 'studio-token-row--color',
    isRadius && 'studio-token-row--radius',
    isSpace && 'studio-token-row--space',
    isSize && 'studio-token-row--size',
    isFontSize && 'studio-token-row--font-size',
    isShadow && 'studio-token-row--shadow',
    canEdit && 'studio-token-row--editable',
  ].filter(Boolean).join(' ')

  return React.createElement('li', { className, key: rowKey }, [
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
                  : canEditFontSize
                    ? FONT_SIZE_TOKEN_ROLES[key]
                    : SHADOW_TOKEN_ROLES[key],
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
              min: safeSpaceLimit.min,
              max: safeSpaceLimit.max,
              step: 1,
              value: safeSpaceNumber,
              'aria-label': `${key} の余白`,
              onChange: (event) => onSpaceChange(key, event.target.value),
              key: 'range',
            }),
            React.createElement('input', {
              className: 'studio-space-number',
              type: 'number',
              min: safeSpaceLimit.min,
              max: safeSpaceLimit.max,
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
                min: safeSizeLimit.min,
                max: safeSizeLimit.max,
                step: 1,
                value: safeSizeNumber,
                'aria-label': `${key} の高さ`,
                onChange: (event) => onSizeChange(key, event.target.value),
                key: 'range',
              }),
              React.createElement('input', {
                className: 'studio-size-number',
                type: 'number',
                min: safeSizeLimit.min,
                max: safeSizeLimit.max,
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
              : canEditShadow
                ? React.createElement('span', { className: 'studio-shadow-control', key: 'control' }, [
                  React.createElement('input', {
                    className: 'studio-shadow-range',
                    type: 'range',
                    min: SHADOW_MIN,
                    max: SHADOW_MAX,
                    step: 1,
                    value: safeShadowStrength,
                    'aria-label': `${key} の影の強さ`,
                    onChange: (event) => onShadowChange(key, event.target.value),
                    key: 'range',
                  }),
                  React.createElement('input', {
                    className: 'studio-shadow-number',
                    type: 'number',
                    min: SHADOW_MIN,
                    max: SHADOW_MAX,
                    step: 1,
                    value: safeShadowStrength,
                    'aria-label': `${key} の影の強さ数値`,
                    onChange: (event) => onShadowChange(key, event.target.value),
                    key: 'number',
                  }),
                  React.createElement('code', { className: 'studio-token-value', key: 'value' }, safeShadowValue),
                ])
    : React.createElement('code', { className: 'studio-token-value', key: 'value' }, String(value)),
  ])
}

function renderHeaderNavigationCategory(
  theme,
  isOpen,
  onToggleCategory,
  onColorChange,
  onRadiusChange,
  onSpaceChange,
  onSizeChange,
  onFontSizeChange,
  onShadowChange,
) {
  const entriesCount = HEADER_NAVIGATION_SECTIONS.reduce(
    (count, section) => count + section.tokens.length,
    0,
  )

  return React.createElement('section', {
    className: [
      'studio-token-group',
      'studio-token-group--navigation',
      isOpen && 'studio-token-group--open',
    ].filter(Boolean).join(' '),
    key: NAVIGATION_CATEGORY,
  }, [
    React.createElement('button', {
      className: 'studio-token-group-toggle',
      type: 'button',
      'aria-expanded': isOpen,
      onClick: () => onToggleCategory(NAVIGATION_CATEGORY),
      key: 'heading',
    }, [
      React.createElement('span', { className: 'studio-token-group-title', key: 'title' },
        CATEGORY_LABELS[NAVIGATION_CATEGORY],
      ),
      React.createElement('span', { className: 'studio-token-group-meta', key: 'meta' }, `${entriesCount}項目`),
      React.createElement('span', { className: 'studio-token-group-icon', 'aria-hidden': 'true', key: 'icon' },
        isOpen ? '-' : '+',
      ),
    ]),
    isOpen && React.createElement('div', { className: 'studio-navigation-token-sections', key: 'sections' },
      HEADER_NAVIGATION_SECTIONS.map((section) => (
        React.createElement('div', { className: 'studio-navigation-token-section', key: section.title }, [
          React.createElement('h2', { className: 'studio-navigation-token-heading', key: 'heading' }, section.title),
          React.createElement('ul', { className: 'studio-token-list', key: 'list' },
            section.tokens.map(({ category, key }) => renderTokenRow(
              category,
              key,
              theme?.[category]?.[key] ?? defaultTheme[category][key],
              onColorChange,
              onRadiusChange,
              onSpaceChange,
              onSizeChange,
              onFontSizeChange,
              onShadowChange,
              `${category}.${key}`,
            )),
          ),
        ])
      )),
    ),
  ])
}

function renderCategory(
  category,
  values,
  isOpen,
  onToggleCategory,
  onColorChange,
  onRadiusChange,
  onSpaceChange,
  onSizeChange,
  onFontSizeChange,
  onShadowChange,
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
            : category === 'shadow'
              ? getOrderedShadowEntries(values)
            : Object.entries(values || {})

  return React.createElement('section', {
    className: [
      'studio-token-group',
      isOpen && 'studio-token-group--open',
    ].filter(Boolean).join(' '),
    key: category,
  }, [
    React.createElement('button', {
      className: 'studio-token-group-toggle',
      type: 'button',
      'aria-expanded': isOpen,
      onClick: () => onToggleCategory(category),
      key: 'heading',
    }, [
      React.createElement('span', { className: 'studio-token-group-title', key: 'title' },
        CATEGORY_LABELS[category] || category,
      ),
      React.createElement('span', { className: 'studio-token-group-meta', key: 'meta' }, `${entries.length}項目`),
      React.createElement('span', { className: 'studio-token-group-icon', 'aria-hidden': 'true', key: 'icon' },
        isOpen ? '-' : '+',
      ),
    ]),
    isOpen && React.createElement('ul', { className: 'studio-token-list', key: 'list' },
      entries.map(([key, value]) => renderTokenRow(
        category,
        key,
        value,
        onColorChange,
        onRadiusChange,
        onSpaceChange,
        onSizeChange,
        onFontSizeChange,
        onShadowChange,
      )),
    ),
  ])
}

export default function StudioPanel() {
  const [{ theme, hasSavedTheme }, setPanelState] = useState(createPanelState)
  const [openCategories, setOpenCategories] = useState(DEFAULT_OPEN_CATEGORIES)
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
      const safeSpace = getSafePixelSpace(value, currentSpace[tokenName], tokenName)
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
      const safeSize = getSafePixelSize(value, currentSize[tokenName], tokenName)
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

  const handleShadowChange = useCallback((tokenName, value) => {
    setFeedbackStatus(null)
    setPanelState((currentState) => {
      const currentShadow = isPlainObject(currentState.theme.shadow) ? currentState.theme.shadow : defaultTheme.shadow
      const safeShadow = getSafeShadowValue(tokenName, value)
      return {
        ...currentState,
        theme: {
          ...currentState.theme,
          shadow: {
            ...currentShadow,
            [tokenName]: safeShadow,
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

  const handleToggleCategory = useCallback((category) => {
    setOpenCategories((currentState) => ({
      ...currentState,
      [category]: !currentState[category],
    }))
  }, [])

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
    ...Object.keys(CATEGORY_LABELS).map((category) => (
      category === NAVIGATION_CATEGORY
        ? renderHeaderNavigationCategory(
          theme,
          Boolean(openCategories[category]),
          handleToggleCategory,
          handleColorChange,
          handleRadiusChange,
          handleSpaceChange,
          handleSizeChange,
          handleFontSizeChange,
          handleShadowChange,
        )
        : renderCategory(
          category,
          theme[category],
          Boolean(openCategories[category]),
          handleToggleCategory,
          handleColorChange,
          handleRadiusChange,
          handleSpaceChange,
          handleSizeChange,
          handleFontSizeChange,
          handleShadowChange,
        )
    )),
  ])
}
