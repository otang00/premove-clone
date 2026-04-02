import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { searchState as defaultSearchState, company } from '../data/mock'

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
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])

  const [pickupOption, setPickupOption] = useState(params.get('pickupOption') || defaultSearchState.pickupOption)
  const [deliveryDateTime, setDeliveryDateTime] = useState(params.get('deliveryDateTime') || defaultSearchState.deliveryDateTime)
  const [returnDateTime, setReturnDateTime] = useState(params.get('returnDateTime') || defaultSearchState.returnDateTime)
  const [driverAge, setDriverAge] = useState(params.get('driverAge') || defaultSearchState.driverAge)
  const order = params.get('order') || defaultSearchState.order

  const goCars = () => {
    const next = new URLSearchParams({ pickupOption, deliveryDateTime, returnDateTime, driverAge, order })
    navigate(`/cars?${next.toString()}`)
  }

  return (
    <section className={`search-box ${compact ? 'compact' : ''}`}>
      <div className="search-top slim-tabs">
        <button className={`radio ${pickupOption === 'pickup' ? 'active' : ''}`} onClick={() => setPickupOption('pickup')}>픽업</button>
        <button className={`radio ${pickupOption === 'delivery' ? 'active' : ''}`} onClick={() => setPickupOption('delivery')}>딜리버리</button>
      </div>
      <div className="search-grid dense">
        <div className="field">
          <span className="field-icon">📍</span>
          <span className="field-label">대여/반납 위치</span>
          <strong>{company.address}</strong>
          <button className="tiny-button">위치보기</button>
        </div>
        <div className="divider" />
        <div className="field">
          <span className="field-icon">📅</span>
          <span className="field-label">대여/반납 일정</span>
          <strong>{formatDisplay(deliveryDateTime)} ~ {formatDisplay(returnDateTime)}</strong>
          <div className="date-input-row">
            <input type="datetime-local" value={deliveryDateTime.replace(' ', 'T')} onChange={(e) => setDeliveryDateTime(e.target.value.replace('T', ' '))} />
            <input type="datetime-local" value={returnDateTime.replace(' ', 'T')} onChange={(e) => setReturnDateTime(e.target.value.replace('T', ' '))} />
          </div>
        </div>
        <div className="divider" />
        <div className="field age-field">
          <span className="field-icon">🎂</span>
          <span className="field-label">운전자 연령</span>
          <div className="age-buttons">
            <button className={driverAge === '21' ? 'primary' : 'ghost'} onClick={() => setDriverAge('21')}>만 21세~25세</button>
            <button className={driverAge === '26' ? 'primary' : 'ghost'} onClick={() => setDriverAge('26')}>만 26세 이상</button>
          </div>
        </div>
        <button className="search-submit square" onClick={goCars}>검색</button>
      </div>
    </section>
  )
}
