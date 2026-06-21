import { collectionUrl, docUrl } from '../firebase'

const POLL_INTERVAL_MS = 60000
const QUOTA_ERROR_MESSAGE = '現在アクセスが集中しているため、少し時間をおいて再読み込みしてください。'

function randomToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

function encode(v) {
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'number') return { integerValue: String(v) }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  if (v && typeof v === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, encode(val)])) } }
  }
  return { nullValue: null }
}

function decode(v) {
  if (!v) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode)
  if ('mapValue' in v) {
    const fields = v.mapValue.fields || {}
    return Object.fromEntries(Object.entries(fields).map(([k, val]) => [k, decode(val)]))
  }
  return null
}

function toDoc(data) {
  return { fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])) }
}

function fromDoc(doc) {
  const fields = doc.fields || {}
  const value = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]))
  return { id: doc.name.split('/').pop(), ...value }
}

async function request(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const rawMessage = json?.error?.message || 'Firestore通信に失敗しました。'
    const errorCode = json?.error?.status || json?.error?.code || ''
    const error = new Error(isQuotaLikeError(res.status, rawMessage, errorCode) ? QUOTA_ERROR_MESSAGE : rawMessage)
    error.status = res.status
    error.code = errorCode
    throw error
  }
  return json
}

export async function createEvent(payload) {
  const participantToken = randomToken()
  const adminToken = randomToken()
  const now = new Date().toISOString()

  const created = await request(collectionUrl('events'), {
    method: 'POST',
    body: JSON.stringify(
      toDoc({
        title: payload.title,
        eventDate: payload.eventDate,
        amountPerPerson: payload.amountPerPerson,
        paymentMethod: payload.paymentMethod,
        paymentInfo: payload.paymentInfo,
        memo: payload.memo,
        participantToken,
        adminToken,
        createdAt: now,
        updatedAt: now,
      }),
    ),
  })

  const eventId = created.name.split('/').pop()
  await request(`${docUrl(`events/${eventId}`)}&updateMask.fieldPaths=id&updateMask.fieldPaths=updatedAt`, {
    method: 'PATCH',
    body: JSON.stringify(toDoc({ id: eventId, updatedAt: now })),
  })

  return { eventId, participantToken, adminToken }
}

export async function getEvent(eventId) {
  const json = await request(docUrl(`events/${eventId}`))
  return fromDoc(json)
}

function isQuotaLikeError(status, message, code) {
  const lowerMessage = String(message || '').toLowerCase()
  const lowerCode = String(code || '').toLowerCase()
  return status === 429
    || lowerCode.includes('resource_exhausted')
    || lowerCode.includes('quota')
    || lowerMessage.includes('quota exceeded')
    || lowerMessage.includes('resource exhausted')
    || lowerMessage.includes('resource_exhausted')
    || lowerMessage.includes('too many requests')
}

function isQuotaError(error) {
  return isQuotaLikeError(error?.status, error?.message, error?.code)
}

