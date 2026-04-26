import { useEffect, useMemo, useState } from 'react'
import './App.css'
import BillDashboard from './components/BillDashboard'
import CreateBillForm from './components/CreateBillForm'
import MemberSelector from './components/MemberSelector'
import { createBill, lockBill, subscribeBill, updateMemberPaidStatus } from './lib/firestore'
import { getSelectedMemberId, setSelectedMemberId } from './lib/storage'

function getRoute() {
  const [, segment, id] = window.location.pathname.split('/')
  if (segment === 'bill' && id) {
    return { mode: 'bill', billId: id }
  }
  return { mode: 'create', billId: '' }
}

export default function App() {
  const [{ mode, billId }, setRoute] = useState(() => getRoute())
  const [bill, setBill] = useState(null)
  const [selectedMemberId, setSelectedMember] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onPop = () => setRoute(getRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (mode !== 'bill' || !billId) return undefined
    const stored = getSelectedMemberId(billId)
    setSelectedMember(stored)

    const unsubscribe = subscribeBill(
      billId,
      (data) => {
        setBill(data)
        setError('')
      },
      (err) => setError(err.message),
    )

    return unsubscribe
  }, [billId, mode])

  const selectedMember = useMemo(
    () => bill?.members?.find((member) => member.id === selectedMemberId),
    [bill, selectedMemberId],
  )

  const handleCreate = async (payload) => {
    setLoading(true)
    setError('')
    try {
      const id = await createBill(payload)
      window.history.pushState({}, '', `/bill/${id}`)
      setRoute({ mode: 'bill', billId: id })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMember = (id) => {
    setSelectedMember(id)
    setSelectedMemberId(billId, id)
  }

  const handleTogglePaid = async (nextPaid) => {
    if (!selectedMember) return
    setLoading(true)
    setError('')
    try {
      await updateMemberPaidStatus({
        billId,
        actorMemberId: selectedMember.id,
        targetMemberId: selectedMember.id,
        paid: nextPaid,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLock = async () => {
    setLoading(true)
    setError('')
    try {
      await lockBill({ billId })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'create') {
    return (
      <main className="app-wrap">
        <CreateBillForm onCreate={handleCreate} loading={loading} />
        {error && <p className="error global-error">{error}</p>}
      </main>
    )
  }

  if (!bill) {
    return (
      <main className="app-wrap">
        <section className="phone-frame">
          <p>読み込み中...</p>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app-wrap">
      {!selectedMember ? (
        <MemberSelector
          members={bill.members}
          selectedId={selectedMemberId}
          onSelect={handleSelectMember}
        />
      ) : (
        <BillDashboard
          bill={bill}
          selectedMember={selectedMember}
          onChangeSelf={() => handleSelectMember('')}
          onTogglePaid={handleTogglePaid}
          onLock={handleLock}
          loading={loading}
        />
      )}
      {error && <p className="error global-error">{error}</p>}
    </main>
  )
}
