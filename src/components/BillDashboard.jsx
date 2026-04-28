import { useMemo, useState } from 'react'
import LastOneBanner from './LastOneBanner'
import MemberList from './MemberList'
import PaymentInfoCard from './PaymentInfoCard'
import ProgressHeader from './ProgressHeader'
import ReminderPanel from './ReminderPanel'
import { buildReminderMessage } from '../lib/reminder'

export default function BillDashboard({
  bill,
  selectedMember,
  onChangeSelf,
  onTogglePaid,
  onLock,
  loading,
}) {
  const [message, setMessage] = useState('')
  const unpaidCount = bill.members.filter((member) => !member.paid).length
  const paymentRate = Math.round(((bill.members.length - unpaidCount) / bill.members.length) * 100)

  const disablePaidAction = !selectedMember || bill.isLocked || (unpaidCount === 1 && selectedMember.paid)
  const reminderMessage = useMemo(
    () =>
      buildReminderMessage({
        unpaidCount,
        paymentRate,
        url: window.location.href,
      }),
    [paymentRate, unpaidCount],
  )

  const onCopyPaymentInfo = async () => {
    await navigator.clipboard.writeText(bill.paymentInfo)
    setMessage('支払い先情報をコピーしました。')
  }

  return (
    <section className="phone-frame">
      <div className="top-row nav-row">
        <h1 className="app-title">
          飲み会 <span className="date-label">(2024/05/20)</span>
        </h1>
        <button type="button" className="icon-btn" onClick={onChangeSelf} aria-label="名前を変更する">
          ⚙
        </button>
      </div>

      {unpaidCount === 1 ? (
        <LastOneBanner show paymentRate={paymentRate} />
      ) : (
        <ProgressHeader unpaidCount={unpaidCount} paymentRate={paymentRate} />
      )}

      <MemberList members={bill.members} />

      {selectedMember && (
        <PaymentInfoCard
          paymentInfo={bill.paymentInfo}
          amount={selectedMember.amount}
          onCopy={onCopyPaymentInfo}
        />
      )}

      <button
        type="button"
        className="cta-button"
        disabled={disablePaidAction || loading}
        onClick={() => onTogglePaid(!selectedMember.paid)}
      >
        支払い済みにする ✓
      </button>
      <p className="sub cta-note">※支払いが完了したらタップ</p>

      <ReminderPanel message={reminderMessage} />

      <button type="button" className="name-change-btn" onClick={onChangeSelf}>
        名前を変更する
      </button>

      {!bill.isLocked && (
        <button type="button" className="secondary" onClick={onLock}>
          イベントをロックする
        </button>
      )}

      {bill.isLocked && <p className="sub">この割り勘はロック済みです（閲覧のみ）。</p>}
      {message && <p className="sub">{message}</p>}
    </section>
  )
}
