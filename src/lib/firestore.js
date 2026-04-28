import { assertFirebaseConfig, getFirestoreUrl } from '../firebase'

const COLLECTION = 'bills'

function randomBillId() {
  return Math.random().toString(36).slice(2, 12)
}

function isIsoDateString(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
}

function encodeMember(member) {
  return {
    mapValue: {
      fields: {
        id: { stringValue: member.id },
        name: { stringValue: member.name },
        amount: { integerValue: String(member.amount) },
        paid: { booleanValue: member.paid },
        updatedAt: { timestampValue: member.updatedAt },
        updatedBy: { stringValue: member.updatedBy || '' },
      },
    },
  }
}

function decodeMember(value) {
  const fields = value?.mapValue?.fields || {}
  return {
    id: fields.id?.stringValue || '',
    name: fields.name?.stringValue || '',
    amount: Number(fields.amount?.integerValue || 0),
    paid: Boolean(fields.paid?.booleanValue),
    updatedAt: fields.updatedAt?.timestampValue || '',
    updatedBy: fields.updatedBy?.stringValue || '',
  }
}

function encodeValue(key, value) {
  if (key === 'members' && Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(encodeMember),
      },
    }
  }

  if (typeof value === 'string') {
    if (key === 'createdAt' || key === 'updatedAt' || isIsoDateString(value)) {
      return { timestampValue: value }
    }
    return { stringValue: value }
  }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => encodeValue('', item)) } }
  }
  if (value && typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, encodeValue(k, v)]),
        ),
      },
    }
  }
  return { nullValue: null }
}

function getArrayValues(value) {
  // 読み取りのみ listValue 互換を維持
  return value?.arrayValue?.values || value?.listValue?.values || []
}

function decodeValue(key, value) {
  if (key === 'members') {
    const values = getArrayValues(value)
    return values.map(decodeMember)
  }

  if ('stringValue' in value) return value.stringValue
  if ('timestampValue' in value) return value.timestampValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('arrayValue' in value || 'listValue' in value) {
    const values = getArrayValues(value)
    return values.map((item) => decodeValue('', item))
  }
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {}
    return Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, decodeValue(k, v)]),
    )
  }
  return null
}

function toFirestoreDoc(data) {
  return {
    fields: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, encodeValue(k, v)]),
    ),
  }
}

function fromFirestoreDoc(doc) {
  const fields = doc.fields || {}
  const value = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(k, v)]))
  value._updateTime = doc.updateTime
  return value
}

function buildErrorMessage({ url, status, statusText, firestoreMessage, rawBody, cause }) {
  return [
    'Firestore通信に失敗しました。',
    `url=${url}`,
    `status=${status ?? 'FETCH_ERROR'} ${statusText ?? ''}`.trim(),
    firestoreMessage ? `firestore=${firestoreMessage}` : '',
    rawBody ? `body=${rawBody}` : '',
    cause ? `cause=${cause}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

async function requestJson(url, options = {}) {
  assertFirebaseConfig()

  let res
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (error) {
    const detail = buildErrorMessage({
      url,
      cause: error instanceof Error ? error.message : String(error),
    })
    console.error(detail)
    throw new Error(detail)
  }

  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = {}
  }

  if (!res.ok) {
    const detail = buildErrorMessage({
      url,
      status: res.status,
      statusText: res.statusText,
      firestoreMessage: json?.error?.message,
      rawBody: text,
    })
    console.error(detail)
    throw new Error(detail)
  }

  return json
}

export async function createBill(data) {
  const id = randomBillId()
  const now = new Date().toISOString()
  const doc = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  }

  await requestJson(getFirestoreUrl(`${COLLECTION}/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(toFirestoreDoc(doc)),
  })

  return id
}

export async function getBill(billId) {
  const doc = await requestJson(getFirestoreUrl(`${COLLECTION}/${billId}`))
  return fromFirestoreDoc(doc)
}

export function subscribeBill(billId, onData, onError) {
  let active = true

  const pull = async () => {
    if (!active) return
    try {
      const bill = await getBill(billId)
      onData(bill)
    } catch (error) {
      onError?.(error)
    }
  }

  pull()
  const timer = setInterval(pull, 3000)
  return () => {
    active = false
    clearInterval(timer)
  }
}

export async function updateMemberPaidStatus({ billId, actorMemberId, targetMemberId, paid }) {
  const bill = await getBill(billId)

  if (bill.isLocked) {
    throw new Error('この割り勘はロックされています。')
  }

  const exists = bill.members.some((member) => member.id === actorMemberId)
  if (!exists) {
    throw new Error('メンバー識別情報が無効です。')
  }

  const nextMembers = bill.members.map((member) => {
    if (member.id !== targetMemberId) return member
    return {
      ...member,
      paid,
      updatedAt: new Date().toISOString(),
      updatedBy: actorMemberId,
    }
  })

  const nextBill = {
    ...bill,
    members: nextMembers,
    updatedAt: new Date().toISOString(),
  }

  await requestJson(getFirestoreUrl(`${COLLECTION}/${billId}`), {
    method: 'PATCH',
    body: JSON.stringify(toFirestoreDoc(nextBill)),
  })
}

export async function lockBill({ billId }) {
  const bill = await getBill(billId)
  const nextBill = {
    ...bill,
    isLocked: true,
    updatedAt: new Date().toISOString(),
  }

  await requestJson(getFirestoreUrl(`${COLLECTION}/${billId}`), {
    method: 'PATCH',
    body: JSON.stringify(toFirestoreDoc(nextBill)),
  })
}
