import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bell, Calendar, Check, CheckCircle2, ChevronRight, Clock3, FileText, Info, JapaneseYen, LayoutDashboard, Megaphone, MoreVertical, Pencil, Search, Settings, Share2, SlidersHorizontal, UserPlus, Users, Wallet } from 'lucide-react'
import './App.css'
import {
  confirmPayment,
  createEvent,
  getEvent,
  joinEvent,
  removeMember,
  reportPayment,
  returnReportToUnpaid,
  subscribeEvent,
  subscribeMember,
  subscribeMembers,
  updateEventInfo,
} from './lib/firestore'
import { buildReminderMessage, createLineShareUrl } from './lib/reminder'
import { clearMemberBinding, getAdminEvents, getMemberBinding, removeAdminEvent, saveAdminEvent, setMemberBinding } from './lib/storage'
import kaishuruLogo from './assets/kaishuru-logo.png'

function AppHeader({ children }) {
  return (
    <header className="app-header">
      <img src={kaishuruLogo} alt="カイシュル" className="app-logo" />
      {children && <div className="app-header__action">{children}</div>}
    </header>
  )
}

function parseRoute() {
  const [, root, eventId] = window.location.pathname.split('/')
  const token = new URLSearchParams(window.location.search).get('token') || ''

  if (root === 'admin' && eventId) return { mode: 'admin', eventId, token }
  if (root === 'join' && eventId) return { mode: 'join', eventId, token }
  return { mode: 'create', eventId: '', token: '' }
}

