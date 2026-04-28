export default function LastOneBanner({ show, paymentRate }) {
  if (!show) return null

  return (
    <section className="last-one">
      <p className="last-one-title">ラスト 1 人です！</p>
      <p className="rate-row">支払い完了率 {paymentRate}%</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${paymentRate}%` }} />
      </div>
    </section>
  )
}
