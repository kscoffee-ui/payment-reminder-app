export default function PaymentInfoCard({ paymentInfo, amount, onCopy }) {
  return (
    <section className="card">
      <div className="payment-amount">
        <p>あなたの支払い金額</p>
        <strong>¥{amount.toLocaleString('ja-JP')}</strong>
      </div>
      <p>支払い先情報</p>
      <div className="payment-row">
        <span>{paymentInfo}</span>
        <button type="button" className="secondary copy-btn" onClick={onCopy}>
          コピー
        </button>
      </div>
    </section>
  )
}
