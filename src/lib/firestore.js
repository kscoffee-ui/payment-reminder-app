import { collectionUrl, docUrl } from '../firebase'

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
    throw new Error(json?.error?.message || 'Firestore通信に失敗しました。')
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

function poller(load, onData, onError) {
  let active = true

  const tick = async () => {
    if (!active) return
    try {
      const data = await load()
      onData(data)
    } catch (e) {
      onError?.(e)
    } finally {
      if (active) setTimeout(tick, 1500)
    }
  }
  tick()
  return () => {
    active = false
  }
}

export function subscribeEvent(eventId, onData, onError) {
  return poller(() => getEvent(eventId), onData, onError)
}

export function subscribeMembers(eventId, onData, onError) {
  return poller(async () => {
    const json = await request(collectionUrl(`events/${eventId}/members`))
    return (json.documents || []).map(fromDoc)
  }, onData, onError)
}

export function subscribeMember(eventId, memberId, onData, onError) {
  return poller(async () => {
    const json = await request(docUrl(`events/${eventId}/members/${memberId}`))
    return fromDoc(json)
  }, onData, onError)
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

export async function confirmPayment({ eventId, memberId }) {
  const member = await request(docUrl(`events/${eventId}/members/${memberId}`)).then(fromDoc)
  if (member.status !== 'reported') throw new Error('報告済みの参加者のみ確認できます。')

  await request(
    `${docUrl(`events/${eventId}/members/${memberId}`)}&updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`,
    {
    method: 'PATCH',
    body: JSON.stringify(toDoc({ status: 'confirmed', updatedAt: new Date().toISOString() })),
    },
  )
}

export async function removeMember({ eventId, memberId }) {
  await request(docUrl(`events/${eventId}/members/${memberId}`), { method: 'DELETE' })
}
