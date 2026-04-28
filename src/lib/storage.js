const KEY_PREFIX = 'payment-reminder:selected-member:'

export function getSelectedMemberId(billId) {
  return localStorage.getItem(`${KEY_PREFIX}${billId}`) || ''
}

export function setSelectedMemberId(billId, memberId) {
  localStorage.setItem(`${KEY_PREFIX}${billId}`, memberId)
}
