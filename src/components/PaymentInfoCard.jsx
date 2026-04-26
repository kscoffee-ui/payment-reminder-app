export default function PaymentInfoCard({ paymentInfo, amount, onCopy }) {
  return (
    <section className="card">
      <p>あなたの支払い金額</p>
      <h2>¥{amount.toLocaleString('ja-JP')}</h2>
      <p>支払い先情報</p>
      <div className="payment-row">
        <span>{paymentInfo}</span>
        <button type="button" className="secondary" onClick={onCopy}>
          コピー
        </button>
      </div>
    </section>
  )
}
