export default function MemberSelector({ members, selectedId, onSelect }) {
  return (
    <section className="phone-frame">
      <h1 className="screen-title">自分の名前を選択</h1>
      <p className="sub">あなたは誰ですか？</p>
      <div className="stack">
        {members.map((member, index) => (
          <label className="radio-row" key={member.id}>
            <input
              type="radio"
              name="self"
              checked={selectedId === member.id}
              onChange={() => onSelect(member.id)}
            />
            <span>{member.name}</span>
            <small>{index + 1}</small>
          </label>
        ))}
      </div>
      <p className="sub" style={{ textAlign: 'center' }}>
        ※あとから変更できます
      </p>
    </section>
  )
}
