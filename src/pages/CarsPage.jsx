import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import SearchBox from '../components/SearchBox'
import CarCard from '../components/CarCard'
import { cars } from '../data/mock'

export default function CarsPage() {
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const driverAge = params.get('driverAge') || '26'
  const pickupOption = params.get('pickupOption') || 'pickup'

  const filteredCars = cars.filter((car) => {
    if (driverAge === '26') return car.ageLabel.includes('26')
    return true
  })

  return (
    <PageShell>
      <main className="section-bg cars-page refined-cars-page">
        <div className="container cars-layout refined-stack">
          <SearchBox compact />

          <div className="list-head-row refined-head-row">
            <strong>총 {filteredCars.length}대 · {pickupOption === 'pickup' ? '픽업' : '딜리버리'}</strong>
            <div className="sort-buttons simple refined-sort">
              <button className="active">낮은 가격순</button>
              <button>높은 가격순</button>
              <button>신차순</button>
            </div>
          </div>

          <div className="car-list clean refined-list">
            {filteredCars.map((car) => <CarCard key={car.id} car={car} />)}
          </div>
        </div>
      </main>
    </PageShell>
  )
}
