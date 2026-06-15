import React from 'react'

const STATUS_LABELS = {
  unpaid: '未払い',
  reported: '確認待ち',
  confirmed: '確認済み',
}

function getSafeStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_LABELS, status) ? status : 'unknown'
}

export default function StatusBadge({ status, children, className = '', ...props }) {
  const safeStatus = getSafeStatus(status)
  const label = children ?? STATUS_LABELS[safeStatus] ?? '状態不明'
  const classNames = ['status-badge', `badge-${safeStatus}`, className].filter(Boolean).join(' ')

  // 既存の status-badge CSS を使いながら、状態ごとの見た目を一箇所に集める
  return React.createElement('span', { className: classNames, ...props }, label)
}
