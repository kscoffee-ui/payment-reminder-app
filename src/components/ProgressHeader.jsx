export default function ProgressHeader({ unpaidCount, paymentRate }) {
  return (
    <header className="progress-head">
      <h2>あと {unpaidCount} 人未払い</h2>
      <p>支払い完了率 {paymentRate}%</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${paymentRate}%` }} />
      </div>
    </header>
  )
}
