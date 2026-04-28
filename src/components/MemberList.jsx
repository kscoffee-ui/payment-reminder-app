function MemberCard({ member, order, unpaid }) {
  return (
    <div className={`member-card ${unpaid ? 'unpaid' : 'paid'}`}>
      <div className="member-main">
        <strong>{member.name}</strong>
        <small>{order}</small>
      </div>
      <span className="member-amount">
        {!unpaid && <i className="badge-paid">済</i>}¥{member.amount.toLocaleString('ja-JP')}
      </span>
    </div>
  )
}

export default function MemberList({ members }) {
  const unpaid = members.filter((member) => !member.paid)
  const paid = members.filter((member) => member.paid)
  const memberOrders = new Map(members.map((member, index) => [member.id, index + 1]))

  return (
    <>
      <section>
        <h3>未払いの人（{unpaid.length}人）</h3>
        <div className="stack">
          {unpaid.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              order={memberOrders.get(member.id)}
              unpaid
            />
          ))}
        </div>
      </section>

      <section>
        <h3>支払い済みの人（{paid.length}人）</h3>
        <div className="stack">
          {paid.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              order={memberOrders.get(member.id)}
              unpaid={false}
            />
          ))}
        </div>
      </section>
    </>
  )
}