function poller(load, onData, onError, options = {}) {
  const intervalMs = options.intervalMs || POLL_INTERVAL_MS
  const immediate = options.immediate !== false
  // Firestore read節約のため、タブ非表示中やオフライン中はpollingを止める
  let active = true
  let timerId = null
  let quotaStopped = false

  const isDocumentHidden = () => typeof document !== 'undefined' && document.hidden
  const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
  const shouldPause = () => isDocumentHidden() || isOffline() || quotaStopped

  const clearTimer = () => {
    if (!timerId) return
    clearTimeout(timerId)
    timerId = null
  }

  const schedule = (delay) => {
    clearTimer()
    if (!active || shouldPause()) return
    timerId = setTimeout(tick, delay)
  }

  const tick = async () => {
    clearTimer()
    if (!active || shouldPause()) return
    try {
      const data = await load()
      if (!active) return
      onData(data)
      schedule(intervalMs)
    } catch (e) {
      if (!active) return
      if (isQuotaError(e)) {
        quotaStopped = true
        clearTimer()
        onError?.(e)
        return
      }
      onError?.(e)
      schedule(intervalMs)
    }
  }

  const pause = () => {
    clearTimer()
  }

  const resume = () => {
    if (!active || quotaStopped) return
    tick()
  }

  const handleVisibilityChange = () => {
    if (isDocumentHidden()) {
      pause()
      return
    }
    resume()
  }

  const handleOnline = () => {
    resume()
  }

  const handleOffline = () => {
    pause()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  if (immediate) {
    tick()
  } else {
    schedule(intervalMs)
  }

  return () => {
    active = false
    clearTimer()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }
}

export function subscribeEvent(eventId, onData, onError, options) {
  return poller(() => getEvent(eventId), onData, onError, options)
}

export function subscribeMembers(eventId, onData, onError, options) {
  return poller(async () => {
    const json = await request(collectionUrl(`events/${eventId}/members`))
    return (json.documents || []).map(fromDoc)
  }, onData, onError, options)
}

export function subscribeMember(eventId, memberId, onData, onError, options) {
  return poller(async () => {
    const json = await request(docUrl(`events/${eventId}/members/${memberId}`))
    return fromDoc(json)
  }, onData, onError, options)
}

export async function joinEvent({ eventId, name, paymentMethod }) {
  const now = new Date().toISOString()
  const created = await request(collectionUrl(`events/${eventId}/members`), {
    method: 'POST',
    body: JSON.stringify(toDoc({
      name,
      status: 'unpaid',
      paymentMethod,
      proofMemo: '',
      createdAt: now,
      updatedAt: now,
    })),
  })
  const memberId = created.name.split('/').pop()
  await request(`${docUrl(`events/${eventId}/members/${memberId}`)}&updateMask.fieldPaths=id&updateMask.fieldPaths=updatedAt`, {
    method: 'PATCH',
    body: JSON.stringify(toDoc({ id: memberId, updatedAt: now })),
  })
  return memberId
}

export async function reportPayment({ eventId, memberId, proofMemo }) {
  const member = await request(docUrl(`events/${eventId}/members/${memberId}`)).then(fromDoc)
  if (member.status === 'confirmed') throw new Error('すでに確認済みです。')
  if (member.status !== 'unpaid') throw new Error('この状態では報告できません。')

  await request(
    `${docUrl(`events/${eventId}/members/${memberId}`)}&updateMask.fieldPaths=status&updateMask.fieldPaths=proofMemo&updateMask.fieldPaths=updatedAt`,
    {
    method: 'PATCH',
    body: JSON.stringify(toDoc({
      status: 'reported',
      proofMemo: proofMemo.trim(),
      updatedAt: new Date().toISOString(),
    })),
    },
  )
}

export async function confirmPayment({ eventId, memberId, allowUnreported = false }) {
  const member = await request(docUrl(`events/${eventId}/members/${memberId}`)).then(fromDoc)
  const canConfirm = member.status === 'reported' || (allowUnreported && member.status === 'unpaid')
  if (!canConfirm) throw new Error(allowUnreported ? '未払いまたは報告済みの参加者のみ確認できます。' : '報告済みの参加者のみ確認できます。')

  await request(
    `${docUrl(`events/${eventId}/members/${memberId}`)}&updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`,
    {
    method: 'PATCH',
    body: JSON.stringify(toDoc({ status: 'confirmed', updatedAt: new Date().toISOString() })),
    },
  )
}

export async function returnReportToUnpaid({ eventId, memberId, allowConfirmed = false }) {
  const member = await request(docUrl(`events/${eventId}/members/${memberId}`)).then(fromDoc)
  const canReturn = member.status === 'reported' || (allowConfirmed && member.status === 'confirmed')
  if (!canReturn) throw new Error(allowConfirmed ? '確認待ちまたは確認済みの参加者のみ未払いに戻せます。' : '確認待ちの参加者のみ未払いに戻せます。')

  await request(
    `${docUrl(`events/${eventId}/members/${memberId}`)}&updateMask.fieldPaths=status&updateMask.fieldPaths=proofMemo&updateMask.fieldPaths=updatedAt`,
    {
    method: 'PATCH',
    body: JSON.stringify(toDoc({
      status: 'unpaid',
      proofMemo: '',
      updatedAt: new Date().toISOString(),
    })),
    },
  )
}

export async function removeMember({ eventId, memberId }) {
  await request(docUrl(`events/${eventId}/members/${memberId}`), { method: 'DELETE' })
}

export async function updateEventInfo(eventId, payload) {
  const now = new Date().toISOString()
  await request(
    `${docUrl(`events/${eventId}`)}&updateMask.fieldPaths=title&updateMask.fieldPaths=eventDate&updateMask.fieldPaths=amountPerPerson&updateMask.fieldPaths=paymentMethod&updateMask.fieldPaths=paymentInfo&updateMask.fieldPaths=memo&updateMask.fieldPaths=updatedAt`,
    {
      method: 'PATCH',
      body: JSON.stringify(toDoc({
        title: payload.title,
        eventDate: payload.eventDate,
        amountPerPerson: payload.amountPerPerson,
        paymentMethod: payload.paymentMethod,
        paymentInfo: payload.paymentInfo,
        memo: payload.memo,
        updatedAt: now,
      })),
    },
  )
}
