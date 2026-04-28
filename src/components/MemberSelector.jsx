export default function MemberSelector({ members, selectedId, onSelect }) {
  return (
    <section className="phone-frame">
      <div className="screen-head">
        <h1>自分の名前を選択</h1>
        <p className="sub">あなたは誰ですか？</p>
      </div>

      <div className="stack">
        {members.map((member, index) => (
          <label className={`radio-row ${selectedId === member.id ? 'selected' : ''}`} key={member.id}>
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

      <button type="button" className="secondary muted-btn">
        名前を変更する
      </button>
    </section>
  )
}
