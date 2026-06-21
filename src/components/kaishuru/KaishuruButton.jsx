import React from 'react'

const VARIANT_CLASS_NAMES = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  line: 'btn-line',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
  confirm: 'btn-confirm',
}

function getSafeVariant(variant) {
  return Object.prototype.hasOwnProperty.call(VARIANT_CLASS_NAMES, variant) ? variant : 'primary'
}

export default function KaishuruButton({
  variant = 'primary',
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const safeVariant = getSafeVariant(variant)
  const classNames = [
    'kaishuru-button',
    `kaishuru-button--${safeVariant}`,
    'btn',
    VARIANT_CLASS_NAMES[safeVariant],
    className,
  ].filter(Boolean).join(' ')

  // button の基本propsはそのまま渡し、既存画面の挙動を変えない
  return React.createElement('button', { type, className: classNames, ...props }, children)
}
