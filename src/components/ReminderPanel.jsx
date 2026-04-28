import { createLineShareUrl } from '../lib/reminder'

export default function ReminderPanel({ message }) {
  const onCopy = async () => {
    await navigator.clipboard.writeText(message)
  }

  return (
    <section className="reminder-section">
      <header className="nav-header">
        <span className="icon-btn" aria-hidden>
          ←
        </span>
        <h2 className="nav-title">催促する</h2>
        <span className="icon-btn ghost" aria-hidden>
          ・
        </span>
      </header>

      <div className="stack">
        <div>
          <p className="helper">メッセージプレビュー</p>
          <div className="reminder-preview-wrap">
            <textarea value={message} readOnly rows={6} />
            <p className="caption counter">{message.length}/200</p>
          </div>
        </div>

        <button type="button" className="cta-button" onClick={onCopy}>
          メッセージをコピー
        </button>

        <a className="line-btn cta-button" href={createLineShareUrl(message)} target="_blank" rel="noreferrer">
          LINEで送る
        </a>

        <p className="caption">※URLを知っている人だけがアクセスできます</p>
      </div>
    </section>
  )
}
