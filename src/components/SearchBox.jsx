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
  getEarliestReturnDateTime,
  getLatestReturnDateTime,
  getPickupTimeOptions,
  getReturnTimeOptions,
  parseDateTimeString,
  splitDateTimeString,
  toDateTimeString,
} from '../utils/reservationSchedule'

const DELIVERY_LOCATION_OPTIONS = [
  { id: 425, label: '서울특별시 서초구 반포동' },
  { id: 424, label: '서울특별시 서초구 잠원동' },
  { id: 423, label: '서울특별시 서초구 방배동' },
  { id: 422, label: '서울특별시 서초구 서초동' },
]

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" />
    </svg>
  )
}

function UserBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M6 19a6 6 0 0 1 12 0" />
      <path d="M18.5 6.5h2M19.5 5.5v2" />
    </svg>
  )
}

function formatDisplay(dateText) {
  const parsed = parseDateTimeString(dateText)
  if (!parsed) return '-'

  const week = ['일', '월', '화', '수', '목', '금', '토'][parsed.getDay()] || ''
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}(${week}) ${String(parsed.getHours()).padStart(2, '0')}:00`
}

function DeliveryLocationModal({ open, selectedDongId, onClose, onSelect }) {
  if (!open) return null

  return (
    <div className="delivery-modal-backdrop" onClick={onClose}>
      <div className="delivery-modal simple-delivery-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="딜리버리 위치 선택">
        <div className="delivery-modal-header">
          <div>
            <strong>딜리버리 위치 선택</strong>
            <p>지역을 선택하면 검색창 주소가 자동으로 채워집니다.</p>
          </div>
          <button className="btn btn-outline btn-md delivery-modal-close" onClick={onClose}>닫기</button>
        </div>

        <div className="delivery-fee-list simple-delivery-list">
          {DELIVERY_LOCATION_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`delivery-fee-card ${selectedDongId === option.id ? 'active' : ''}`}
              onClick={() => {
                onSelect({ dongId: option.id, deliveryAddress: option.label })
                onClose()
              }}
            >
              <div className="delivery-fee-head simple-delivery-head">
                <strong>{option.label}</strong>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SearchBox({ compact = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const parsedSearchState = useMemo(() => parseSearchQuery(location.search), [location.search])
  const [searchState, setSearchState] = useState(parsedSearchState)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  useEffect(() => {
    setSearchState(parsedSearchState)
  }, [parsedSearchState])

  const earliestPickupDate = useMemo(() => getEarliestPickupDateTime(), [])
  const earliestPickupDateKey = useMemo(() => formatDateKey(earliestPickupDate), [earliestPickupDate])
  const returnMinDateKey = useMemo(() => {
    const pickupAt = parseDateTimeString(searchState.deliveryDateTime)
    if (!pickupAt) return ''
    return formatDateKey(getEarliestReturnDateTime(pickupAt))
  }, [searchState.deliveryDateTime])
  const returnMaxDateKey = useMemo(() => {
    const pickupAt = parseDateTimeString(searchState.deliveryDateTime)
    if (!pickupAt) return ''
    return formatDateKey(getLatestReturnDateTime(pickupAt))
  }, [searchState.deliveryDateTime])

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

  const handleLocationSelect = ({ dongId, deliveryAddress }) => {
    updateSearchState({
      pickupOption: 'delivery',
      dongId,
      deliveryAddress,
    })
  }

  const goSearch = () => {
    const nextQuery = buildSearchQuery({ ...searchState, pickupOption: 'delivery' })
    navigate(`/?${nextQuery}`)
  }

  return (
    <>
      <section className={`search-box ${compact ? 'compact' : ''}`}>
        <div className="search-panel-grid">
          <article className="search-panel-card location-panel-card">
            <div className="search-panel-header">
              <span className="search-panel-icon"><LocationIcon /></span>
              <span className="search-panel-title">딜리버리 위치</span>
            </div>
            <div className="search-panel-body">
              <input
                className="search-location-input"
                value={searchState.deliveryAddress || ''}
                placeholder=""
                readOnly
              />
            </div>
            <div className="search-panel-footer">
              <button className="btn btn-outline btn-md btn-block location-select-button" onClick={() => setIsLocationModalOpen(true)}>
                위치 선택
              </button>
            </div>
          </article>

          <article className="search-panel-card schedule-panel-card">
            <div className="search-panel-header">
              <span className="search-panel-icon"><CalendarIcon /></span>
              <span className="search-panel-title">예약 일정</span>
            </div>
            <div className="search-panel-body schedule-panel-body">
              <strong className="search-panel-summary">
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
                    min={returnMinDateKey || deliverySchedule.date || earliestPickupDateKey}
                    max={returnMaxDateKey}
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
            </div>
            <div className="search-panel-footer">
              <p className="schedule-note">예약은 현재 시각 기준 3시간 후부터 가능 / 운영 시간은 09:00~21:00 / 대여 기간은 최대 30일입니다.</p>
            </div>
          </article>

          <article className="search-panel-card age-panel-card">
            <div className="search-panel-header">
              <span className="search-panel-icon"><UserBadgeIcon /></span>
              <span className="search-panel-title">운전자 연령</span>
            </div>
            <div className="search-panel-body">
              <div className="action-panel">
                <div className="age-buttons action-age-buttons">
                  <button
                    className={`btn btn-tab btn-md ${searchState.driverAge === 21 ? 'is-active' : ''}`}
                    onClick={() => updateSearchState({ driverAge: 21 })}
                  >
                    만 21세~25세
                  </button>
                  <button
                    className={`btn btn-tab btn-md ${searchState.driverAge === 26 ? 'is-active' : ''}`}
                    onClick={() => updateSearchState({ driverAge: 26 })}
                  >
                    만 26세 이상
                  </button>
                </div>
              </div>
            </div>
            <div className="search-panel-footer">
              <button className="btn btn-dark btn-lg btn-block action-submit" onClick={goSearch}>검색</button>
            </div>
          </article>
        </div>
      </section>

      <DeliveryLocationModal
        open={isLocationModalOpen}
        selectedDongId={searchState.dongId}
        onClose={() => setIsLocationModalOpen(false)}
        onSelect={handleLocationSelect}
      />
    </>
  )
}
