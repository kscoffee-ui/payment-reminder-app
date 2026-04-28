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
      <form className="card" onSubmit={onSubmit}>
        <h1>未払い回収イベント作成</h1>
        <input placeholder="イベント名" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
        <input type="number" min="1" placeholder="1人あたりの金額" value={form.amountPerPerson} onChange={(e) => setForm({ ...form, amountPerPerson: e.target.value })} />
        <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
          <option value="paypay">PayPay</option>
          <option value="cash">現金</option>
          <option value="bank">銀行振込</option>
          <option value="other">その他</option>
        </select>
        <textarea placeholder="支払い情報" value={form.paymentInfo} onChange={(e) => setForm({ ...form, paymentInfo: e.target.value })} />
        <textarea placeholder="任意メモ" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button disabled={loading}>{loading ? '作成中...' : '作成する'}</button>
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
    const unpaid = members.filter((m) => m.status === 'unpaid').length
    const reported = members.filter((m) => m.status === 'reported').length
    const confirmed = members.filter((m) => m.status === 'confirmed').length
    const rate = members.length ? Math.round((confirmed / members.length) * 100) : 0
    return { unpaid, reported, confirmed, rate }
  }, [members])

  if (error) return <main className="container"><section className="card"><p className="error">{error}</p></section></main>
  if (!event) return <main className="container"><section className="card"><p>読み込み中...</p></section></main>

  const reminderMessage = buildReminderMessage({
    event,
    unpaidMembers: members.filter((m) => m.status === 'unpaid'),
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

  return (
    <main className="container">
      <section className="card">
        <h1>{event.title}</h1>
        <p>{event.eventDate} / ¥{Number(event.amountPerPerson).toLocaleString('ja-JP')}</p>
        <p>参加者: {members.length}人 ・ 未払い: <b>{counts.unpaid}</b>人 ・ 報告済み: {counts.reported}人 ・ 確認済み: {counts.confirmed}人</p>
        <p>支払い完了率 {counts.rate}%</p>
        <progress max="100" value={counts.rate} />

        <h2>参加者URL</h2>
        <a href={joinUrl}>{joinUrl}</a>
        <a className="line" href={createLineShareUrl(reminderMessage)} target="_blank" rel="noreferrer">LINEで催促</a>

        {created && (
          <>
            <h2>作成完了</h2>
            <p>幹事用URL</p>
            <a href={adminUrl}>{adminUrl}</a>
            <p>参加者URL</p>
            <a href={joinUrl}>{joinUrl}</a>
          </>
        )}

        <h2>参加者一覧</h2>
        <ul className="list">
          {members.map((member) => (
            <li key={member.id} className={member.status === 'unpaid' ? 'unpaid' : ''}>
              <div>
                <b>{member.name}</b> / {statusLabel(member.status)} / {paymentLabel(member.paymentMethod)}
                <div className="sub">メモ: {member.proofMemo || 'なし'} / 更新: {member.updatedAt || '-'}</div>
              </div>
              <div className="actions">
                {member.status === 'reported' && (
                  <button disabled={workingId === member.id} onClick={() => confirm(member.id)}>確認済みにする</button>
                )}
                <button className="danger" disabled={workingId === member.id} onClick={() => remove(member.id)}>削除</button>
              </div>
            </li>
          ))}
        </ul>
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
          <p>{event.title} / {event.eventDate}</p>
          <p>金額: ¥{Number(event.amountPerPerson).toLocaleString('ja-JP')}</p>
          <input placeholder="あなたの名前" value={name} onChange={(e) => setName(e.target.value)} />
          <button disabled={loading} onClick={join}>{loading ? '参加中...' : '参加する'}</button>
        </section>
      </main>
    )
  }

  if (member.status === 'reported') {
    return (
      <main className="container"><section className="card"><h1>支払いを報告しました</h1><p>現在のステータス：確認待ち</p><p>幹事の確認後に「確認済み」になります。</p><button onClick={leave}>この部屋から抜ける</button></section></main>
    )
  }

  if (member.status === 'confirmed') {
    return (
      <main className="container"><section className="card"><h1>支払いが確認されました</h1><p>現在のステータス：確認済み</p><p>ご協力ありがとうございました！</p><button onClick={leave}>この部屋から抜ける</button></section></main>
    )
  }

  return (
    <main className="container">
      <section className="card">
        <h1>{member.name} さんの支払い</h1>
        <p>金額: ¥{Number(event.amountPerPerson).toLocaleString('ja-JP')}</p>
        <p>支払い方法: {paymentLabel(event.paymentMethod)}</p>
        <p>支払い情報: {event.paymentInfo}</p>
        <textarea placeholder="支払い報告メモ（任意）" value={proofMemo} onChange={(e) => setProofMemo(e.target.value)} />
        <button className="cta">支払う</button>
        <button disabled={loading} onClick={report}>{loading ? '送信中...' : '支払いを報告する'}</button>
        <button className="secondary" onClick={leave}>この部屋から抜ける</button>
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
