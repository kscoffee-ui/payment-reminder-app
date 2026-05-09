const KEY_PREFIX = 'paymentReminderMember:'
const ADMIN_EVENTS_KEY = 'kaishuruAdminEvents'
const MAX_ADMIN_EVENTS = 5

function getStorage() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null
  return window.localStorage
}

export function getMemberBinding(eventId) {
  const storage = getStorage()
  if (!storage) return null
  const raw = storage.getItem(`${KEY_PREFIX}${eventId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setMemberBinding({ eventId, memberId, memberName }) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(
    `${KEY_PREFIX}${eventId}`,
    JSON.stringify({ eventId, memberId, memberName }),
  )
}

export function clearMemberBinding(eventId) {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(`${KEY_PREFIX}${eventId}`)
}

export function getAdminEvents() {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(ADMIN_EVENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item?.eventId && item?.adminToken)
  } catch {
    return []
  }
}

export function saveAdminEvent(event) {
  if (!event?.eventId || !event?.adminToken) return
  const storage = getStorage()
  if (!storage) return

  const nextEvent = {
    eventId: event.eventId,
    adminToken: event.adminToken,
    title: event.title || '',
    eventDate: event.eventDate || '',
    amountPerPerson: Number(event.amountPerPerson || 0),
    createdAt: event.createdAt || new Date().toISOString(),
  }

  const rest = getAdminEvents().filter((item) => item.eventId !== event.eventId)
  const next = [nextEvent, ...rest].slice(0, MAX_ADMIN_EVENTS)
  try {
    storage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(next))
  } catch {
    // localStorage容量不足などでも画面を落とさない
  }
}

export function removeAdminEvent(eventId) {
  if (!eventId) return
  const storage = getStorage()
  if (!storage) return
  const next = getAdminEvents().filter((item) => item.eventId !== eventId)
  try {
    storage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(next))
  } catch {
    // noop
  }
}
