import React, { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  confirmPayment,
  createEvent,
  getEvent,
  joinEvent,
  removeMember,
  reportPayment,
  subscribeEvent,
  subscribeMember,
  subscribeMembers,
  updateEventInfo,
} from './lib/firestore'
import { buildReminderMessage, createLineShareUrl } from './lib/reminder'
import { clearMemberBinding, getMemberBinding, setMemberBinding } from './lib/storage'

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

function paymentLabel(method) {
  return { paypay: 'PayPay', cash: '現金', bank: '銀行振込', other: 'その他' }[method] || method
}

function statusLabel(status) {
  return {
    unpaid: '未払い',
    reported: '報告済み（確認待ち）',
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

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function EventCreatePage() {
  const [form, setForm] = useState({
    title: '',
    eventDate: '',
    amountPerPerson: '',
    paymentMethod: 'paypay',
    paymentInfo: '',
    memo: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.title.trim()) return setError('イベント名を入力してください。')
    if (!form.eventDate) return setError('日付を入力してください。')
    if (Number(form.amountPerPerson) < 1) return setError('1人あたりの金額は1円以上で入力してください。')
    if (!form.paymentInfo.trim()) return setError('支払い情報を入力してください。')

    setLoading(true)
    try {
      const created = await createEvent({
        title: form.title.trim(),
        eventDate: form.eventDate,
        amountPerPerson: Number(form.amountPerPerson),
        paymentMethod: form.paymentMethod,
        paymentInfo: form.paymentInfo.trim(),
        memo: form.memo.trim(),
      })
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

        <label className="field">
          <span>支払い方法</span>
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            <option value="paypay">PayPay</option>
            <option value="cash">現金</option>
            <option value="bank">銀行振込</option>
            <option value="other">その他</option>
          </select>
        </label>

        <label className="field">
          <span>支払い情報</span>
          <textarea rows="3" placeholder="PayPay ID / 振込先 / 受け渡し場所など" value={form.paymentInfo} onChange={(e) => setForm({ ...form, paymentInfo: e.target.value })} />
        </label>

        <label className="field">
          <span>任意メモ</span>
          <textarea rows="2" placeholder="補足（集合場所や期限など）" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
        </label>

        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-lg" disabled={loading}>{loading ? '作成中...' : 'イベントを作成する'}</button>
      </form>
    </main>
  )
}

function CreatedScreen({ event, adminUrl, joinUrl, onContinue }) {
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
      <p className="sub">次に、参加者用URLを共有してください。幹事用URLはあなた専用です。</p>

      <div className="participant-share-card">
        <h3>参加者に共有するURL</h3>
        <p className="sub">このURLをLINEグループなどに送ると、参加者が自分で名前を入力して参加できます</p>
        <div className="url-card">
          <p>参加者用URL（共有用）</p>
          <a href={joinUrl}>{joinUrl}</a>
        </div>
        <div className="share-actions">
          <button className="btn btn-line" disabled={!canShareJoinUrl} onClick={() => openLineShare(shareMessage)}>LINEで共有</button>
          {nativeShareAvailable && (
            <button className="btn btn-secondary" disabled={!canShareJoinUrl} onClick={handleNativeShare}>その他のアプリで共有</button>
          )}
        </div>
      </div>

      <div className="url-card caution">
        <p>幹事用URL（他人に共有しない）</p>
        <a href={adminUrl}>{adminUrl}</a>
      </div>

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
  const [memberStatusFilter, setMemberStatusFilter] = useState('all')
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

  const adminUrl = `${window.location.origin}/admin/${eventId}?token=${encodeURIComponent(token)}`
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
    if (memberStatusFilter === 'all') return safeMembers
    return safeMembers.filter((member) => member.status === memberStatusFilter)
  }, [memberStatusFilter, safeMembers])

  const reminderMessage = useMemo(() => {
    if (!event) return ''
    return buildReminderMessage({
      event,
      unpaidMembers: counts.unpaidMembers,
      joinUrl,
      progressRate: counts.rate,
    })
  }, [counts.rate, counts.unpaidMembers, event, joinUrl])

  if (error) return <main className="container"><section className="card"><p className="error">{error}</p></section></main>

  const goDashboard = () => move(`/admin/${eventId}?token=${encodeURIComponent(token)}`)

  if (created) {
    return (
      <main className="container">
        <CreatedScreen event={event} adminUrl={adminUrl} joinUrl={joinUrl} onContinue={goDashboard} />
      </main>
    )
  }
  if (!event) return <main className="container"><section className="card"><p className="error">イベントが見つかりません。</p></section></main>

  const confirm = async (memberId) => {
    setWorkingId(memberId)
    try {
      await confirmPayment({ eventId, memberId })
    } catch (err) {
      setError(err.message)
    } finally {
      setWorkingId('')
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

  const unpaidHeadline = counts.unpaid === 0
    ? '全員確認済みです'
    : counts.unpaid === 1
      ? 'ラスト1人が未払いです'
      : `あと ${counts.unpaid} 人が未払いです`

  const startSettingsEdit = () => {
    setSettingsError('')
    setSettingsSuccess('')
    setSettingsForm({
      title: event.title || '',
      eventDate: event.eventDate || '',
      amountPerPerson: String(event.amountPerPerson || ''),
      paymentMethod: event.paymentMethod || 'paypay',
      paymentInfo: event.paymentInfo || '',
      memo: event.memo || '',
    })
    setSettingsEditing(true)
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
    if (!settingsForm.paymentMethod) return setSettingsError('支払い方法を選択してください。')
    if (!settingsForm.paymentInfo.trim()) return setSettingsError('支払い情報を入力してください。')
    if (!window.confirm('イベント情報を変更すると、参加者側に表示される金額や支払い情報も変更されます。保存しますか？')) return

    setSettingsSaving(true)
    try {
      await updateEventInfo(eventId, {
        title: settingsForm.title.trim(),
        eventDate: settingsForm.eventDate,
        amountPerPerson: Number(settingsForm.amountPerPerson),
        paymentMethod: settingsForm.paymentMethod,
        paymentInfo: settingsForm.paymentInfo.trim(),
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
      <button className={`admin-bottom-nav__item ${activeAdminTab === 'dashboard' ? 'admin-bottom-nav__item--active' : ''}`} onClick={() => setActiveAdminTab('dashboard')}>
        <span className="admin-bottom-nav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>
        </span>
        <span>ダッシュボード</span>
      </button>
      <button className={`admin-bottom-nav__item ${activeAdminTab === 'members' ? 'admin-bottom-nav__item--active' : ''}`} onClick={() => setActiveAdminTab('members')}>
        <span className="admin-bottom-nav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M7.5 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 7.5 12Zm9 0A3.5 3.5 0 1 0 13 8.5a3.5 3.5 0 0 0 3.5 3.5ZM2 20a5.5 5.5 0 0 1 11 0v1H2Zm9 1v-1a5.5 5.5 0 0 1 11 0v1Z"/></svg>
        </span>
        <span>参加者一覧</span>
      </button>
      <button className={`admin-bottom-nav__item ${activeAdminTab === 'settings' ? 'admin-bottom-nav__item--active' : ''}`} onClick={() => setActiveAdminTab('settings')}>
        <span className="admin-bottom-nav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 8.7A3.3 3.3 0 1 0 15.3 12 3.3 3.3 0 0 0 12 8.7Zm9.7 4.1-1.9-.8a8.4 8.4 0 0 0-.5-1.3l1.1-1.7a1 1 0 0 0-.1-1.3l-1.5-1.5a1 1 0 0 0-1.3-.1l-1.7 1.1a8.4 8.4 0 0 0-1.3-.5l-.8-1.9a1 1 0 0 0-1-.6h-2.2a1 1 0 0 0-1 .6l-.8 1.9a8.4 8.4 0 0 0-1.3.5L6.8 5.9a1 1 0 0 0-1.3.1L4 7.5a1 1 0 0 0-.1 1.3L5 10.5a8.4 8.4 0 0 0-.5 1.3l-1.9.8a1 1 0 0 0-.6 1v2.2a1 1 0 0 0 .6 1l1.9.8a8.4 8.4 0 0 0 .5 1.3l-1.1 1.7A1 1 0 0 0 4 22l1.5 1.5a1 1 0 0 0 1.3.1l1.7-1.1a8.4 8.4 0 0 0 1.3.5l.8 1.9a1 1 0 0 0 1 .6h2.2a1 1 0 0 0 1-.6l.8-1.9a8.4 8.4 0 0 0 1.3-.5l1.7 1.1a1 1 0 0 0 1.3-.1L22 22a1 1 0 0 0 .1-1.3L21 19.1a8.4 8.4 0 0 0 .5-1.3l1.9-.8a1 1 0 0 0 .6-1v-2.2a1 1 0 0 0-.6-1Z"/></svg>
        </span>
        <span>設定</span>
      </button>
    </nav>
  )

  const memberCard = (member) => (
    <li key={member.id} className={`member-row-card status-${member.status}`}>
      <div className="member-head">
        <b>{member.name}</b>
        <span className="member-amount">{formatMoney(event.amountPerPerson)}</span>
      </div>
      <div className="member-meta">
        <span className={`status-badge badge-${member.status}`}>{member.status === 'reported' ? '確認待ち' : statusLabel(member.status)}</span>
        <span className="sub">{paymentLabel(member.paymentMethod)}</span>
      </div>
      {member.status === 'reported' && <p className="sub">報告メモ: {member.proofMemo || 'なし'}</p>}
      <p className="sub">更新: {member.updatedAt || '-'}</p>
      <div className="actions">
        {member.status === 'reported' && (
          <button className="btn btn-confirm" disabled={workingId === member.id} onClick={() => confirm(member.id)}>確認済みにする</button>
        )}
        <button className="btn btn-danger btn-ghost-danger" disabled={workingId === member.id} onClick={() => remove(member.id)}>削除</button>
      </div>
    </li>
  )

  return (
    <main className="container admin-shell">
      {activeAdminTab === 'dashboard' && (
        <>
          <section className="card admin-card">
            <h2>イベント概要</h2>
            <div className="event-meta-grid">
              <p>イベント名 <b>{event.title}</b></p>
              <p>日付 <b>{formatDate(event.eventDate)}</b></p>
              <p>1人あたりの金額 <b>{formatMoney(event.amountPerPerson)}</b></p>
            </div>
          </section>

          <section className="card admin-card">
            <h2>ステータスサマリー</h2>
            <div className="admin-summary-grid">
              <div className="admin-summary-card summary-neutral"><span>参加者数</span><b>{safeMembers.length}</b></div>
              <div className="admin-summary-card summary-unpaid"><span>未払い</span><b>{counts.unpaid}</b></div>
              <div className="admin-summary-card summary-reported"><span>報告済み</span><b>{counts.reported}</b></div>
              <div className="admin-summary-card summary-confirmed"><span>確認済み</span><b>{counts.confirmed}</b></div>
            </div>
          </section>

          <section className="card admin-progress-card">
            <p className="sub">支払い完了率</p>
            <p className="payment-amount">{counts.rate}%</p>
            <div className="admin-progress-bar"><div className="admin-progress-fill" style={{ width: `${counts.rate}%` }} /></div>
            <p className={`unpaid-highlight ${counts.unpaid === 1 ? 'last-one' : ''}`}>{unpaidHeadline}</p>
          </section>

          <section className="card admin-card">
            <h2>未払い者</h2>
            {counts.unpaid > 0 ? (
              <ul className="unpaid-list-preview">
                {counts.unpaidMembers.map((member) => <li key={member.id}>{member.name}</li>)}
              </ul>
            ) : (
              <p className="sub">未払い者はいません。全員確認済みです。</p>
            )}
          </section>

          <section className="card reminder-card">
            <h2>LINEで催促</h2>
            <button
              className="btn btn-line btn-lg"
              disabled={counts.unpaid === 0}
              onClick={() => window.open(createLineShareUrl(reminderMessage), '_blank', 'noopener,noreferrer')}
            >
              LINEで催促する
            </button>
            <div className="url-card">
              <p>参加者用URL（共有用）</p>
              <a href={joinUrl}>{joinUrl}</a>
            </div>
          </section>
        </>
      )}

      {activeAdminTab === 'members' && (
      <section className="card participants-card admin-card">
        <h2>参加者一覧</h2>

        <div className="status-pill-row" role="tablist" aria-label="参加者ステータスフィルター">
          <button className={`status-pill ${memberStatusFilter === 'all' ? 'pill-all pill-active' : 'pill-all'}`} onClick={() => setMemberStatusFilter('all')}>すべて（{safeMembers.length}）</button>
          <button className={`status-pill ${memberStatusFilter === 'unpaid' ? 'pill-unpaid pill-active' : 'pill-unpaid'}`} onClick={() => setMemberStatusFilter('unpaid')}>未払い（{counts.unpaid}）</button>
          <button className={`status-pill ${memberStatusFilter === 'reported' ? 'pill-reported pill-active' : 'pill-reported'}`} onClick={() => setMemberStatusFilter('reported')}>報告済み（{counts.reported}）</button>
          <button className={`status-pill ${memberStatusFilter === 'confirmed' ? 'pill-confirmed pill-active' : 'pill-confirmed'}`} onClick={() => setMemberStatusFilter('confirmed')}>確認済み（{counts.confirmed}）</button>
        </div>

        {memberStatusFilter === 'all' ? (
          <>
            <div className="list-section">
              <h3 className="title-unpaid">未払い（{counts.unpaid}）</h3>
              <ul className="list">{counts.unpaidMembers.map(memberCard)}</ul>
              {counts.unpaid === 0 && <p className="sub">未払いの参加者はいません。</p>}
            </div>

            <div className="list-section">
              <h3 className="title-reported">報告済み / 確認待ち（{counts.reported}）</h3>
              <ul className="list">{counts.reportedMembers.map(memberCard)}</ul>
              {counts.reported === 0 && <p className="sub">報告済み / 確認待ちの参加者はいません。</p>}
            </div>

            <div className="list-section">
              <h3 className="title-confirmed">確認済み（{counts.confirmed}）</h3>
              <ul className="list">{counts.confirmedMembers.map(memberCard)}</ul>
              {counts.confirmed === 0 && <p className="sub">確認済みの参加者はいません。</p>}
            </div>
          </>
        ) : (
          <div className="list-section">
            <h3>表示中: {statusLabel(memberStatusFilter)}</h3>
            <ul className="list">{filteredMembers.map(memberCard)}</ul>
            {filteredMembers.length === 0 && <p className="sub">該当する参加者はいません。</p>}
          </div>
        )}
      </section>
      )}

      {activeAdminTab === 'settings' && (
      <section className="card admin-card">
        <h2>設定 / イベント情報</h2>
        {settingsSuccess && <p className="success">{settingsSuccess}</p>}
        {!settingsEditing ? (
          <>
            <div className="event-meta-grid">
              <p>イベント名 <b>{event.title}</b></p>
              <p>日付 <b>{formatDate(event.eventDate)}</b></p>
              <p>1人あたり <b>{formatMoney(event.amountPerPerson)}</b></p>
              <p>支払い方法 <b>{paymentLabel(event.paymentMethod)}</b></p>
            </div>
            <div className="settings-info-card">
              <div className="settings-info-card__head">イベント情報</div>
              <div className="url-card">
                <p>支払い情報</p><p>{event.paymentInfo || '-'} </p>
                <p>任意メモ: {event.memo || '-'}</p>
              </div>
            </div>
            <button className="btn btn-save btn-lg" onClick={startSettingsEdit}>イベント情報を編集</button>
          </>
        ) : (
          <form className="settings-edit-form" onSubmit={saveSettings}>
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
            <label className="field">
              <span>支払い方法</span>
              <select value={settingsForm.paymentMethod} onChange={(e) => setSettingsForm({ ...settingsForm, paymentMethod: e.target.value })}>
                <option value="paypay">PayPay</option>
                <option value="cash">現金</option>
                <option value="bank">銀行振込</option>
                <option value="other">その他</option>
              </select>
            </label>
            <label className="field">
              <span>支払い情報</span>
              <textarea rows="3" value={settingsForm.paymentInfo} onChange={(e) => setSettingsForm({ ...settingsForm, paymentInfo: e.target.value })} />
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
        <div className="settings-info-card participant-share-card">
          <div className="settings-info-card__head">参加者用URL</div>
          <p className="sub">このURLをLINEグループなどに送ると、参加者が自分で名前を入力して参加できます</p>
          <div className="url-card">
            <p>参加者用URL（共有用）</p>
            <a href={joinUrl}>{joinUrl}</a>
          </div>
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
                その他のアプリで共有
              </button>
            )}
          </div>
        </div>
        <div className="settings-info-card">
          <div className="settings-info-card__head">幹事用URLの注意</div>
          <div className="url-card caution">
          <p>幹事用URLは他人に共有しないでください</p>
          <a href={adminUrl}>{adminUrl}</a>
        </div>
        </div>
        <div className="settings-info-card">
          <div className="settings-info-card__head">ステータス説明</div>
          <div className="url-card">
            <p><b>未払い</b>：まだ支払いがされていません</p>
            <p><b>報告済み</b>：支払い報告済み、幹事の確認待ち</p>
            <p><b>確認済み</b>：幹事が支払いを確認済み</p>
          </div>
        </div>
      </section>
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
  const [paymentGuide, setPaymentGuide] = useState('')
  const [highlightPaymentInfo, setHighlightPaymentInfo] = useState(false)

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

  const onPay = () => {
    setPaymentGuide('')
    setHighlightPaymentInfo(false)

    if (event.paymentMethod === 'paypay' && isValidHttpUrl(event.paymentInfo)) {
      window.open(event.paymentInfo, '_blank', 'noopener,noreferrer')
      return
    }

    setHighlightPaymentInfo(true)
    setPaymentGuide('支払い情報カードを確認してお支払いください。')
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

  if (error) return <main className="container"><section className="card"><p className="error">{error}</p></section></main>
  if (!event) return <main className="container"><section className="card"><p className="error">イベントが見つかりません。</p></section></main>

  if (!member) {
    return (
      <main className="container admin-shell">
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
      <section className="card payment-card">
        <h1>{member.name} さんの支払い</h1>
        <p className="payment-amount">{formatMoney(event.amountPerPerson)}</p>
        <p>支払い方法: {paymentLabel(event.paymentMethod)}</p>
        <div className={`url-card ${highlightPaymentInfo ? 'payment-info-highlight' : ''}`}>
          <p>支払い情報</p>
          <p>{event.paymentInfo}</p>
          {event.memo && <p className="sub">メモ: {event.memo}</p>}
        </div>
        {paymentGuide && <p className="sub">{paymentGuide}</p>}
        <label className="field">
          <span>支払い報告メモ（任意）</span>
          <textarea placeholder="振込名義・補足など" value={proofMemo} onChange={(e) => setProofMemo(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-lg" onClick={onPay}>支払う</button>
        <button className="btn btn-confirm btn-lg" disabled={reporting} onClick={report}>{reporting ? '送信中...' : '支払いを報告する'}</button>
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
