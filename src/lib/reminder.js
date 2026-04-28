export function createLineShareUrl(message) {
  return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`
}

export function buildReminderMessage({ event, unpaidMembers, joinUrl, progressRate }) {
  const names = unpaidMembers.map((member) => `・${member.name}`).join('\n') || 'なし'
  return `【${event.title}】\n未払い: ${unpaidMembers.length}人\n支払い完了率: ${progressRate}%\n\n未払いメンバー\n${names}\n\n支払いはこちら\n${joinUrl}`
}
