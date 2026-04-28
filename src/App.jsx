import { useEffect, useMemo, useState } from 'react'
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
    if (!form.title.trim()) return setError('イベント名は必須です。')
    if (!form.eventDate) return setError('日付は必須です。')
    if (Number(form.amountPerPerson) < 1) return setError('金額は1円以上で入力してください。')
    if (!form.paymentInfo.trim()) return setError('支払い情報は必須です。')

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
    <main className="container">
      <form className="card form-card" onSubmit={onSubmit}>
        <div className="section-title">
          <h1>未払い回収イベント作成</h1>
          <p>必要事項を入力して、参加者URLを作成します。</p>
        </div>

        <label className="field">
          <span>イベント名</span>
          <input placeholder="例）飲み会" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>

        <label className="field">
          <span>日付</span>
          <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
        </label>

        <label className="field">
          <span>1人あたりの金額</span>
          <input type="number" min="1" placeholder="2469" value={form.amountPerPerson} onChange={(e) => setForm({ ...form, amountPerPerson: e.target.value })} />
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
          <textarea rows="3" placeholder="PayPay ID / 振込先など" value={form.paymentInfo} onChange={(e) => setForm({ ...form, paymentInfo: e.target.value })} />
        </label>

        <label className="field">
          <span>メモ（任意）</span>
          <textarea rows="2" placeholder="補足があれば入力" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
        </label>

        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-lg" disabled={loading}>{loading ? '作成中...' : 'イベントを作成する'}</button>
      </form>
    </main>
  )
}

