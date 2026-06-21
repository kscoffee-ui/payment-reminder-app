import React from 'react'

const CARD_VARIANTS = {
  default: 'default',
  subtle: 'subtle',
  warning: 'warning',
}

const CARD_PADDINGS = {
  default: 'default',
  compact: 'compact',
}

function getSafeValue(value, allowedValues, fallback) {
  return Object.prototype.hasOwnProperty.call(allowedValues, value) ? value : fallback
}

export default function KaishuruCard({
  as = 'section',
  variant = 'default',
  padding = 'default',
  className = '',
  children,
  ...props
}) {
  const safeVariant = getSafeValue(variant, CARD_VARIANTS, 'default')
  const safePadding = getSafeValue(padding, CARD_PADDINGS, 'default')
  const Element = typeof as === 'string' ? as : 'section'
  const classNames = [
    'card',
    'kaishuru-card',
    `kaishuru-card--${safeVariant}`,
    `kaishuru-card--padding-${safePadding}`,
    className,
  ].filter(Boolean).join(' ')

  // 既存の .card CSS を使いながら、将来の Studio で調整しやすい入口にする
  return React.createElement(Element, { className: classNames, ...props }, children)
}
