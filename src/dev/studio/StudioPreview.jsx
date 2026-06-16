import React, { useRef, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Info,
  JapaneseYen,
  LayoutDashboard,
  Megaphone,
  MoreVertical,
  Pencil,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
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

function formatUpdatedAt(member) {
  return `${member.updatedAtText || '6/15 23:34'} 更新`
}

function formatReportedAt(member) {
  return `${member.updatedAtText || '6/15 23:34'} 報告`
}

function getStatusCounts(members) {
  return members.reduce((counts, member) => {
    const status = member.status || 'unpaid'
    return { ...counts, [status]: (counts[status] || 0) + 1 }
  }, { unpaid: 0, reported: 0, confirmed: 0 })
}

function PreviewHeader({ counts, onReportsOpen, showReportsButton }) {
  return (
    <header className="app-header studio-preview-app-header">
      <img src={kaishuruLogo} alt="カイシュル" className="app-logo" />
      {showReportsButton && (
        <div className="app-header__action">
          <button
            type="button"
            className="reports-bell-button"
            aria-label={`確認待ち ${counts.reported}件`}
            onClick={onReportsOpen}
          >
            <Bell size={25} strokeWidth={2.3} aria-hidden="true" />
            {counts.reported > 0 && <span className="reports-bell-badge">{counts.reported}</span>}
          </button>
        </div>
      )}
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
    <section className="participants-screen studio-preview-members">
      <h1 className="participants-title">参加者一覧</h1>

      <label className="member-search">
        <Search size={19} strokeWidth={2.4} aria-hidden="true" />
        <input type="search" placeholder="名前で検索" readOnly />
      </label>

      <div className="status-pill-row member-filter-row" role="tablist" aria-label="参加者ステータスフィルター">
        <button type="button" className="status-pill pill-all pill-active">すべて</button>
        <button type="button" className="status-pill pill-unpaid">未払い</button>
        <button type="button" className="status-pill pill-reported">確認待ち</button>
        <button type="button" className="status-pill pill-confirmed">確認済み</button>
      </div>

      <ul className="member-list studio-member-list">
        {members.map((member) => (
          <li className={`member-list-item member-list-item--${member.status}`} key={member.id}>
            <div className="member-list-row studio-member-row">
              <span className="member-avatar" aria-hidden="true">{member.name?.slice(0, 1) || '?'}</span>
              <span className="member-row-main">
                <span className="member-row-name">{member.name || '名前未設定'}</span>
                <span className="member-row-updated">{formatUpdatedAt(member)}</span>
              </span>
              <span className="member-row-status-actions">
                <StatusBadge status={member.status} className="member-status-badge" />
              </span>
              <ChevronRight size={17} className="member-row-chevron" aria-hidden="true" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SettingsPreview({ event }) {
  return (
    <section className="admin-settings-screen studio-preview-settings">
      <h1 className="settings-page-title">設定 / イベント情報</h1>

      <div className="settings-card settings-summary-card studio-settings-card">
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
      </div>

      <div className="settings-card settings-guide-card studio-settings-card">
        <h3>
          <span className="settings-guide-icon" aria-hidden="true"><Megaphone size={20} strokeWidth={2} /></span>
          幹事からの案内
        </h3>
        <p>{event.paymentInfo}</p>
        {event.memo && <p className="sub">{event.memo}</p>}
      </div>

      <button type="button" className="btn btn-outline-primary btn-lg settings-edit-trigger">
        <Pencil size={20} strokeWidth={2} aria-hidden="true" />
        イベント情報を編集
      </button>

      <div className="settings-card participant-share-card studio-settings-card">
        <h3>
          <span className="participant-share-icon" aria-hidden="true"><UserPlus size={20} strokeWidth={2} /></span>
          参加者を追加する
        </h3>
        <p className="sub">LINEグループに送ると、参加者が自分で名前を入力して参加できます。</p>
        <div className="share-actions studio-share-actions">
          <KaishuruButton variant="line" className="studio-share-button">LINEで共有</KaishuruButton>
          <KaishuruButton variant="secondary" className="studio-share-button">
            <Share2 size={18} strokeWidth={2.2} aria-hidden="true" />
            その他のアプリで共有
          </KaishuruButton>
        </div>
      </div>
    </section>
  )
}

function ReportsInboxPreview({ event, members, onBack, onReportOpen }) {
  return (
    <section className="reports-inbox-screen studio-reports-screen">
      <div className="reports-ios-header">
        <button
          type="button"
          className="reports-ios-back-button"
          aria-label="ダッシュボードへ戻る"
          onClick={onBack}
        >
          <ArrowLeft size={19} strokeWidth={2.5} aria-hidden="true" />
          <span>戻る</span>
        </button>

        <div className="reports-ios-title-row">
          <h1>確認待ち一覧</h1>
          <span className="reports-count-chip">{members.length}人</span>
        </div>
        <p className="reports-ios-lead">支払い報告が届いています。内容を確認して「確認済み」にしてください。</p>
      </div>

      <div className="reports-filter-row">
        <label className="reports-search-field">
          <Search size={18} strokeWidth={2.4} aria-hidden="true" />
          <input type="search" placeholder="名前で検索" readOnly />
        </label>
        <div className="reports-sort-wrap studio-reports-sort-wrap">
          <button type="button" className="reports-sort-button">
            <SlidersHorizontal size={17} strokeWidth={2.4} aria-hidden="true" />
            <span>並び替え</span>
          </button>
        </div>
      </div>

      {members.length > 0 ? (
        <ul className="member-list reports-inbox-list studio-reports-list">
          {members.map((member) => (
            <li key={member.id} className="member-list-item member-list-item--reported reports-inbox-item">
              <details className="reports-inbox-button">
                <summary
                  className="member-list-row reports-member-row studio-reports-member-row"
                  onClick={(event) => {
                    event.preventDefault()
                    onReportOpen(member.id)
                  }}
                >
                  <span className="reports-member-avatar" aria-hidden="true">{member.name?.slice(0, 1) || '?'}</span>
                  <span className="reports-member-main">
                    <span className="reports-member-name">{member.name || '名前未設定'}</span>
                    <span className="reports-member-meta">{formatReportedAt(member)}</span>
                  </span>
                  <span className="reports-member-payment">
                    <span>{paymentLabel(member.paymentMethod || event.paymentMethod)}</span>
                    <span>{member.proofMemo ? 'メモあり' : 'メモなし'}</span>
                  </span>
                  <StatusBadge status="reported" className="reports-status-badge" />
                  <span className="reports-action-wrap">
                    <button
                      type="button"
                      className="reports-action-trigger"
                      aria-label={`${member.name || '名前未設定'}の詳細を開く`}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onReportOpen(member.id)
                      }}
                    >
                      <MoreVertical size={17} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </span>
                </summary>
                <div className="member-row-detail reports-member-detail">
                  <div className="member-detail-grid">
                    <p><span>金額</span><b>{formatMoney(event.amountPerPerson)}</b></p>
                    <p><span>支払い方法</span><b>{paymentLabel(member.paymentMethod || event.paymentMethod)}</b></p>
                    <p><span>状態</span><b>確認待ち</b></p>
                    <p><span>報告メモ</span><b>{member.proofMemo || 'なし'}</b></p>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <KaishuruCard as="div" className="reports-empty-card">
          <CheckCircle2 size={24} strokeWidth={2.2} aria-hidden="true" />
          <p>確認待ちの報告はありません。</p>
        </KaishuruCard>
      )}

      <div className="reports-helper-card">
        <div className="reports-helper-title">
          <Info size={17} strokeWidth={2.4} aria-hidden="true" />
          <span>確認のポイント</span>
        </div>
        <p>支払い方法・金額・メモを確認して、内容に問題がなければ「確認済み」にしてください。</p>
      </div>

      <button type="button" className="btn btn-lg reports-bulk-confirm-button" disabled={members.length === 0}>
        <Check size={20} strokeWidth={2.5} aria-hidden="true" />
        すべて確認済みにする
      </button>
    </section>
  )
}

function ReportDetailPreview({ event, member, onBack }) {
  return (
    <section className="report-detail-screen studio-report-detail-screen">
      <div className="reports-screen-header">
        <button type="button" className="reports-back-button" aria-label="確認待ち一覧へ戻る" onClick={onBack}>
          <ArrowLeft size={21} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <div className="reports-screen-title">
          <p>報告詳細</p>
          <h1>支払い確認</h1>
        </div>
      </div>

      {!member ? (
        <div className="card report-detail-card report-detail-processed">
          <h2>対象が見つかりません</h2>
          <p className="sub">確認待ち一覧に戻って、最新の報告を確認してください。</p>
          <KaishuruButton variant="secondary" className="btn-lg" onClick={onBack}>確認待ち一覧へ戻る</KaishuruButton>
        </div>
      ) : (
        <div className="card report-detail-card">
          <div className="report-detail-profile">
            <span className="reports-member-avatar reports-member-avatar--large" aria-hidden="true">{member.name?.slice(0, 1) || '?'}</span>
            <div>
              <h2>{member.name || '名前未設定'}</h2>
              <p className="sub">{formatUpdatedAt(member)}</p>
            </div>
            <StatusBadge status="reported" className="report-detail-status" />
          </div>

          <div className="report-detail-grid">
            <p><span>金額</span><b>{formatMoney(event.amountPerPerson)}</b></p>
            <p><span>支払い状態</span><b>確認待ち</b></p>
            <p><span>報告日時</span><b>{formatReportedAt(member)}</b></p>
            <p><span>支払い方法</span><b>{paymentLabel(member.paymentMethod || event.paymentMethod)}</b></p>
          </div>

          <div className="report-detail-memo">
            <span>報告メモ</span>
            <p>{member.proofMemo || 'なし'}</p>
          </div>

          {event.paymentInfo && (
            <div className="report-detail-memo studio-report-payment-info">
              <span>支払い案内</span>
              <p>{event.paymentInfo}</p>
            </div>
          )}

          <KaishuruButton variant="confirm" className="btn-lg report-confirm-button">
            確認する
          </KaishuruButton>
        </div>
      )}
    </section>
  )
}

export default function StudioPreview({
  event = studioSampleEvent,
  members = studioSampleMembers,
} = {}) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activeSubscreen, setActiveSubscreen] = useState(null)
  const [activeReportMemberId, setActiveReportMemberId] = useState('')
  const scrollRef = useRef(null)
  const counts = getStatusCounts(members)
  const total = members.length
  const confirmedRate = total ? Math.round((counts.confirmed / total) * 100) : 0
  const reportedMembers = members.filter((member) => member.status === 'reported')
  const activeReportMember = reportedMembers.find((member) => member.id === activeReportMemberId) || null

  function resetPreviewScroll() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }

  function switchPreviewTab(tabId) {
    setActiveTab(tabId)
    setActiveSubscreen(null)
    setActiveReportMemberId('')
    resetPreviewScroll()
  }

  function openReportsInbox() {
    setActiveTab('dashboard')
    setActiveSubscreen('reports')
    setActiveReportMemberId('')
    resetPreviewScroll()
  }

  function openReportDetail(memberId) {
    setActiveTab('dashboard')
    setActiveSubscreen('reportDetail')
    setActiveReportMemberId(memberId)
    resetPreviewScroll()
  }

  function backToReportsInbox() {
    setActiveTab('dashboard')
    setActiveSubscreen('reports')
    setActiveReportMemberId('')
    resetPreviewScroll()
  }

  function backToDashboard() {
    setActiveTab('dashboard')
    setActiveSubscreen(null)
    setActiveReportMemberId('')
    resetPreviewScroll()
  }

  // Firestore ではなく sampleData の状態だけで、本体adminに近いプレビューを描く
  return (
    <section className="studio-preview-phone" aria-label="スマホプレビュー">
      <div className="studio-preview-scroll" ref={scrollRef}>
        <PreviewHeader
          counts={counts}
          onReportsOpen={openReportsInbox}
          showReportsButton={activeTab === 'dashboard' && activeSubscreen !== 'reports'}
        />
        {activeSubscreen === 'reports' ? (
          <ReportsInboxPreview
            event={event}
            members={reportedMembers}
            onBack={backToDashboard}
            onReportOpen={openReportDetail}
          />
        ) : activeSubscreen === 'reportDetail' ? (
          <ReportDetailPreview event={event} member={activeReportMember} onBack={backToReportsInbox} />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardPreview event={event} members={members} counts={counts} confirmedRate={confirmedRate} />
            )}
            {activeTab === 'members' && <MembersPreview event={event} members={members} />}
            {activeTab === 'settings' && <SettingsPreview event={event} />}
          </>
        )}
      </div>

      <nav className="studio-preview-bottom-tabs" role="tablist" aria-label="スマホプレビュー画面切り替え">
        {PREVIEW_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeSubscreen ? tab.id === 'dashboard' : activeTab === tab.id

          return (
            <button
              type="button"
              className={`studio-preview-tab ${isActive ? 'studio-preview-tab--active' : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => switchPreviewTab(tab.id)}
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
