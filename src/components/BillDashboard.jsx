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

  const canToggle = selectedMember && !bill.isLocked
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
      <div className="top-row">
        <h1>飲み会</h1>
        <button type="button" className="link-btn" onClick={onChangeSelf}>
          名前を変更する
        </button>
      </div>

      <ProgressHeader unpaidCount={unpaidCount} paymentRate={paymentRate} />
      <LastOneBanner show={unpaidCount === 1} />
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
        disabled={!canToggle || loading || !selectedMember}
        onClick={() => onTogglePaid(!selectedMember.paid)}
      >
        {selectedMember?.paid ? '支払い済みを解除する' : '支払い済みにする'}
      </button>

      <ReminderPanel message={reminderMessage} />

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
