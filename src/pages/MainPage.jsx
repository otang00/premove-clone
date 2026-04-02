import { PageShell } from '../components/Layout'
import SearchBox from '../components/SearchBox'
import CarCard from '../components/CarCard'
import { cars } from '../data/mock'

export default function MainPage() {
  return (
    <PageShell>
      <main className="section-bg main-list-page refined-main">
        <section className="main-top-band">
          <div className="container top-band-inner">
            <p><span>믿고 타는 빵빵카(주),</span> <strong>지금 바로 예약해 보세요!</strong></p>
          </div>
        </section>

        <div className="container main-stack refined-stack">
          <SearchBox />

          <div className="list-head-row refined-head-row">
            <strong>총 {cars.length}대</strong>
            <div className="sort-buttons simple refined-sort">
              <button className="active">낮은 가격순</button>
              <button>높은 가격순</button>
              <button>신차순</button>
            </div>
          </div>

          <div className="car-list clean refined-list">
            {cars.map((car) => <CarCard key={car.id} car={car} />)}
          </div>
        </div>
      </main>
    </PageShell>
  )
}
