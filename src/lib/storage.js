const KEY_PREFIX = 'paymentReminderMember:'

export function getMemberBinding(eventId) {
  const raw = localStorage.getItem(`${KEY_PREFIX}${eventId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setMemberBinding({ eventId, memberId, memberName }) {
  localStorage.setItem(
    `${KEY_PREFIX}${eventId}`,
    JSON.stringify({ eventId, memberId, memberName }),
  )
}

export function clearMemberBinding(eventId) {
  localStorage.removeItem(`${KEY_PREFIX}${eventId}`)
}
