import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  buildSearchQuery,
  normalizeSearchState,
  parseSearchQuery,
} from '../utils/searchQuery'
import {
  buildDateTimeValue,
  formatDateKey,
  getEarliestPickupDateTime,
  getPickupTimeOptions,
  getReturnTimeOptions,
  parseDateTimeString,
  splitDateTimeString,
  toDateTimeString,
} from '../utils/reservationSchedule'
import { getMockCompany } from '../services/company'

function formatDisplay(dateText) {
  const parsed = parseDateTimeString(dateText)
  if (!parsed) return '-'

  const week = ['일', '월', '화', '수', '목', '금', '토'][parsed.getDay()] || ''
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}(${week}) ${String(parsed.getHours()).padStart(2, '0')}:00`
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

  const earliestPickupDate = useMemo(() => getEarliestPickupDateTime(), [])
  const earliestPickupDateKey = useMemo(() => formatDateKey(earliestPickupDate), [earliestPickupDate])

  const deliverySchedule = useMemo(
    () => splitDateTimeString(searchState.deliveryDateTime),
    [searchState.deliveryDateTime],
  )
  const returnSchedule = useMemo(
    () => splitDateTimeString(searchState.returnDateTime),
    [searchState.returnDateTime],
  )

  const pickupTimeOptions = useMemo(
    () => getPickupTimeOptions(deliverySchedule.date),
    [deliverySchedule.date],
  )
  const returnTimeOptions = useMemo(
    () => getReturnTimeOptions(returnSchedule.date, searchState.deliveryDateTime),
    [returnSchedule.date, searchState.deliveryDateTime],
  )

  const updateSearchState = (patch) => {
    setSearchState((current) => normalizeSearchState({ ...current, ...patch }))
  }

  const updateDeliverySchedule = (patch) => {
    const nextDate = patch.date ?? deliverySchedule.date
    const nextTime = patch.time ?? deliverySchedule.time
    const nextDateTime = buildDateTimeValue(nextDate, nextTime)

    updateSearchState({ deliveryDateTime: nextDateTime || toDateTimeString(earliestPickupDate) })
  }

  const updateReturnSchedule = (patch) => {
    const nextDate = patch.date ?? returnSchedule.date
    const nextTime = patch.time ?? returnSchedule.time
    const nextDateTime = buildDateTimeValue(nextDate, nextTime)

    updateSearchState({ returnDateTime: nextDateTime || searchState.returnDateTime })
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
          직접수령
        </button>
        <button
          className={`radio ${searchState.pickupOption === 'delivery' ? 'active' : ''}`}
          onClick={() => handlePickupOptionChange('delivery')}
        >
          왕복 딜리버리
        </button>
      </div>
      <div className="search-grid schedule-search-grid dense">
        <div className="field schedule-field">
          <span className="field-icon">📍</span>
          <span className="field-label">수령 / 반납 위치</span>
          <strong>{displayAddress}</strong>
          <button className="tiny-button">위치보기</button>
        </div>
        <div className="divider" />
        <div className="field schedule-field wide-field">
          <span className="field-icon">📅</span>
          <span className="field-label">예약 일정</span>
          <strong>
            {formatDisplay(searchState.deliveryDateTime)} ~ {formatDisplay(searchState.returnDateTime)}
          </strong>
          <div className="schedule-form-grid">
            <div className="schedule-card">
              <span className="schedule-card-label">대여 일시</span>
              <input
                type="date"
                value={deliverySchedule.date}
                min={earliestPickupDateKey}
                onChange={(e) => updateDeliverySchedule({ date: e.target.value })}
              />
              <select
                value={deliverySchedule.time}
                onChange={(e) => updateDeliverySchedule({ time: e.target.value })}
              >
                {pickupTimeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="schedule-card">
              <span className="schedule-card-label">반납 일시</span>
              <input
                type="date"
                value={returnSchedule.date}
                min={deliverySchedule.date || earliestPickupDateKey}
                onChange={(e) => updateReturnSchedule({ date: e.target.value })}
              />
              <select
                value={returnSchedule.time}
                onChange={(e) => updateReturnSchedule({ time: e.target.value })}
              >
                {returnTimeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="schedule-note">오늘 예약은 현재 시각 기준 3시간 후부터, 운영 시간은 09:00~21:00입니다.</p>
        </div>
        <div className="divider" />
        <div className="field schedule-field action-field">
          <span className="field-icon">🎂</span>
          <span className="field-label">운전자 연령</span>
          <div className="action-panel">
            <div className="age-buttons action-age-buttons">
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
            <button className="search-submit action-submit" onClick={goSearch}>검색</button>
          </div>
        </div>
      </div>
    </section>
  )
}
