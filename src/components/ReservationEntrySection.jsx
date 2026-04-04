import SearchBox from './SearchBox'

export default function ReservationEntrySection() {
  return (
    <section className="landing-reservation-section" id="landing-reservation">
      <div className="container landing-section-stack">
        <div className="landing-section-copy">
          <span className="landing-section-kicker">RESERVATION ENTRY</span>
          <h2>예약 시작</h2>
          <p>대여 일정과 수령 방식을 선택하면 바로 예약 가능한 차량을 확인할 수 있습니다.</p>
        </div>

        <SearchBox />
      </div>
    </section>
  )
}
