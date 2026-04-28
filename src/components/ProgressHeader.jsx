export default function ProgressHeader({ unpaidCount, paymentRate }) {
  return (
    <header className="progress-head">
      <div className="unpaid-kpi">
        <span className="label">あと</span>
        <span className="count">{unpaidCount}</span>
        <span className="unit">人未払い</span>
      </div>
      <p className="rate-row">支払い完了率&nbsp;{paymentRate}%</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${paymentRate}%` }} />
      </div>
    </header>
  )
}
