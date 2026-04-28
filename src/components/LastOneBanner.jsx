export default function LastOneBanner({ show }) {
  if (!show) return null
  return <p className="last-one">ラスト1人です！</p>
}
