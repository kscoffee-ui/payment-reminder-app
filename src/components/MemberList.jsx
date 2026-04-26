function MemberCard({ member, order, accent }) {
  return (
    <div className={`member-card ${accent ? 'unpaid' : ''}`}>
      <div>
        <strong>{member.name}</strong>
        <small>{order}</small>
      </div>
      <span>¥{member.amount.toLocaleString('ja-JP')}</span>
    </div>
  )
}

export default function MemberList({ members }) {
  const unpaid = members.filter((member) => !member.paid)
  const paid = members.filter((member) => member.paid)

  return (
    <>
      <section>
        <h3>未払いの人（{unpaid.length}人）</h3>
        <div className="stack">
          {unpaid.map((member, i) => (
            <MemberCard key={member.id} member={member} order={i + 1} accent />
          ))}
        </div>
      </section>

      <section>
        <h3>支払い済みの人（{paid.length}人）</h3>
        <div className="stack">
          {paid.map((member, i) => (
            <MemberCard key={member.id} member={member} order={i + 1} />
          ))}
        </div>
      </section>
    </>
  )
}