function AdminPage({ eventId, token }) {
  const [event, setEvent] = useState(null)
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState('')

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

  const counts = useMemo(() => {
    const unpaidMembers = members.filter((m) => m.status === 'unpaid')
    const reportedMembers = members.filter((m) => m.status === 'reported')
    const confirmedMembers = members.filter((m) => m.status === 'confirmed')
    const rate = members.length ? Math.round((confirmedMembers.length / members.length) * 100) : 0
    return {
      unpaid: unpaidMembers.length,
      reported: reportedMembers.length,
      confirmed: confirmedMembers.length,
      rate,
      unpaidMembers,
      reportedMembers,
      confirmedMembers,
    }
  }, [members])

  if (error) return <main className="container"><section className="card"><p className="error">{error}</p></section></main>
  if (!event) return <main className="container"><section className="card"><p>読み込み中...</p></section></main>

  const reminderMessage = buildReminderMessage({
    event,
    unpaidMembers: counts.unpaidMembers,
    joinUrl,
    progressRate: counts.rate,
  })

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

  const memberCard = (member) => (
    <li key={member.id} className={`member-item status-${member.status}`}>
      <div className="member-head">
        <b>{member.name}</b>
        <span>{formatMoney(event.amountPerPerson)}</span>
      </div>
      <div className="member-meta">
        <span className={`status-badge badge-${member.status}`}>{statusLabel(member.status)}</span>
        <span>{paymentLabel(member.paymentMethod)}</span>
      </div>
      <p className="sub">更新: {member.updatedAt || '-'} / メモ: {member.proofMemo || 'なし'}</p>
      <div className="actions">
        {member.status === 'reported' && (
          <button className="btn btn-confirm" disabled={workingId === member.id} onClick={() => confirm(member.id)}>確認済みにする</button>
        )}
        <button className="btn btn-danger" disabled={workingId === member.id} onClick={() => remove(member.id)}>削除</button>
      </div>
    </li>
  )

  return (
    <main className="container">
      {created && (
        <section className="card">
          <h2>イベントを作成しました</h2>
          <p className="sub">URLを共有して参加者を集めてください。</p>
          <div className="url-card">
            <p>参加者用URL</p>
            <a href={joinUrl}>{joinUrl}</a>
          </div>
          <div className="url-card caution">
            <p>幹事用URL（他人に共有しない）</p>
            <a href={adminUrl}>{adminUrl}</a>
          </div>
          <a className="btn btn-line btn-lg" href={createLineShareUrl(`未払い回収の参加URLです。\n${joinUrl}`)} target="_blank" rel="noreferrer">参加者URLをLINEで共有</a>
          <a className="btn btn-primary btn-lg" href={adminUrl}>管理画面へ進む</a>
        </section>
      )}

      <section className="card">
        <h1>{event.title}</h1>
        <p>{formatDate(event.eventDate)} / 1人あたり {formatMoney(event.amountPerPerson)}</p>

        <div className="status-grid">
          <article className="status-box unpaid-box">
            <p>未払い</p>
            <b>{counts.unpaid}人</b>
          </article>
          <article className="status-box reported-box">
            <p>確認待ち</p>
            <b>{counts.reported}人</b>
          </article>
          <article className="status-box confirmed-box">
            <p>確認済み</p>
            <b>{counts.confirmed}人</b>
          </article>
        </div>

        <div>
          <p className="sub">参加者 {members.length}人 / 支払い完了率 {counts.rate}%</p>
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${counts.rate}%` }} />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>参加者一覧</h2>

        <div className="list-section">
          <h3 className="title-unpaid">未払い（{counts.unpaid}）</h3>
          <ul className="list">{counts.unpaidMembers.map(memberCard)}</ul>
        </div>

        <div className="list-section">
          <h3 className="title-reported">報告済み / 確認待ち（{counts.reported}）</h3>
          <ul className="list">{counts.reportedMembers.map(memberCard)}</ul>
        </div>

        <div className="list-section">
          <h3 className="title-confirmed">確認済み（{counts.confirmed}）</h3>
          <ul className="list">{counts.confirmedMembers.map(memberCard)}</ul>
        </div>
      </section>

      <section className="card">
        <h2>催促</h2>
        <p className="unpaid-highlight">あと {counts.unpaid} 人が未払いです</p>
        <div className="url-card">
          <p>参加者用URL</p>
          <a href={joinUrl}>{joinUrl}</a>
        </div>
        <div className="preview">
          <p>メッセージプレビュー</p>
          <pre>{reminderMessage}</pre>
        </div>
        <a className="btn btn-line btn-lg" href={createLineShareUrl(reminderMessage)} target="_blank" rel="noreferrer">LINEで催促する</a>
      </section>
    </main>
  )
}

function JoinPage({ eventId, token }) {
  const [event, setEvent] = useState(null)
  const [member, setMember] = useState(null)
  const [name, setName] = useState('')
  const [proofMemo, setProofMemo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
  }

  const join = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError('名前を入力してください。')
    setError('')
    setLoading(true)
    try {
      const memberId = await joinEvent({ eventId, name: trimmed, paymentMethod: event.paymentMethod })
      setMember({ id: memberId, name: trimmed, status: 'unpaid', paymentMethod: event.paymentMethod, proofMemo: '' })
      setMemberBinding({ eventId, memberId, memberName: trimmed })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const report = async () => {
    setLoading(true)
    setError('')
    try {
      await reportPayment({ eventId, memberId: member.id, proofMemo })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (error) return <main className="container"><section className="card"><p className="error">{error}</p></section></main>
  if (!event) return <main className="container"><section className="card"><p>読み込み中...</p></section></main>

  if (!member) {
    return (
      <main className="container">
        <section className="card">
          <h1>参加登録</h1>
          <p>{event.title}</p>
          <p>{formatDate(event.eventDate)} / {formatMoney(event.amountPerPerson)}</p>
          <label className="field">
            <span>あなたの名前</span>
            <input placeholder="田中 太郎" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn btn-primary btn-lg" disabled={loading} onClick={join}>{loading ? '参加中...' : '参加する'}</button>
        </section>
      </main>
    )
  }

  if (member.status === 'reported') {
    return (
      <main className="container">
        <section className="card status-screen status-reported-bg">
          <h1>支払いを報告しました</h1>
          <p><span className="status-badge badge-reported">現在のステータス：確認待ち</span></p>
          <p>幹事が確認すると「確認済み」になります。</p>
          <button className="btn btn-secondary btn-lg" onClick={leave}>この部屋から抜ける</button>
        </section>
      </main>
    )
  }

  if (member.status === 'confirmed') {
    return (
      <main className="container">
        <section className="card status-screen status-confirmed-bg">
          <h1>支払いが確認されました</h1>
          <p><span className="status-badge badge-confirmed">現在のステータス：確認済み</span></p>
          <p>ご協力ありがとうございました！</p>
          <button className="btn btn-secondary btn-lg" onClick={leave}>この部屋から抜ける</button>
        </section>
      </main>
    )
  }

  return (
    <main className="container">
      <section className="card">
        <h1>{member.name} さんの支払い</h1>
        <p className="payment-amount">{formatMoney(event.amountPerPerson)}</p>
        <p>支払い方法: {paymentLabel(event.paymentMethod)}</p>
        <div className="url-card">
          <p>支払い情報</p>
          <p>{event.paymentInfo}</p>
          {event.memo && <p className="sub">メモ: {event.memo}</p>}
        </div>
        <label className="field">
          <span>支払い報告メモ（任意）</span>
          <textarea placeholder="振込名義・補足など" value={proofMemo} onChange={(e) => setProofMemo(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-lg">支払う</button>
        <button className="btn btn-confirm btn-lg" disabled={loading} onClick={report}>{loading ? '送信中...' : '支払いを報告する'}</button>
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

  if (route.mode === 'admin') return <AdminPage eventId={route.eventId} token={route.token} />
  if (route.mode === 'join') return <JoinPage eventId={route.eventId} token={route.token} />
  return <EventCreatePage />
}
