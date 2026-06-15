import React from 'react'
import { Bell, Calendar, CheckCircle2, ChevronRight, Clock3, Users } from 'lucide-react'
import kaishuruLogo from '../../assets/kaishuru-logo.png'
import KaishuruButton from '../../components/kaishuru/KaishuruButton'
import KaishuruCard from '../../components/kaishuru/KaishuruCard'
import StatusBadge from '../../components/kaishuru/StatusBadge'
import { studioSampleEvent, studioSampleMembers } from './sampleData'

function formatMoney(value) {
  return `¥${Number(value || 0).toLocaleString('ja-JP')}`
}

function getStatusCounts(members) {
  return members.reduce((counts, member) => {
    const status = member.status || 'unpaid'
    return { ...counts, [status]: (counts[status] || 0) + 1 }
  }, { unpaid: 0, reported: 0, confirmed: 0 })
}

export default function StudioPreview({
  event = studioSampleEvent,
  members = studioSampleMembers,
} = {}) {
  const counts = getStatusCounts(members)
  const total = members.length
  const confirmedRate = total ? Math.round((counts.confirmed / total) * 100) : 0
  const unpaidMembers = members.filter((member) => member.status === 'unpaid')

  // Firestore ではなく sampleData の状態だけで、本体adminに近いプレビューを描く
  return React.createElement('section', { className: 'studio-preview-phone', 'aria-label': 'スマホプレビュー' }, [
    React.createElement('header', { className: 'app-header studio-preview-app-header', key: 'header' }, [
      React.createElement('img', { src: kaishuruLogo, alt: 'カイシュル', className: 'app-logo', key: 'logo' }),
      React.createElement('div', { className: 'app-header__action', key: 'action' },
        React.createElement('button', { type: 'button', className: 'reports-bell-button', 'aria-label': `確認待ち ${counts.reported}件` }, [
          React.createElement(Bell, { size: 25, strokeWidth: 2.3, 'aria-hidden': 'true', key: 'icon' }),
          counts.reported > 0 && React.createElement('span', { className: 'reports-bell-badge', key: 'badge' }, counts.reported),
        ]),
      ),
    ]),
    React.createElement(KaishuruCard, { className: 'admin-event-card', key: 'event' }, [
      React.createElement('div', { className: 'admin-event-card__icon', 'aria-hidden': 'true', key: 'icon' },
        React.createElement(Calendar, { size: 22, strokeWidth: 2 }),
      ),
      React.createElement('div', { className: 'admin-event-card__body', key: 'body' }, [
        React.createElement('p', { className: 'admin-event-card__title', key: 'title' }, event.title),
        React.createElement('p', { className: 'admin-event-card__meta', key: 'meta' }, `${event.eventDate} ${formatMoney(event.amountPerPerson)}`),
      ]),
      React.createElement(ChevronRight, { size: 20, className: 'admin-event-card__chevron', 'aria-hidden': 'true', key: 'chevron' }),
    ]),
    React.createElement('section', { className: 'dashboard-summary-section', key: 'summary-section' }, [
      React.createElement('h2', { className: 'dashboard-section-title', key: 'heading' }, '支払い状況サマリー'),
      React.createElement(KaishuruCard, { as: 'div', className: 'dashboard-summary-card', padding: 'compact', key: 'card' }, [
        React.createElement('div', { className: 'dashboard-summary-top', key: 'top' }, [
          React.createElement('article', { className: 'dashboard-unpaid-focus', key: 'unpaid' }, [
            React.createElement('span', { key: 'label' }, '未払い'),
            React.createElement('b', { className: 'dashboard-unpaid-count', key: 'count' }, [
              React.createElement('span', { className: 'dashboard-unpaid-number', key: 'number' }, counts.unpaid),
              React.createElement('span', { className: 'dashboard-unpaid-unit', key: 'unit' }, '人'),
            ]),
          ]),
          React.createElement('div', { className: 'dashboard-summary-main', key: 'main' }, [
            React.createElement('div', { className: 'dashboard-summary-main-head', key: 'head' }, [
              React.createElement('p', { className: 'dashboard-summary-text', key: 'text' }, [
                React.createElement('span', { className: 'dashboard-summary-number', key: 'total' }, total),
                React.createElement('span', { className: 'dashboard-summary-unit', key: 'total-unit' }, '人中'),
                React.createElement('span', { className: 'dashboard-summary-number', key: 'confirmed' }, counts.confirmed),
                React.createElement('span', { className: 'dashboard-summary-unit', key: 'confirmed-unit' }, '人確認済み'),
              ]),
              React.createElement('p', { className: 'dashboard-summary-rate', key: 'rate' }, [
                React.createElement('span', { className: 'dashboard-summary-rate-value', key: 'value' }, confirmedRate),
                React.createElement('span', { className: 'dashboard-summary-rate-unit', key: 'unit' }, '%'),
              ]),
            ]),
            React.createElement('div', { className: 'admin-progress-bar', key: 'bar' },
              React.createElement('div', { className: 'admin-progress-fill', style: { width: `${confirmedRate}%` } }),
            ),
            React.createElement('p', { className: 'dashboard-summary-foot', key: 'foot' }, `${counts.confirmed} / ${total}人`),
          ]),
        ]),
        React.createElement('div', { className: 'dashboard-kpi-grid', key: 'kpis' }, [
          React.createElement('article', { className: 'dashboard-kpi dashboard-kpi-total', key: 'total' }, [
            React.createElement('span', { className: 'dashboard-kpi-label', key: 'label' }, [
              React.createElement(Users, { size: 15, key: 'icon' }),
              '参加者',
            ]),
            React.createElement('b', { key: 'value' }, total),
          ]),
          React.createElement('article', { className: 'dashboard-kpi dashboard-kpi-reported', key: 'reported' }, [
            React.createElement('span', { className: 'dashboard-kpi-label', key: 'label' }, [
              React.createElement(Clock3, { size: 15, key: 'icon' }),
              '報告済み',
            ]),
            React.createElement('b', { key: 'value' }, counts.reported),
          ]),
          React.createElement('article', { className: 'dashboard-kpi dashboard-kpi-confirmed', key: 'confirmed' }, [
            React.createElement('span', { className: 'dashboard-kpi-label', key: 'label' }, [
              React.createElement(CheckCircle2, { size: 15, key: 'icon' }),
              '確認済み',
            ]),
            React.createElement('b', { key: 'value' }, counts.confirmed),
          ]),
        ]),
      ]),
    ]),
    React.createElement(KaishuruCard, { className: 'dashboard-unpaid-list-card', key: 'unpaid-card' }, [
      React.createElement('div', { className: 'dashboard-card-head', key: 'head' }, [
        React.createElement('h2', { key: 'title' }, '未払い者'),
        React.createElement('span', { className: 'dashboard-link-text', key: 'link' }, 'すべて見る'),
      ]),
      React.createElement('ul', { className: 'dashboard-unpaid-preview', key: 'list' },
        unpaidMembers.slice(0, 3).map((member) => (
          React.createElement('li', { className: 'dashboard-unpaid-row', key: member.id }, [
            React.createElement('span', { className: 'dashboard-unpaid-avatar', 'aria-hidden': 'true', key: 'avatar' }, member.name.slice(0, 1)),
            React.createElement('span', { className: 'dashboard-unpaid-name', key: 'name' }, member.name),
            React.createElement(StatusBadge, { status: 'unpaid', key: 'status' }),
          ])
        )),
      ),
      React.createElement('div', { className: 'dashboard-line-inline', key: 'line-wrap' },
        React.createElement(KaishuruButton, { variant: 'line', className: 'btn-lg line-reminder-button', key: 'line' }, [
          React.createElement('span', { className: 'line-reminder-icon', 'aria-hidden': 'true', key: 'icon' }, 'LINE'),
          React.createElement('span', { className: 'line-reminder-text', key: 'text' }, [
            React.createElement('span', { className: 'line-reminder-title', key: 'title' }, 'LINEで催促'),
            React.createElement('span', { className: 'line-reminder-subtitle', key: 'subtitle' }, '未払い者にまとめてメッセージを送る'),
          ]),
        ]),
      ),
    ]),
  ])
}
