export default function ContactInfoStrip({ items }) {
  return (
    <section className="landing-contact-section" id="landing-contact">
      <div className="container landing-section-stack">
        <div className="landing-section-copy">
          <span className="landing-section-kicker">CONTACT & HOURS</span>
          <h2>운영 정보</h2>
          <p>예약 전 확인이 필요한 핵심 운영 정보를 한 번에 정리했습니다.</p>
        </div>

        <div className="landing-contact-grid">
          {items.map((item) => (
            <article key={item.label} className="landing-contact-card">
              <span className="field-label">{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