function move(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const DEFAULT_CASH_PAYMENT_INFO = '幹事に現金で直接渡してください'

function paymentLabel(method) {
  return { paypay: 'PayPay', cash: '現金', bank: '銀行振込', other: 'その他' }[method] || method
}

function statusLabel(status) {
  return {
    unpaid: '未払い',
    reported: '確認待ち',
    confirmed: '確認済み',
  }[status]
}

function formatDate(value) {
  if (!value) return '-'
  return value
}

function formatMoney(value) {
  return `¥${Number(value || 0).toLocaleString('ja-JP')}`
}

function formatUpdatedAt(value) {
  if (!value) return '更新日時なし'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return `更新: ${value}`
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 更新`
}

function formatReportedAt(value) {
  if (!value) return '報告日時なし'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return `報告: ${value}`
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 報告`
}

function dateTimeValue(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  const time = date.getTime()
  return Number.isNaN(time) ? 0 : time
}

function hasVisibleMemo(value) {
  const memo = value?.trim()
  return Boolean(memo && memo !== '-')
}

function buildJoinShareMessage(event, joinUrl) {
  const eventTitle = event?.title?.trim() || 'イベント'
  return `「${eventTitle}」の支払い確認です。
以下のURLから参加して、支払い後に報告してください。

${joinUrl || ''}`
}

function canUseNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

function openLineShare(message) {
  if (typeof window === 'undefined') return
  const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`
  window.open(lineShareUrl, '_blank', 'noopener,noreferrer')
}

function EventCreatePage() {
  const [form, setForm] = useState({
    title: '',
    eventDate: '',
    amountPerPerson: '',
    paymentMethod: 'cash',
    paymentInfo: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentAdminEvents, setRecentAdminEvents] = useState(() => getAdminEvents())

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.title.trim()) return setError('イベント名を入力してください。')
    if (!form.eventDate) return setError('日付を入力してください。')
    if (Number(form.amountPerPerson) < 1) return setError('1人あたりの金額は1円以上で入力してください。')
    setLoading(true)
    try {
      const created = await createEvent({
        title: form.title.trim(),
        eventDate: form.eventDate,
        amountPerPerson: Number(form.amountPerPerson),
        paymentMethod: 'cash',
        paymentInfo: form.paymentInfo.trim() || DEFAULT_CASH_PAYMENT_INFO,
        memo: '',
      })
      saveAdminEvent({
        eventId: created.eventId,
        adminToken: created.adminToken,
        title: form.title.trim(),
        eventDate: form.eventDate,
        amountPerPerson: Number(form.amountPerPerson),
        createdAt: new Date().toISOString(),
      })
      setRecentAdminEvents(getAdminEvents())
      const adminToken = encodeURIComponent(created.adminToken)
      const participantToken = encodeURIComponent(created.participantToken)
      move(`/admin/${created.eventId}?token=${adminToken}&created=1&ptoken=${participantToken}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container admin-shell">
      <AppHeader />
      {recentAdminEvents.length > 0 && (
        <section className="card recent-events-card">
          <h2>最近作成したイベント</h2>
          <div className="recent-events-list">
            {recentAdminEvents.map((event) => (
              <article key={event.eventId} className="recent-event-item">
                <div>
                  <p className="recent-event-title">{event.title || 'イベント名未設定'}</p>
                  <p className="sub">{formatDate(event.eventDate)}</p>
                  <p className="sub">1人あたり {formatMoney(event.amountPerPerson)}</p>
                </div>
                <div className="recent-event-actions">
                  <button className="btn btn-secondary recent-event-open" onClick={() => move(`/admin/${event.eventId}?token=${encodeURIComponent(event.adminToken)}`)}>
                    管理画面を開く
                  </button>
                  <button
                    className="btn btn-ghost-danger recent-event-remove"
                    onClick={() => {
                      removeAdminEvent(event.eventId)
                      setRecentAdminEvents(getAdminEvents())
                    }}
                  >
                    履歴から削除
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <form className="card form-card create-page-card" onSubmit={onSubmit}>
        <div className="section-title">
          <h1>未払い回収イベントを作成</h1>
          <p>まずはイベント情報だけ入力してください。参加者はあとからURLで自己登録します。</p>
        </div>

        <label className="field">
          <span>イベント名</span>
          <input placeholder="例）新歓飲み会" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>

        <label className="field">
          <span>日付</span>
          <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
        </label>

        <label className="field">
          <span>1人あたりの金額</span>
          <input type="number" min="1" placeholder="2500" value={form.amountPerPerson} onChange={(e) => setForm({ ...form, amountPerPerson: e.target.value })} />
        </label>

        <div className="field fixed-field">
          <span>支払い方法</span>
          <p className="fixed-field-value">現金回収</p>
          <p className="sub">参加者には、幹事へ現金で直接支払ったあとに報告してもらいます。</p>
        </div>

        <label className="field">
          <span>幹事からの案内</span>
          <p className="sub">例：当日受付で集めます / 飲み会の開始前に幹事へ渡してください</p>
          <textarea rows="3" placeholder="例：当日受付で集めます" value={form.paymentInfo} onChange={(e) => setForm({ ...form, paymentInfo: e.target.value })} />
        </label>

        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-lg" disabled={loading}>{loading ? '作成中...' : 'イベントを作成する'}</button>
      </form>
    </main>
  )
}

function CreatedScreen({ event, joinUrl, onContinue }) {
  const shareMessage = buildJoinShareMessage(event, joinUrl)
  const nativeShareAvailable = canUseNativeShare()
  const canShareJoinUrl = Boolean(joinUrl)

  const handleNativeShare = async () => {
    if (!canShareJoinUrl || !nativeShareAvailable) return
    try {
      // OS標準の共有メニューで参加者URLを共有
      await navigator.share({
        title: event?.title || '未払い回収ツール',
        text: shareMessage,
        url: joinUrl,
      })
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.warn('Native share failed:', err)
    }
  }

  return (
    <section className="card complete-card">
      <h2>イベントを作成しました</h2>
      <p className="sub complete-lead">まずは参加者URLをLINEグループに共有しましょう。参加者は自分で名前を入力して参加できます。</p>

      <div className="participant-share-card">
        <h3>参加者に共有する</h3>
        <p className="sub">このイベントの参加URLをLINEグループなどに送れます。参加者はURLから自分で名前を入力して参加します。</p>
        <div className="share-actions">
          <button className="btn btn-line" disabled={!canShareJoinUrl} onClick={() => openLineShare(shareMessage)}>LINEで共有</button>
          {nativeShareAvailable && (
            <button className="btn btn-secondary" disabled={!canShareJoinUrl} onClick={handleNativeShare}>その他のアプリで共有</button>
          )}
        </div>
      </div>
      <p className="sub complete-storage-note">この端末に管理ページを保存しました。次回カイシュルを開くと、最近作成したイベントから管理画面に戻れます。</p>

      <p className="sub admin-page-caution">この管理ページは幹事専用です。他人に共有しないでください。</p>

      <button className="btn btn-primary btn-lg" onClick={onContinue}>管理画面へ進む</button>
    </section>
  )
}


function AdminPage({ eventId, token }) {
  const [event, setEvent] = useState(null)
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState('')
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard')
  const [activeReportMemberId, setActiveReportMemberId] = useState('')
  const [openReportActionMemberId, setOpenReportActionMemberId] = useState('')
  const [returnToUnpaidMember, setReturnToUnpaidMember] = useState(null)
  const [reportsSearchQuery, setReportsSearchQuery] = useState('')
  const [reportsSortMode, setReportsSortMode] = useState('newest')
  const [reportsSortOpen, setReportsSortOpen] = useState(false)
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)
  const [bulkWorking, setBulkWorking] = useState(false)
  const [memberStatusFilter, setMemberStatusFilter] = useState('all')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [settingsEditing, setSettingsEditing] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    title: '',
    eventDate: '',
    amountPerPerson: '',
    paymentMethod: 'paypay',
    paymentInfo: '',
    memo: '',
  })
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const created = params.get('created') === '1'
  const participantTokenFromUrl = params.get('ptoken') || ''

  const joinToken = participantTokenFromUrl || event?.participantToken || ''
  const joinUrl = `${window.location.origin}/join/${eventId}?token=${encodeURIComponent(joinToken)}`

  useEffect(() => {
    let stop1 = () => {}
    let stop2 = () => {}

    getEvent(eventId)
      .then((ev) => {
        if (ev.adminToken !== token) {
          setError('幹事用トークンが不正です。')
          return
        }
        stop1 = subscribeEvent(eventId, setEvent, (err) => setError(err.message))
        stop2 = subscribeMembers(eventId, setMembers, (err) => setError(err.message))
      })
      .catch((err) => setError(err.message))

    return () => {
      stop1()
      stop2()
    }
  }, [eventId, token])

  const safeMembers = useMemo(() => (Array.isArray(members) ? members : []), [members])

  const counts = useMemo(() => {
    const unpaidMembers = safeMembers.filter((m) => m.status === 'unpaid')
    const reportedMembers = safeMembers.filter((m) => m.status === 'reported')
    const confirmedMembers = safeMembers.filter((m) => m.status === 'confirmed')
    const rate = safeMembers.length ? Math.round((confirmedMembers.length / safeMembers.length) * 100) : 0
    return {
      unpaid: unpaidMembers.length,
      reported: reportedMembers.length,
      confirmed: confirmedMembers.length,
      rate,
      unpaidMembers,
      reportedMembers,
      confirmedMembers,
    }
  }, [safeMembers])

  const filteredMembers = useMemo(() => {
    const query = memberSearchQuery.trim().toLowerCase()
    return safeMembers.filter((member) => {
      const matchesStatus = memberStatusFilter === 'all' || member.status === memberStatusFilter
      const matchesName = !query || String(member.name || '').toLowerCase().includes(query)
      return matchesStatus && matchesName
    })
  }, [memberSearchQuery, memberStatusFilter, safeMembers])

  const activeReportMember = useMemo(
    () => safeMembers.find((member) => member.id === activeReportMemberId) || null,
    [activeReportMemberId, safeMembers],
  )

  const visibleReportedMembers = useMemo(() => {
    const query = reportsSearchQuery.trim().toLowerCase()
    const filtered = counts.reportedMembers.filter((member) => {
      if (!query) return true
      return String(member.name || '').toLowerCase().includes(query)
    })
    return [...filtered].sort((a, b) => {
      if (reportsSortMode === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''), 'ja')
      }
      return dateTimeValue(b.updatedAt) - dateTimeValue(a.updatedAt)
    })
  }, [counts.reportedMembers, reportsSearchQuery, reportsSortMode])

  const reminderMessage = useMemo(() => {
    if (!event) return ''
    return buildReminderMessage({
      event,
      unpaidMembers: counts.unpaidMembers,
      joinUrl,
      progressRate: counts.rate,
    })
  }, [counts.rate, counts.unpaidMembers, event, joinUrl])

  if (error) return <main className="container"><AppHeader /><section className="card"><p className="error">{error}</p></section></main>

  const goDashboard = () => move(`/admin/${eventId}?token=${encodeURIComponent(token)}`)

  if (created) {
    return (
      <main className="container">
      <AppHeader />
        <CreatedScreen event={event} joinUrl={joinUrl} onContinue={goDashboard} />
      </main>
    )
  }
  if (!event) return <main className="container"><AppHeader /><section className="card"><p className="error">イベントが見つかりません。</p></section></main>

  const confirm = async (memberId) => {
    if (workingId === memberId) return false
    setWorkingId(memberId)
    try {
      await confirmPayment({ eventId, memberId })
      const updatedAt = new Date().toISOString()
      setMembers((currentMembers) => currentMembers.map((member) => (
        member.id === memberId ? { ...member, status: 'confirmed', updatedAt } : member
      )))
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setWorkingId('')
    }
  }

  const confirmReportFromMenu = async (memberId) => {
    const confirmed = await confirm(memberId)
    if (confirmed) {
      setOpenReportActionMemberId('')
    }
  }

  const requestReturnToUnpaid = (member) => {
    setOpenReportActionMemberId('')
    setReturnToUnpaidMember(member)
  }

  const cancelReturnToUnpaid = () => {
    if (returnToUnpaidMember && workingId === returnToUnpaidMember.id) return
    setReturnToUnpaidMember(null)
  }

  const submitReturnToUnpaid = async () => {
    if (!returnToUnpaidMember || workingId === returnToUnpaidMember.id) return
    setWorkingId(returnToUnpaidMember.id)
    try {
      await returnReportToUnpaid({ eventId, memberId: returnToUnpaidMember.id })
      const updatedAt = new Date().toISOString()
      setMembers((currentMembers) => currentMembers.map((member) => (
        member.id === returnToUnpaidMember.id ? { ...member, status: 'unpaid', proofMemo: '', updatedAt } : member
      )))
      setReturnToUnpaidMember(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setWorkingId('')
    }
  }

  const cancelConfirmAll = () => {
    if (bulkWorking) return
    setConfirmAllOpen(false)
  }

  const submitConfirmAll = async () => {
    if (bulkWorking || visibleReportedMembers.length === 0) return
    setBulkWorking(true)
    try {
      const targets = visibleReportedMembers
      for (const member of targets) {
        const confirmed = await confirm(member.id)
        if (!confirmed) return
      }
      setConfirmAllOpen(false)
    } finally {
      setBulkWorking(false)
    }
  }

  const remove = async (memberId) => {
    if (!window.confirm('参加者を削除しますか？')) return
    setWorkingId(memberId)
    try {
      await removeMember({ eventId, memberId })
    } catch (err) {
      setError(err.message)
    } finally {
      setWorkingId('')
    }
  }

  const startSettingsEdit = () => {
    setSettingsError('')
    setSettingsSuccess('')
    setSettingsForm({
      title: event.title || '',
      eventDate: event.eventDate || '',
      amountPerPerson: String(event.amountPerPerson || ''),
      paymentMethod: 'cash',
      paymentInfo: event.paymentInfo || '',
      memo: event.memo || '',
    })
    setSettingsEditing(true)
  }

  const openEventSettingsEdit = () => {
    startSettingsEdit()
    setActiveAdminTab('settings')
  }

  const openUnpaidMembers = () => {
    setMemberSearchQuery('')
    setMemberStatusFilter('unpaid')
    setActiveAdminTab('members')
  }

  const openReportsInbox = () => {
    setOpenReportActionMemberId('')
    setReportsSortOpen(false)
    setActiveReportMemberId('')
    setActiveAdminTab('reportsInbox')
  }

  const openReportDetail = (memberId) => {
    setOpenReportActionMemberId('')
    setReportsSortOpen(false)
    setActiveReportMemberId(memberId)
    setActiveAdminTab('reportDetail')
  }

  const backToReportsInbox = () => {
    setOpenReportActionMemberId('')
    setReportsSortOpen(false)
    setActiveReportMemberId('')
    setActiveAdminTab('reportsInbox')
  }

  const confirmActiveReport = async () => {
    if (!activeReportMember || activeReportMember.status !== 'reported') return
    const confirmed = await confirm(activeReportMember.id)
    if (confirmed) {
      setActiveReportMemberId('')
      setActiveAdminTab('reportsInbox')
    }
  }

  const cancelSettingsEdit = () => {
    if (settingsSaving) return
    setSettingsError('')
    setSettingsEditing(false)
  }

  const saveSettings = async (e) => {
    e.preventDefault()
    if (settingsSaving) return
    setSettingsError('')
    setSettingsSuccess('')

    if (!settingsForm.title.trim()) return setSettingsError('イベント名を入力してください。')
    if (!settingsForm.eventDate) return setSettingsError('日付を入力してください。')
    if (!/^\d+$/.test(String(settingsForm.amountPerPerson)) || Number(settingsForm.amountPerPerson) < 1) return setSettingsError('1人あたりの金額は1円以上の整数で入力してください。')
    if (!window.confirm('イベント情報を変更すると、参加者側に表示される金額や支払い情報も変更されます。保存しますか？')) return

    setSettingsSaving(true)
    try {
      await updateEventInfo(eventId, {
        title: settingsForm.title.trim(),
        eventDate: settingsForm.eventDate,
        amountPerPerson: Number(settingsForm.amountPerPerson),
        paymentMethod: 'cash',
        paymentInfo: settingsForm.paymentInfo.trim() || DEFAULT_CASH_PAYMENT_INFO,
        memo: settingsForm.memo.trim(),
      })
      setSettingsSuccess('イベント情報を更新しました。')
      setSettingsEditing(false)
    } catch (err) {
      setSettingsError(err.message)
    } finally {
      setSettingsSaving(false)
    }
  }



  const adminBottomNav = (
    <nav className="admin-bottom-nav" aria-label="幹事メニュー">
      <button className={`admin-bottom-nav__item ${['dashboard', 'reportsInbox', 'reportDetail'].includes(activeAdminTab) ? 'admin-bottom-nav__item--active' : ''}`} onClick={() => setActiveAdminTab('dashboard')}>
        <span className="admin-bottom-nav__icon" aria-hidden="true">
          <LayoutDashboard size={22} strokeWidth={2.4} />
        </span>
        <span>ダッシュボード</span>
      </button>
      <button className={`admin-bottom-nav__item ${activeAdminTab === 'members' ? 'admin-bottom-nav__item--active' : ''}`} onClick={() => setActiveAdminTab('members')}>
        <span className="admin-bottom-nav__icon" aria-hidden="true">
          <Users size={22} strokeWidth={2.4} />
        </span>
        <span>参加者一覧</span>
      </button>
      <button className={`admin-bottom-nav__item ${activeAdminTab === 'settings' ? 'admin-bottom-nav__item--active' : ''}`} onClick={() => setActiveAdminTab('settings')}>
        <span className="admin-bottom-nav__icon" aria-hidden="true">
          <Settings size={22} strokeWidth={2.4} />
        </span>
        <span>設定</span>
      </button>
    </nav>
  )

  const memberCard = (member) => (
    <li key={member.id} className={`member-list-item member-list-item--${member.status}`}>
      <details className="member-list-details">
        <summary className="member-list-row">
          <span className="member-avatar" aria-hidden="true">{member.name?.slice(0, 1) || '?'}</span>
          <span className="member-row-main">
            <span className="member-row-name">{member.name || '名前未設定'}</span>
            <span className="member-row-updated">{formatUpdatedAt(member.updatedAt)}</span>
          </span>
          <span className="member-row-status-actions">
            {member.status === 'reported' && memberStatusFilter === 'reported' ? (
              <button
                type="button"
                className="member-inline-confirm-button"
                disabled={workingId === member.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  confirm(member.id)
                }}
              >
                確認済みにする
              </button>
            ) : (
              <span className={`status-badge member-status-badge badge-${member.status}`}>
                {statusLabel(member.status)}
              </span>
            )}
          </span>
          <ChevronRight size={17} className="member-row-chevron" aria-hidden="true" />
        </summary>
        <div className="member-row-detail">
          <div className="member-detail-grid">
            <p><span>金額</span><b>{formatMoney(event.amountPerPerson)}</b></p>
            <p><span>支払い方法</span><b>{paymentLabel(member.paymentMethod)}</b></p>
            <p><span>状態</span><b>{statusLabel(member.status)}</b></p>
            <p><span>報告メモ</span><b>{member.proofMemo || 'なし'}</b></p>
          </div>
          <div className="member-row-actions">
            {member.status === 'reported' && memberStatusFilter === 'reported' && (
              <button className="btn btn-confirm member-action-btn" disabled={workingId === member.id} onClick={() => confirm(member.id)}>確認済みにする</button>
            )}
            <button className="btn btn-ghost-danger member-action-btn" disabled={workingId === member.id} onClick={() => remove(member.id)}>削除</button>
          </div>
        </div>
      </details>
    </li>
  )

  return (
    <main className="container admin-shell">
      <AppHeader>
        {activeAdminTab === 'dashboard' && (
          <button
            type="button"
            className="reports-bell-button"
            aria-label={`確認待ち ${counts.reportedMembers.length}件`}
            onClick={openReportsInbox}
          >
            <Bell size={25} strokeWidth={2.3} aria-hidden="true" />
            {counts.reportedMembers.length > 0 && (
              <span className="reports-bell-badge">{counts.reportedMembers.length}</span>
            )}
          </button>
        )}
      </AppHeader>
      {activeAdminTab === 'dashboard' && (
        <>
          <section className="card admin-event-card">
            <div className="admin-event-card__icon" aria-hidden="true">
              <Calendar size={22} strokeWidth={2} />
            </div>
            <div className="admin-event-card__body">
              <p className="admin-event-card__title">{event.title || 'イベント名未設定'}</p>
              <p className="admin-event-card__meta">{formatDate(event.eventDate)}{' '}{formatMoney(event.amountPerPerson)}</p>
            </div>
            <button className="admin-event-card__edit-button" type="button" aria-label="イベント情報を編集" onClick={openEventSettingsEdit}>
              <ChevronRight size={20} className="admin-event-card__chevron" aria-hidden="true" />
            </button>
          </section>

          <section className="dashboard-summary-section">
            <h2 className="dashboard-section-title">支払い状況サマリー</h2>
            <div className="card dashboard-summary-card">
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
                      <span className="dashboard-summary-number">{safeMembers.length}</span>
                      <span className="dashboard-summary-unit">人中</span>
                      <span className="dashboard-summary-number">{counts.confirmed}</span>
                      <span className="dashboard-summary-unit">人確認済み</span>
                    </p>
                    <p className="dashboard-summary-rate">
                      <span className="dashboard-summary-rate-value">{counts.rate}</span>
                      <span className="dashboard-summary-rate-unit">%</span>
                    </p>
                  </div>
                  <div className="admin-progress-bar"><div className="admin-progress-fill" style={{ width: `${counts.rate}%` }} /></div>
                  <p className="dashboard-summary-foot">{counts.confirmed} / {safeMembers.length}人</p>
                </div>
              </div>
              <div className="dashboard-kpi-grid">
                <article className="dashboard-kpi dashboard-kpi-total">
                  <span className="dashboard-kpi-label"><Users size={15} />参加者</span>
                  <b>{safeMembers.length}</b>
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
            </div>
          </section>

          <section className="card dashboard-unpaid-list-card">
            <div className="dashboard-card-head">
              <h2>未払い者</h2>
              <button className="dashboard-link-text" type="button" onClick={openUnpaidMembers}>すべて見る</button>
            </div>
            {counts.unpaid > 0 ? (
              <ul className="dashboard-unpaid-preview">
                {counts.unpaidMembers.slice(0, 3).map((member) => (
                  <li key={member.id} className="dashboard-unpaid-row">
                    <span className="dashboard-unpaid-avatar" aria-hidden="true">{member.name?.slice(0, 1) || '?'}</span>
                    <span className="dashboard-unpaid-name">{member.name}</span>
                    <span className="status-badge badge-unpaid">未払い</span>
                  </li>
                ))}
                {counts.unpaidMembers.length > 3 && (
                  <li className="dashboard-unpaid-ellipsis" aria-hidden="true">︙</li>
                )}
              </ul>
            ) : (
              <p className="sub">未払い者はいません</p>
            )}
            <div className="dashboard-line-inline">
              <button
                className="btn btn-line btn-lg line-reminder-button"
                disabled={counts.unpaid === 0}
                onClick={() => window.open(createLineShareUrl(reminderMessage), '_blank', 'noopener,noreferrer')}
              >
                <span className="line-reminder-icon" aria-hidden="true">LINE</span>
                <span className="line-reminder-text">
                  <span className="line-reminder-title">LINEで催促</span>
                  <span className="line-reminder-subtitle">未払い者にまとめてメッセージを送る</span>
                </span>
              </button>
            </div>
          </section>
        </>
      )}

      {activeAdminTab === 'reportsInbox' && (
      <section className="reports-inbox-screen">
        <div className="reports-ios-header">
          <button
            type="button"
            className="reports-ios-back-button"
            aria-label="ダッシュボードへ戻る"
            onClick={() => {
              setOpenReportActionMemberId('')
              setReportsSortOpen(false)
              setActiveAdminTab('dashboard')
            }}
          >
            <ArrowLeft size={19} strokeWidth={2.5} aria-hidden="true" />
            <span>戻る</span>
          </button>
          <div className="reports-ios-title-row">
            <h1>確認待ち一覧</h1>
            <span className="reports-count-chip">{counts.reportedMembers.length}人</span>
          </div>
          <p className="reports-ios-lead">支払い報告が届いています。内容を確認して「確認済み」にしてください。</p>
        </div>

        <div className="reports-filter-row">
          <label className="reports-search-field">
            <Search size={18} strokeWidth={2.4} aria-hidden="true" />
            <input
              type="search"
              placeholder="名前で検索"
              value={reportsSearchQuery}
              onChange={(event) => {
                setReportsSearchQuery(event.target.value)
                setOpenReportActionMemberId('')
                setReportsSortOpen(false)
              }}
            />
          </label>
          <div className="reports-sort-wrap">
            {reportsSortOpen && (
              <button type="button" className="reports-sort-backdrop" aria-label="並び替えメニューを閉じる" onClick={() => setReportsSortOpen(false)} />
            )}
            <button
              type="button"
              className="reports-sort-button"
              aria-haspopup="menu"
              aria-expanded={reportsSortOpen}
              onClick={() => {
                setOpenReportActionMemberId('')
                setReportsSortOpen((current) => !current)
              }}
            >
              <SlidersHorizontal size={17} strokeWidth={2.4} aria-hidden="true" />
              <span>並び替え</span>
            </button>
            {reportsSortOpen && (
              <div className="reports-sort-menu" role="menu">
                <button
                  type="button"
                  className={`reports-sort-menu__item ${reportsSortMode === 'newest' ? 'reports-sort-menu__item--active' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setReportsSortMode('newest')
                    setReportsSortOpen(false)
                  }}
                >
                  報告が新しい順
                </button>
                <button
                  type="button"
                  className={`reports-sort-menu__item ${reportsSortMode === 'name' ? 'reports-sort-menu__item--active' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setReportsSortMode('name')
                    setReportsSortOpen(false)
                  }}
                >
                  名前順
                </button>
              </div>
            )}
          </div>
        </div>

        {counts.reportedMembers.length > 0 ? (
          <>
            {openReportActionMemberId && (
              <button type="button" className="report-action-backdrop" aria-label="操作メニューを閉じる" onClick={() => setOpenReportActionMemberId('')} />
            )}
            {visibleReportedMembers.length > 0 ? (
              <ul className="member-list reports-inbox-list">
              {visibleReportedMembers.map((member) => (
                <li key={member.id} className={`member-list-item member-list-item--reported reports-inbox-item ${openReportActionMemberId === member.id ? 'reports-inbox-item--menu-open' : ''}`}>
                  <details className="member-list-details reports-member-details">
                    <summary
                      className={`member-list-row reports-member-row ${workingId === member.id || bulkWorking ? 'reports-member-row--disabled' : ''}`}
                      aria-disabled={workingId === member.id || bulkWorking}
                      onClick={(event) => {
                        event.preventDefault()
                        if (workingId === member.id || bulkWorking) return
                        openReportDetail(member.id)
                      }}
                    >
                      <span className="member-avatar" aria-hidden="true">{member.name?.slice(0, 1) || '?'}</span>
                      <span className="member-row-main">
                        <span className="member-row-name">{member.name || '名前未設定'}</span>
                        <span className="member-row-updated">
                          {formatReportedAt(member.updatedAt)} ・ {paymentLabel(member.paymentMethod)} ・ {hasVisibleMemo(member.proofMemo) ? 'メモあり' : 'メモなし'}
                        </span>
                      </span>
                      <span className="member-row-status-actions">
                        <span className="status-badge member-status-badge badge-reported">確認待ち</span>
                      </span>
                      <span className="reports-action-wrap">
                      <button
                        type="button"
                        className="reports-action-trigger"
                        aria-label={`${member.name || '名前未設定'}の操作`}
                        aria-haspopup="menu"
                        aria-expanded={openReportActionMemberId === member.id}
                        disabled={workingId === member.id || bulkWorking}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setReportsSortOpen(false)
                          setOpenReportActionMemberId((current) => (current === member.id ? '' : member.id))
                        }}
                      >
                        <MoreVertical size={17} strokeWidth={2.4} aria-hidden="true" />
                      </button>
                      {openReportActionMemberId === member.id && (
                        <div
                          className="reports-action-menu"
                          role="menu"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                        >
                          <button
                            type="button"
                            className="reports-action-menu__item"
                            role="menuitem"
                            disabled={workingId === member.id || bulkWorking}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              confirmReportFromMenu(member.id)
                            }}
                          >
                            確認済みにする
                          </button>
                          <button
                            type="button"
                            className="reports-action-menu__item reports-action-menu__item--danger"
                            role="menuitem"
                            disabled={workingId === member.id || bulkWorking}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              requestReturnToUnpaid(member)
                            }}
                          >
                            未払いに戻す
                          </button>
                        </div>
                      )}
                      </span>
                    </summary>
                    <div className="member-row-detail reports-member-detail">
                      <div className="member-detail-grid">
                        <p><span>金額</span><b>{formatMoney(event.amountPerPerson)}</b></p>
                        <p><span>支払い方法</span><b>{paymentLabel(member.paymentMethod)}</b></p>
                        <p><span>状態</span><b>確認待ち</b></p>
                        <p><span>報告メモ</span><b>{hasVisibleMemo(member.proofMemo) ? member.proofMemo : 'なし'}</b></p>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
            ) : (
              <div className="card reports-empty-card reports-empty-card--search">
                <Search size={27} strokeWidth={2.2} aria-hidden="true" />
                <p>該当する確認待ちはありません。</p>
              </div>
            )}
          </>
        ) : (
          <div className="card reports-empty-card">
            <CheckCircle2 size={28} strokeWidth={2.2} aria-hidden="true" />
            <p>確認待ちの報告はありません。</p>
          </div>
        )}

        <div className="reports-helper-card">
          <div className="reports-helper-title">
            <Info size={17} strokeWidth={2.4} aria-hidden="true" />
            <span>確認のポイント</span>
          </div>
          <p>支払い方法・金額・メモを確認して、内容に問題がなければ「確認済み」にしてください。</p>
        </div>

        <button
          type="button"
          className="btn btn-lg reports-bulk-confirm-button"
          disabled={visibleReportedMembers.length === 0 || bulkWorking}
          onClick={() => {
            setOpenReportActionMemberId('')
            setReportsSortOpen(false)
            setConfirmAllOpen(true)
          }}
        >
          <Check size={20} strokeWidth={2.5} aria-hidden="true" />
          {bulkWorking ? '更新中...' : 'すべて確認済みにする'}
        </button>
      </section>
      )}

      {activeAdminTab === 'reportDetail' && (
      <section className="report-detail-screen">
        <div className="reports-screen-header">
          <button type="button" className="reports-back-button" aria-label="確認待ちボックスへ戻る" onClick={backToReportsInbox}>
            <ArrowLeft size={21} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <div className="reports-screen-title">
            <p>報告詳細</p>
            <h1>支払い確認</h1>
          </div>
        </div>

        {!activeReportMember ? (
          <div className="card report-detail-card report-detail-processed">
            <h2>対象が見つかりません</h2>
            <p className="sub">確認待ちボックスに戻って、最新の報告を確認してください。</p>
            <button type="button" className="btn btn-secondary btn-lg" onClick={backToReportsInbox}>確認待ちボックスへ戻る</button>
          </div>
        ) : activeReportMember.status !== 'reported' ? (
          <div className="card report-detail-card report-detail-processed">
            <span className={`status-badge report-detail-status badge-${activeReportMember.status}`}>
              {statusLabel(activeReportMember.status)}
            </span>
            <h2>すでに処理済み</h2>
            <p className="sub">{activeReportMember.name || '名前未設定'} さんの報告は現在「{statusLabel(activeReportMember.status)}」です。</p>
            <button type="button" className="btn btn-secondary btn-lg" onClick={backToReportsInbox}>確認待ちボックスへ戻る</button>
          </div>
        ) : (
          <div className="card report-detail-card">
            <div className="report-detail-profile">
              <span className="reports-member-avatar reports-member-avatar--large" aria-hidden="true">{activeReportMember.name?.slice(0, 1) || '?'}</span>
              <div>
                <h2>{activeReportMember.name || '名前未設定'}</h2>
                <p className="sub">{formatUpdatedAt(activeReportMember.updatedAt)}</p>
              </div>
              <span className="status-badge report-detail-status badge-reported">確認待ち</span>
            </div>

            <div className="report-detail-grid">
              <p><span>金額</span><b>{formatMoney(event.amountPerPerson)}</b></p>
              <p><span>支払い方法</span><b>{paymentLabel(activeReportMember.paymentMethod)}</b></p>
            </div>

            <div className="report-detail-memo">
              <span>報告メモ</span>
              <p>{activeReportMember.proofMemo || 'なし'}</p>
            </div>

            <button
              type="button"
              className="btn btn-confirm btn-lg report-confirm-button"
              disabled={workingId === activeReportMember.id}
              onClick={confirmActiveReport}
            >
              {workingId === activeReportMember.id ? '更新中...' : '確認済みにする'}
            </button>
          </div>
        )}
      </section>
      )}

      {activeAdminTab === 'members' && (
      <section className="participants-screen">
        <h1 className="participants-title">参加者一覧</h1>

        <label className="member-search">
          <Search size={19} strokeWidth={2.4} aria-hidden="true" />
          <input
            type="search"
            placeholder="名前で検索"
            value={memberSearchQuery}
            onChange={(e) => setMemberSearchQuery(e.target.value)}
          />
        </label>

        <div className="status-pill-row member-filter-row" role="tablist" aria-label="参加者ステータスフィルター">
          <button className={`status-pill ${memberStatusFilter === 'all' ? 'pill-all pill-active' : 'pill-all'}`} onClick={() => setMemberStatusFilter('all')}>すべて</button>
          <button className={`status-pill ${memberStatusFilter === 'unpaid' ? 'pill-unpaid pill-active' : 'pill-unpaid'}`} onClick={() => setMemberStatusFilter('unpaid')}>未払い</button>
          <button className={`status-pill ${memberStatusFilter === 'reported' ? 'pill-reported pill-active' : 'pill-reported'}`} onClick={() => setMemberStatusFilter('reported')}>確認待ち</button>
          <button className={`status-pill ${memberStatusFilter === 'confirmed' ? 'pill-confirmed pill-active' : 'pill-confirmed'}`} onClick={() => setMemberStatusFilter('confirmed')}>確認済み</button>
        </div>

        <ul className="member-list">{filteredMembers.map(memberCard)}</ul>
        {filteredMembers.length === 0 && (
          <p className="member-empty">該当する参加者はいません。</p>
        )}
      </section>
      )}

      {activeAdminTab === 'settings' && (
      <section className="admin-settings-screen">
        <h1 className="settings-page-title">設定 / イベント情報</h1>
        {settingsSuccess && <p className="success">{settingsSuccess}</p>}
        {!settingsEditing ? (
          <>
            <div className="settings-card settings-summary-card">
              <div className="settings-summary-grid">
                <article className="settings-summary-item">
                  <p className="settings-summary-label"><span className="settings-summary-icon" aria-hidden="true"><FileText size={20} strokeWidth={2} /></span>イベント名</p><b>{event.title}</b>
                </article>
                <article className="settings-summary-item">
                  <p className="settings-summary-label"><span className="settings-summary-icon" aria-hidden="true"><Calendar size={20} strokeWidth={2} /></span>日付</p><b>{formatDate(event.eventDate)}</b>
                </article>
                <article className="settings-summary-item">
                  <p className="settings-summary-label"><span className="settings-summary-icon" aria-hidden="true"><JapaneseYen size={20} strokeWidth={2} /></span>会費</p><b>{formatMoney(event.amountPerPerson)}</b>
                </article>
                <article className="settings-summary-item">
                  <p className="settings-summary-label"><span className="settings-summary-icon" aria-hidden="true"><Wallet size={20} strokeWidth={2} /></span>支払い</p><b>現金回収</b>
                </article>
              </div>
            </div>
            <div className="settings-card settings-guide-card">
              <h3><span className="settings-guide-icon" aria-hidden="true"><Megaphone size={20} strokeWidth={2} /></span>幹事からの案内</h3>
              <p>{event.paymentInfo || DEFAULT_CASH_PAYMENT_INFO}</p>
              {hasVisibleMemo(event.memo) && <p className="sub">{event.memo.trim()}</p>}
            </div>
            <button className="btn btn-outline-primary btn-lg settings-edit-trigger" onClick={startSettingsEdit}><Pencil size={20} strokeWidth={2} />イベント情報を編集</button>
          </>
        ) : (
          <form className="settings-edit-form settings-card" onSubmit={saveSettings}>
            <label className="field">
              <span>イベント名</span>
              <input value={settingsForm.title} onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })} />
            </label>
            <label className="field">
              <span>日付</span>
              <input type="date" value={settingsForm.eventDate} onChange={(e) => setSettingsForm({ ...settingsForm, eventDate: e.target.value })} />
            </label>
            <label className="field">
              <span>1人あたりの金額</span>
              <input type="number" min="1" step="1" value={settingsForm.amountPerPerson} onChange={(e) => setSettingsForm({ ...settingsForm, amountPerPerson: e.target.value })} />
            </label>
            <div className="field fixed-field">
              <span>支払い方法</span>
              <p className="fixed-field-value">現金回収</p>
            </div>
            <label className="field">
              <span>幹事からの案内</span>
              <p className="sub">例：当日受付で集めます / 飲み会の開始前に幹事へ渡してください</p>
              <textarea rows="3" placeholder="例：当日受付で集めます" value={settingsForm.paymentInfo} onChange={(e) => setSettingsForm({ ...settingsForm, paymentInfo: e.target.value })} />
            </label>
            <label className="field">
              <span>任意メモ</span>
              <textarea rows="2" value={settingsForm.memo} onChange={(e) => setSettingsForm({ ...settingsForm, memo: e.target.value })} />
            </label>
            {settingsError && <p className="error">{settingsError}</p>}
            <div className="settings-edit-actions">
              <button className="btn btn-save btn-lg" disabled={settingsSaving}>{settingsSaving ? '保存中...' : '保存する'}</button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={cancelSettingsEdit} disabled={settingsSaving}>キャンセル</button>
            </div>
          </form>
        )}
        <div className="settings-card participant-share-card">
          <h3><span className="participant-share-icon" aria-hidden="true"><UserPlus size={20} strokeWidth={2} /></span>参加者を追加する</h3>
          <p className="sub">LINEグループに送ると、参加者が自分で名前を入力して参加できます。</p>
          <div className="share-actions">
            <button className="btn btn-line" disabled={!joinUrl} onClick={() => openLineShare(buildJoinShareMessage(event, joinUrl))}>LINEで共有</button>
            {canUseNativeShare() && (
              <button
                className="btn btn-secondary"
                disabled={!joinUrl}
                onClick={async () => {
                  try {
                    // OS標準の共有メニューで参加者URLを再共有
                    await navigator.share({
                      title: event?.title || '未払い回収ツール',
                      text: buildJoinShareMessage(event, joinUrl),
                      url: joinUrl,
                    })
                  } catch (err) {
                    if (err?.name === 'AbortError') return
                    console.warn('Native share failed:', err)
                  }
                }}
              >
                <Share2 size={20} strokeWidth={2} />
                その他のアプリで共有
              </button>
            )}
          </div>
        </div>
      </section>
      )}

      {returnToUnpaidMember && (
        <div className="report-return-sheet" role="dialog" aria-modal="true" aria-labelledby="report-return-title">
          <button type="button" className="report-return-sheet__backdrop" aria-label="未払い戻し確認を閉じる" onClick={cancelReturnToUnpaid} />
          <div className="report-return-sheet__panel">
            <div className="report-return-sheet__body">
              <p className="report-return-sheet__eyebrow">{returnToUnpaidMember.name || '名前未設定'}</p>
              <h2 id="report-return-title">未払いに戻しますか？</h2>
              <p>この人の支払い報告を取り消して、未払い状態に戻します。</p>
              <p>必要であれば、もう一度支払い報告してもらってください。</p>
            </div>
            <div className="report-return-sheet__actions">
              <button type="button" className="btn btn-secondary btn-lg" onClick={cancelReturnToUnpaid} disabled={workingId === returnToUnpaidMember.id}>
                キャンセル
              </button>
              <button type="button" className="btn btn-danger btn-lg" onClick={submitReturnToUnpaid} disabled={workingId === returnToUnpaidMember.id}>
                {workingId === returnToUnpaidMember.id ? '更新中...' : '未払いに戻す'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAllOpen && (
        <div className="report-return-sheet" role="dialog" aria-modal="true" aria-labelledby="report-confirm-all-title">
          <button type="button" className="report-return-sheet__backdrop" aria-label="一括確認を閉じる" onClick={cancelConfirmAll} />
          <div className="report-return-sheet__panel">
            <div className="report-return-sheet__body">
              <p className="report-confirm-all-eyebrow">{visibleReportedMembers.length}件</p>
              <h2 id="report-confirm-all-title">確認待ちの {visibleReportedMembers.length} 件をすべて確認済みにしますか？</h2>
              <p>内容確認が終わっている場合のみ実行してください。</p>
            </div>
            <div className="report-return-sheet__actions">
              <button type="button" className="btn btn-secondary btn-lg" onClick={cancelConfirmAll} disabled={bulkWorking}>
                キャンセル
              </button>
              <button type="button" className="btn btn-lg report-confirm-all-submit" onClick={submitConfirmAll} disabled={bulkWorking || visibleReportedMembers.length === 0}>
                {bulkWorking ? '更新中...' : 'すべて確認済みにする'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adminBottomNav}
    </main>
  )
}


class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="container">
        <AppHeader />
          <section className="card">
            <p className="error">管理画面の表示中にエラーが発生しました。画面を再読み込みしてください。</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="error-debug">{String(this.state.error.message || this.state.error)}</pre>
            )}
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

