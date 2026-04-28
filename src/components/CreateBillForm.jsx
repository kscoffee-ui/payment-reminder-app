import { useMemo, useState } from 'react'
import { buildMembers } from '../lib/calc'

const EMPTY_MEMBERS = ['']

export default function CreateBillForm({ onCreate, loading }) {
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentInfo, setPaymentInfo] = useState('')
  const [members, setMembers] = useState(EMPTY_MEMBERS)
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => totalAmount && members.some((name) => name.trim()) && paymentInfo.trim(),
    [members, paymentInfo, totalAmount],
  )

  const updateMember = (index, value) => {
    setMembers((prev) => prev.map((member, i) => (i === index ? value : member)))
  }

  const addMember = () => setMembers((prev) => [...prev, ''])
  const removeMember = (index) => {
    setMembers((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const total = Number(totalAmount)
      const memberData = buildMembers(members, total)
      await onCreate({
        totalAmount: total,
        paymentInfo: paymentInfo.trim(),
        isLocked: false,
        members: memberData,
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="phone-frame" onSubmit={handleSubmit}>
      <h1 className="screen-title">割り勘を作成</h1>

      <label>合計金額</label>
      <div className="yen-input">
        <input
          type="number"
          min="1"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="12,345"
          required
        />
        <span>円</span>
      </div>
      <p className="sub input-note">※1円以上で入力してください</p>

      <label>メンバー（1人以上）</label>
      <div className="stack">
        {members.map((name, index) => (
          <div className="member-row" key={`member-${index}`}>
            <input
              value={name}
              onChange={(e) => updateMember(index, e.target.value)}
              placeholder="名前を入力"
              required
            />
            <button type="button" onClick={() => removeMember(index)}>
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="secondary" onClick={addMember}>
        ＋ メンバーを追加
      </button>

      <label>支払い情報（PayPay ID / 振込先など）</label>
      <textarea
        value={paymentInfo}
        maxLength={80}
        onChange={(e) => setPaymentInfo(e.target.value)}
        placeholder="PayPay ID: tanaka.paypay"
        required
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" className="cta-button" disabled={!canSubmit || loading}>
        {loading ? '作成中...' : '割り勘を作成する'}
      </button>
    </form>
  )
}
