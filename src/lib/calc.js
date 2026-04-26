export function splitAmountEvenly(totalAmount, memberCount) {
  if (!Number.isInteger(totalAmount) || totalAmount < 1) {
    throw new Error('合計金額は1円以上の整数で入力してください。')
  }

  if (!Number.isInteger(memberCount) || memberCount < 1) {
    throw new Error('メンバーは1人以上必要です。')
  }

  const base = Math.floor(totalAmount / memberCount)
  const remainder = totalAmount % memberCount

  return Array.from({ length: memberCount }, (_, index) =>
    index < remainder ? base + 1 : base,
  )
}

export function buildMembers(memberNames, totalAmount) {
  const trimmed = memberNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0)

  if (trimmed.length < 1) {
    throw new Error('メンバー名を1人以上入力してください。')
  }

  const amounts = splitAmountEvenly(totalAmount, trimmed.length)

  return trimmed.map((name, index) => ({
    id: createMemberId(),
    name,
    amount: amounts[index],
    paid: false,
    updatedAt: new Date().toISOString(),
    updatedBy: 'host',
  }))
}

export function createMemberLabel(name, index) {
  return `${name} ${index + 1}`
}

function createMemberId() {
  return `m_${Math.random().toString(36).slice(2, 10)}`
}
