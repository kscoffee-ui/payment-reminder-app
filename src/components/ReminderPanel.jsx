import { createLineShareUrl } from '../lib/reminder'

export default function ReminderPanel({ message }) {
  const onCopy = async () => {
    await navigator.clipboard.writeText(message)
  }

  return (
    <section className="card reminder-card">
      <h3>催促する</h3>
      <p className="sub">メッセージプレビュー</p>
      <textarea value={message} readOnly rows={6} />
      <button type="button" className="secondary" onClick={onCopy}>
        メッセージをコピー
      </button>
      <a className="line-btn" href={createLineShareUrl(message)} target="_blank" rel="noreferrer">
        LINEで送る
      </a>
    </section>
  )
}
