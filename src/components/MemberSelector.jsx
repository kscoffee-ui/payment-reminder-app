export default function MemberSelector({ members, selectedId, onSelect }) {
  return (
    <section className="phone-frame selector-screen">
      <div className="selector-head">
        <h1 className="screen-title">自分の名前を選択</h1>
        <p className="sub">あなたは誰ですか？</p>
      </div>

      <div className="stack selector-list">
        {members.map((member, index) => (
          <label className="radio-row" key={member.id}>
            <input
              type="radio"
              name="self"
              checked={selectedId === member.id}
              onChange={() => onSelect(member.id)}
            />
            <span className="member-name">{member.name}</span>
            <small>{index + 1}</small>
          </label>
        ))}
      </div>

      <p className="sub selector-note">※あとから変更できます</p>
      <button type="button" className="name-change-btn" onClick={() => onSelect('')}>
        名前を変更する
      </button>
    </section>
  )
}
