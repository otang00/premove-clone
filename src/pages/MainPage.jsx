import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import SearchBox from '../components/SearchBox'
import CarCard from '../components/CarCard'
import { parseSearchQuery, validateSearchState } from '../utils/searchQuery'
import { getMockCars } from '../services/cars'
import { getMockCompany } from '../services/company'

function EmptyState() {
  return (
    <div className="detail-card compact-card">
      <h2>차량이 없습니다</h2>
      <p className="muted small-note">현재 조건에 맞는 차량이 없습니다. 검색 조건을 다시 확인해 주세요.</p>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="detail-card compact-card">
      <h2>검색 상태 확인 필요</h2>
      <p className="muted small-note">{message}</p>
    </div>
  )
}

export default function MainPage() {
  const location = useLocation()
  const searchState = useMemo(() => parseSearchQuery(location.search), [location.search])
  const validation = useMemo(() => validateSearchState(searchState), [searchState])
  const company = useMemo(() => getMockCompany(), [])
  const { cars, totalCount } = useMemo(() => getMockCars(searchState), [searchState])

  const errorMessage = validation.isValid
    ? ''
    : Object.values(validation.errors)[0] || '잘못된 검색 조건입니다.'

  return (
    <PageShell>
      <main className="section-bg main-list-page refined-main">
        <section className="main-top-band">
          <div className="container top-band-inner">
            <p><span>믿고 타는 {company.name},</span> <strong>지금 바로 예약해 보세요!</strong></p>
          </div>
        </section>

        <div className="container main-stack refined-stack">
          <SearchBox />

          <div className="list-head-row refined-head-row">
            <strong>총 {totalCount}대</strong>
            <div className="sort-buttons simple refined-sort">
              <button className={searchState.order === 'lower' ? 'active' : ''}>낮은 가격순</button>
              <button className={searchState.order === 'higher' ? 'active' : ''}>높은 가격순</button>
              <button className={searchState.order === 'newer' ? 'active' : ''}>신차순</button>
            </div>
          </div>

          {!validation.isValid && <ErrorState message={errorMessage} />}
          {validation.isValid && totalCount === 0 && <EmptyState />}
          {validation.isValid && totalCount > 0 && (
            <div className="car-list clean refined-list">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>
          )}
        </div>
      </main>
    </PageShell>
  )
}
