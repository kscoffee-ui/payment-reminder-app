import React, { useState } from 'react'
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  JapaneseYen,
  LayoutDashboard,
  Link2,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import kaishuruLogo from '../../assets/kaishuru-logo.png'
import KaishuruButton from '../../components/kaishuru/KaishuruButton'
import KaishuruCard from '../../components/kaishuru/KaishuruCard'
import StatusBadge from '../../components/kaishuru/StatusBadge'
import { studioSampleEvent, studioSampleMembers } from './sampleData'

const PREVIEW_TABS = [
  { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { id: 'members', label: '参加者一覧', icon: Users },
  { id: 'settings', label: '設定', icon: Settings },
]

const PAYMENT_LABELS = {
  cash: '現金回収',
  paypay: 'PayPay',
  bank: '銀行振込',
  other: 'その他',
}

function formatMoney(value) {
  return `¥${Number(value || 0).toLocaleString('ja-JP')}`
}

function formatDate(value) {
  return value ? String(value).replaceAll('-', '/') : '日付未定'
}

function paymentLabel(method) {
  return PAYMENT_LABELS[method] || PAYMENT_LABELS.cash
}

function getStatusCounts(members) {
  return members.reduce((counts, member) => {
    const status = member.status || 'unpaid'
    return { ...counts, [status]: (counts[status] || 0) + 1 }
  }, { unpaid: 0, reported: 0, confirmed: 0 })
}

function PreviewHeader({ counts }) {
  return (
    <header className="app-header studio-preview-app-header">
      <img src={kaishuruLogo} alt="カイシュル" className="app-logo" />
      <div className="app-header__action">
        <button type="button" className="reports-bell-button" aria-label={`確認待ち ${counts.reported}件`}>
          <Bell size={25} strokeWidth={2.3} aria-hidden="true" />
          {counts.reported > 0 && <span className="reports-bell-badge">{counts.reported}</span>}
        </button>
      </div>
    </header>
  )
}

function DashboardPreview({ event, members, counts, confirmedRate }) {
  const total = members.length
  const unpaidMembers = members.filter((member) => member.status === 'unpaid')

  return (
    <>
      <KaishuruCard className="admin-event-card">
        <div className="admin-event-card__icon" aria-hidden="true">
          <Calendar size={22} strokeWidth={2} />
        </div>
        <div className="admin-event-card__body">
          <p className="admin-event-card__title">{event.title}</p>
          <p className="admin-event-card__meta">{formatDate(event.eventDate)} {formatMoney(event.amountPerPerson)}</p>
        </div>
        <ChevronRight size={20} className="admin-event-card__chevron" aria-hidden="true" />
      </KaishuruCard>

      <section className="dashboard-summary-section">
        <h2 className="dashboard-section-title">支払い状況サマリー</h2>
        <KaishuruCard as="div" className="dashboard-summary-card" padding="compact">
          <div className="dashboard-summary-top">
            <article className="dashboard-unpaid-focus">
              <span>未払い</span>
              <b className="dashboard-unpaid-count">
                <span className="dashboard-unpaid-number">{counts.unpaid}</span>
                <span className="dashboard-unpaid-unit">人</span>
              </b>
            </article>
            <div className="dashboard-summary-main">
              <div className="dashboard-summary-main-head">
                <p className="dashboard-summary-text">
                  <span className="dashboard-summary-number">{total}</span>
                  <span className="dashboard-summary-unit">人中</span>
                  <span className="dashboard-summary-number">{counts.confirmed}</span>
                  <span className="dashboard-summary-unit">人確認済み</span>
                </p>
                <p className="dashboard-summary-rate">
                  <span className="dashboard-summary-rate-value">{confirmedRate}</span>
                  <span className="dashboard-summary-rate-unit">%</span>
                </p>
              </div>
              <div className="admin-progress-bar">
                <div className="admin-progress-fill" style={{ width: `${confirmedRate}%` }} />
              </div>
              <p className="dashboard-summary-foot">{counts.confirmed} / {total}人</p>
            </div>
          </div>
          <div className="dashboard-kpi-grid">
            <article className="dashboard-kpi dashboard-kpi-total">
              <span className="dashboard-kpi-label"><Users size={15} />参加者</span>
              <b>{total}</b>
            </article>
            <article className="dashboard-kpi dashboard-kpi-reported">
              <span className="dashboard-kpi-label"><Clock3 size={15} />報告済み</span>
              <b>{counts.reported}</b>
            </article>
            <article className="dashboard-kpi dashboard-kpi-confirmed">
              <span className="dashboard-kpi-label"><CheckCircle2 size={15} />確認済み</span>
              <b>{counts.confirmed}</b>
            </article>
          </div>
        </KaishuruCard>
      </section>

      <KaishuruCard className="dashboard-unpaid-list-card">
        <div className="dashboard-card-head">
          <h2>未払い者</h2>
          <span className="dashboard-link-text">すべて見る</span>
        </div>
        {unpaidMembers.length > 0 ? (
          <ul className="dashboard-unpaid-preview">
            {unpaidMembers.slice(0, 3).map((member) => (
              <li className="dashboard-unpaid-row" key={member.id}>
                <span className="dashboard-unpaid-avatar" aria-hidden="true">{member.name.slice(0, 1)}</span>
                <span className="dashboard-unpaid-name">{member.name}</span>
                <StatusBadge status="unpaid" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="sub">未払い者はいません</p>
        )}
        <div className="dashboard-line-inline">
          <KaishuruButton variant="line" className="btn-lg line-reminder-button" disabled={unpaidMembers.length === 0}>
            <span className="line-reminder-icon" aria-hidden="true">LINE</span>
            <span className="line-reminder-text">
              <span className="line-reminder-title">LINEで催促</span>
              <span className="line-reminder-subtitle">未払い者にまとめてメッセージを送る</span>
            </span>
          </KaishuruButton>
        </div>
      </KaishuruCard>
    </>
  )
}

function MembersPreview({ event, members }) {
  return (
    <section className="studio-preview-pane studio-preview-members">
      <h1 className="participants-title">参加者一覧</h1>
      <ul className="member-list studio-member-list">
        {members.map((member) => (
          <li className={`member-list-item member-list-item--${member.status}`} key={member.id}>
            <div className="member-list-row studio-member-row">
              <span className="member-avatar" aria-hidden="true">{member.name?.slice(0, 1) || '?'}</span>
              <span className="member-row-main">
                <span className="member-row-name">{member.name || '名前未設定'}</span>
                <span className="member-row-updated">
                  {formatMoney(event.amountPerPerson)} / {paymentLabel(member.paymentMethod || event.paymentMethod)}
                </span>
              </span>
              <span className="studio-member-actions">
                <StatusBadge status={member.status} className="member-status-badge" />
                {member.status === 'reported' && (
                  <KaishuruButton variant="primary" className="studio-member-confirm-button">
                    確認する
                  </KaishuruButton>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SettingsPreview({ event }) {
  const adminUrl = event.adminUrl || '/admin/demo-event?token=admin-demo'
  const joinUrl = event.joinUrl || '/join/demo-event?token=join-demo'

  return (
    <section className="studio-preview-pane studio-preview-settings">
      <h1 className="settings-page-title">設定 / イベント情報</h1>

      <KaishuruCard as="div" className="settings-card settings-summary-card studio-settings-card">
        <div className="settings-summary-grid">
          <article className="settings-summary-item">
            <p className="settings-summary-label">
              <span className="settings-summary-icon" aria-hidden="true"><FileText size={20} strokeWidth={2} /></span>
              イベント名
            </p>
            <b>{event.title}</b>
          </article>
          <article className="settings-summary-item">
            <p className="settings-summary-label">
              <span className="settings-summary-icon" aria-hidden="true"><Calendar size={20} strokeWidth={2} /></span>
              日付
            </p>
            <b>{formatDate(event.eventDate)}</b>
          </article>
          <article className="settings-summary-item">
            <p className="settings-summary-label">
              <span className="settings-summary-icon" aria-hidden="true"><JapaneseYen size={20} strokeWidth={2} /></span>
              会費
            </p>
            <b>{formatMoney(event.amountPerPerson)}</b>
          </article>
          <article className="settings-summary-item">
            <p className="settings-summary-label">
              <span className="settings-summary-icon" aria-hidden="true"><Wallet size={20} strokeWidth={2} /></span>
              支払い
            </p>
            <b>{paymentLabel(event.paymentMethod)}</b>
          </article>
        </div>
      </KaishuruCard>

      <KaishuruCard as="div" className="settings-card settings-guide-card studio-settings-card">
        <h3>
          <span className="settings-guide-icon" aria-hidden="true"><Wallet size={20} strokeWidth={2} /></span>
          支払い方法の案内
        </h3>
        <p>{event.paymentInfo}</p>
        {event.memo && <p className="sub">{event.memo}</p>}
      </KaishuruCard>

      <KaishuruCard as="div" className="settings-card participant-share-card studio-settings-card">
        <h3>
          <span className="participant-share-icon" aria-hidden="true"><UserPlus size={20} strokeWidth={2} /></span>
          URL共有
        </h3>
        <p className="sub">幹事用URLと参加者用URLの見た目確認用モックです。</p>
        <div className="studio-url-list">
          <p className="studio-url-row">
            <span><Link2 size={15} aria-hidden="true" />幹事用URL</span>
            <code>{adminUrl}</code>
          </p>
          <p className="studio-url-row">
            <span><Link2 size={15} aria-hidden="true" />参加者用URL</span>
            <code>{joinUrl}</code>
          </p>
        </div>
        <div className="share-actions studio-share-actions">
          <KaishuruButton variant="secondary" className="studio-share-button">幹事用URLを共有</KaishuruButton>
          <KaishuruButton variant="primary" className="studio-share-button">参加者用URLを共有</KaishuruButton>
        </div>
      </KaishuruCard>
    </section>
  )
}

export default function StudioPreview({
  event = studioSampleEvent,
  members = studioSampleMembers,
} = {}) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const counts = getStatusCounts(members)
  const total = members.length
  const confirmedRate = total ? Math.round((counts.confirmed / total) * 100) : 0

  // Firestore ではなく sampleData の状態だけで、本体adminに近いプレビューを描く
  return (
    <section className="studio-preview-phone" aria-label="スマホプレビュー">
      <div className="studio-preview-scroll">
        <PreviewHeader counts={counts} />
        {activeTab === 'dashboard' && (
          <DashboardPreview event={event} members={members} counts={counts} confirmedRate={confirmedRate} />
        )}
        {activeTab === 'members' && <MembersPreview event={event} members={members} />}
        {activeTab === 'settings' && <SettingsPreview event={event} />}
      </div>

      <nav className="studio-preview-bottom-tabs" role="tablist" aria-label="スマホプレビュー画面切り替え">
        {PREVIEW_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              type="button"
              className={`studio-preview-tab ${isActive ? 'studio-preview-tab--active' : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              key={tab.id}
            >
              <Icon size={19} strokeWidth={2.4} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </section>
  )
}