function JoinPage({ eventId, token }) {
  const [event, setEvent] = useState(null)
  const [member, setMember] = useState(null)
  const [name, setName] = useState('')
  const [proofMemo, setProofMemo] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    let unsubEvent = () => {}
    let unsubMember = () => {}

    getEvent(eventId)
      .then((ev) => {
        if (ev.participantToken !== token) {
          setError('参加者用トークンが不正です。')
          return
        }

        setEvent(ev)
        unsubEvent = subscribeEvent(eventId, setEvent, (err) => setError(err.message))

        const binding = getMemberBinding(eventId)
        if (binding?.memberId) {
          unsubMember = subscribeMember(eventId, binding.memberId, setMember, () => clearMemberBinding(eventId))
        }
      })
      .catch((err) => setError(err.message))

    return () => {
      unsubEvent()
      unsubMember()
    }
  }, [eventId, token])

  const leave = () => {
    if (!window.confirm('この部屋から抜けますか？')) return
    clearMemberBinding(eventId)
    setMember(null)
    setName('')
    setProofMemo('')
  }

  const join = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError('名前を入力してください。')
    setError('')
    setJoining(true)
    try {
      const memberId = await joinEvent({ eventId, name: trimmed, paymentMethod: event.paymentMethod })
      setMember({ id: memberId, name: trimmed, status: 'unpaid', paymentMethod: event.paymentMethod, proofMemo: '' })
      setMemberBinding({ eventId, memberId, memberName: trimmed })
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  const report = async () => {
    if (!member || member.status !== 'unpaid' || reporting) return
    setReporting(true)
    setError('')
    try {
      await reportPayment({ eventId, memberId: member.id, proofMemo })
      setMember((prev) => {
        if (!prev) return prev
        return { ...prev, status: 'reported', proofMemo: proofMemo.trim() }
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setReporting(false)
    }
  }

  if (error) return <main className="container"><AppHeader /><section className="card"><p className="error">{error}</p></section></main>
  if (!event) return <main className="container"><AppHeader /><section className="card"><p className="error">イベントが見つかりません。</p></section></main>

  if (!member) {
    return (
      <main className="container admin-shell">
        <AppHeader />
        <section className="card join-card">
          <h1>参加登録</h1>
          <div className="event-summary">
            <p>{event.title}</p>
            <p>{formatDate(event.eventDate)}</p>
            <p className="amount-strong">{formatMoney(event.amountPerPerson)}</p>
          </div>
          <label className="field">
            <span>あなたの名前</span>
            <input placeholder="田中 太郎" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn btn-primary btn-lg" disabled={joining} onClick={join}>{joining ? '参加中...' : '参加する'}</button>
        </section>
      </main>
    )
  }

  if (member.status === 'reported') {
    return (
      <main className="container admin-shell">
        <AppHeader />
        <section className="card status-screen status-reported-bg">
          <h1>支払いを報告しました</h1>
          <p><span className="status-badge badge-reported">現在のステータス：確認待ち</span></p>
          <p>幹事が確認すると「確認済み」に変わります。追加操作は不要です。</p>
          <p className="status-money">{formatMoney(event.amountPerPerson)}</p>
          <p className="sub">{event.title}</p>
        </section>
      </main>
    )
  }

  if (member.status === 'confirmed') {
    return (
      <main className="container admin-shell">
        <AppHeader />
        <section className="card status-screen status-confirmed-bg">
          <h1>支払いが確認されました</h1>
          <p><span className="status-badge badge-confirmed">現在のステータス：確認済み</span></p>
          <p>お支払いありがとうございました。これで完了です。</p>
          <p className="status-money">{formatMoney(event.amountPerPerson)}</p>
          <p className="sub">{event.title}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="container admin-shell">
      <AppHeader />
      <section className="card payment-card">
        <h1>{member.name} さんの支払い</h1>
        <div className="cash-payment-summary">
          <p className="sub">会費</p>
          <p className="payment-amount">{formatMoney(event.amountPerPerson)}</p>
        </div>
        <div className="cash-guidance">
          <p className="cash-guidance-title">支払い方法</p>
          <p>現金で幹事に直接渡してください。</p>
          <p className="sub">支払いが終わったら、下のボタンから報告してください。幹事が確認すると、支払い済みになります。</p>
        </div>
        <div className="url-card">
          <p>幹事からの案内</p>
          <p>{event.paymentInfo || '当日、幹事に直接ご確認ください。'}</p>
          {event.memo && <p className="sub">メモ: {event.memo}</p>}
        </div>
        <label className="field">
          <span>支払い報告メモ（任意）</span>
          <textarea placeholder="振込名義・補足など" value={proofMemo} onChange={(e) => setProofMemo(e.target.value)} />
        </label>
        <button className="btn btn-confirm btn-lg participant-main-cta" disabled={reporting} onClick={report}>{reporting ? '送信中...' : '現金で支払ったので報告する'}</button>
        <button className="btn btn-secondary" onClick={leave}>この部屋から抜ける</button>
      </section>
    </main>
  )
}

export default function App() {
  const [route, setRoute] = useState(parseRoute())

  useEffect(() => {
    const onPop = () => setRoute(parseRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (route.mode === 'admin') return <AdminErrorBoundary><AdminPage eventId={route.eventId} token={route.token} /></AdminErrorBoundary>
  if (route.mode === 'join') return <JoinPage eventId={route.eventId} token={route.token} />
  return <EventCreatePage />
}
