export function buildReminderMessage({ unpaidCount, paymentRate, url }) {
  if (unpaidCount <= 1) {
    return `ラスト1人です！\nこのリンクから確認＆支払い済みにしてください👇\n${url}`
  }

  return `現在${paymentRate}%完了！あと${unpaidCount}人です👇\nこのリンクから確認＆支払い済みにしてください。\n${url}`
}

export function createLineShareUrl(message) {
  return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`
}
