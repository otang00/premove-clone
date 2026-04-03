import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  buildSearchQuery,
  fromDateTimeInputValue,
  normalizeSearchState,
  parseSearchQuery,
  toDateTimeInputValue,
} from '../utils/searchQuery'
import { getMockCompany } from '../services/company'

function formatDisplay(dateText) {
  const [datePart = '', timePart = ''] = dateText.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = '00', minute = '00'] = timePart.split(':')
  const d = new Date(year, (month || 1) - 1, day || 1)
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] || ''
  return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}(${week}) ${hour}:${minute}`
}

export default function SearchBox({ compact = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const company = useMemo(() => getMockCompany(), [])
  const parsedSearchState = useMemo(() => parseSearchQuery(location.search), [location.search])
  const [searchState, setSearchState] = useState(parsedSearchState)

  useEffect(() => {
    setSearchState(parsedSearchState)
  }, [parsedSearchState])

  const updateSearchState = (patch) => {
    setSearchState((current) => normalizeSearchState({ ...current, ...patch }))
  }

  const handlePickupOptionChange = (pickupOption) => {
    updateSearchState(
      pickupOption === 'pickup'
        ? { pickupOption, dongId: null, deliveryAddress: '' }
        : { pickupOption },
    )
  }

  const goSearch = () => {
    const nextQuery = buildSearchQuery(searchState)
    navigate(`/?${nextQuery}`)
  }

  const displayAddress = searchState.pickupOption === 'delivery' && searchState.deliveryAddress
    ? searchState.deliveryAddress
    : company.address

  return (
    <section className={`search-box ${compact ? 'compact' : ''}`}>
      <div className="search-top slim-tabs">
        <button
          className={`radio ${searchState.pickupOption === 'pickup' ? 'active' : ''}`}
          onClick={() => handlePickupOptionChange('pickup')}
        >
          픽업
        </button>
        <button
          className={`radio ${searchState.pickupOption === 'delivery' ? 'active' : ''}`}
          onClick={() => handlePickupOptionChange('delivery')}
        >
          딜리버리
        </button>
      </div>
      <div className="search-grid dense">
        <div className="field">
          <span className="field-icon">📍</span>
          <span className="field-label">대여/반납 위치</span>
          <strong>{displayAddress}</strong>
          <button className="tiny-button">위치보기</button>
        </div>
        <div className="divider" />
        <div className="field">
          <span className="field-icon">📅</span>
          <span className="field-label">대여/반납 일정</span>
          <strong>
            {formatDisplay(searchState.deliveryDateTime)} ~ {formatDisplay(searchState.returnDateTime)}
          </strong>
          <div className="date-input-row">
            <input
              type="datetime-local"
              value={toDateTimeInputValue(searchState.deliveryDateTime)}
              onChange={(e) => updateSearchState({ deliveryDateTime: fromDateTimeInputValue(e.target.value) })}
            />
            <input
              type="datetime-local"
              value={toDateTimeInputValue(searchState.returnDateTime)}
              onChange={(e) => updateSearchState({ returnDateTime: fromDateTimeInputValue(e.target.value) })}
            />
          </div>
        </div>
        <div className="divider" />
        <div className="field age-field">
          <span className="field-icon">🎂</span>
          <span className="field-label">운전자 연령</span>
          <div className="age-buttons">
            <button
              className={searchState.driverAge === 21 ? 'primary' : 'ghost'}
              onClick={() => updateSearchState({ driverAge: 21 })}
            >
              만 21세~25세
            </button>
            <button
              className={searchState.driverAge === 26 ? 'primary' : 'ghost'}
              onClick={() => updateSearchState({ driverAge: 26 })}
            >
              만 26세 이상
            </button>
          </div>
        </div>
        <button className="search-submit square" onClick={goSearch}>검색</button>
      </div>
    </section>
  )
}
