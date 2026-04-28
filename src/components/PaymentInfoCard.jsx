export default function PaymentInfoCard({ paymentInfo, amount, onCopy }) {
  return (
    <section className="card payment-info-card">
      <div className="payment-amount">
        <p>あなたの支払い金額</p>
        <strong>¥{amount.toLocaleString('ja-JP')}</strong>
      </div>

      <h3>支払い先情報</h3>
      <div className="payment-row">
        <span>{paymentInfo}</span>
        <button type="button" className="secondary copy-btn" onClick={onCopy}>
          コピー
        </button>
      </div>
    </section>
  )
}
