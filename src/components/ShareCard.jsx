import { useMemo, useState } from 'react'
import { createLineShareUrl } from '../lib/reminder'

export default function ShareCard() {
  const [copied, setCopied] = useState(false)
  const shareUrl = window.location.href

  const lineMessage = useMemo(
    () =>
      `割り勘の支払い確認はこちら👇\n自分の名前を選んで、支払いが終わったらチェックお願いします！\n${shareUrl}`,
    [shareUrl],
  )

  const onCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="card share-card">
      <h3>みんなに共有</h3>
      <p className="helper">このリンクをグループLINEに送れば、メンバーが自分で支払い済みにできます</p>
      <div className="share-actions">
        <button type="button" className="secondary" onClick={onCopyLink}>
          リンクをコピー
        </button>
        <a className="line-btn" href={createLineShareUrl(lineMessage)} target="_blank" rel="noreferrer">
          LINEで共有
        </a>
      </div>
      {copied && <p className="caption">コピーしました</p>}
    </section>
  )
}
