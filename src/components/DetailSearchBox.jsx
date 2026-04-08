import { useMemo } from 'react'
import { parseDateTimeString } from '../utils/reservationSchedule'

function formatDisplay(dateText) {
  const parsed = parseDateTimeString(dateText)
  if (!parsed) return '-'

  const week = ['일', '월', '화', '수', '목', '금', '토'][parsed.getDay()] || ''
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}(${week}) ${String(parsed.getHours()).padStart(2, '0')}:00`
}

function formatDriverAge(driverAge) {
  return Number(driverAge) === 21 ? '만 21세~25세' : '만 26세 이상'
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`
}

export default function DetailSearchBox({ fixedSearchInfo, searchState, company }) {
  const selectedDongSummary = useMemo(() => {
    const provinces = Array.isArray(company?.deliveryCostList) ? company.deliveryCostList : []

    for (const province of provinces) {
      for (const city of province.cities || []) {
        for (const dong of city.dongs || []) {
          if (dong.id === searchState.dongId) {
            return dong
          }
        }
      }
    }

    return null
  }, [company, searchState.dongId])

  return (
    <section className="detail-card panel detail-search-box">
      <div className="info-grid three detail-fixed-grid">
        <div className="detail-info-cell panel-info">
          <span className="field-label">대여 일시</span>
          <strong>{formatDisplay(fixedSearchInfo.deliveryDateTime)}</strong>
        </div>
        <div className="detail-info-cell panel-info">
          <span className="field-label">반납 일시</span>
          <strong>{formatDisplay(fixedSearchInfo.returnDateTime)}</strong>
        </div>
        <div className="detail-info-cell panel-info">
          <span className="field-label">운전자 연령</span>
          <strong>{formatDriverAge(fixedSearchInfo.driverAge)}</strong>
        </div>
      </div>

      <div className="detail-search-grid detail-adjust-grid">
        <div className="detail-search-section panel-form">
          <span className="field-label">수령 방식</span>
          <div className="detail-location-summary">
            <strong>{searchState.pickupOption === 'delivery' ? '왕복 딜리버리' : '직접수령'}</strong>
            <p className="schedule-note detail-note">
              {searchState.pickupOption === 'delivery'
                ? '메인에서 확정한 딜리버리 위치 기준으로 예약을 진행합니다.'
                : '업체 방문 수령/반납'}
            </p>
          </div>
        </div>

        <div className="detail-search-section panel-form detail-location-field">
          <span className="field-label">위치</span>
          {searchState.pickupOption === 'delivery' ? (
            <div className="detail-location-summary selected-delivery-summary panel-info">
              <strong>{searchState.deliveryAddress || '딜리버리 위치 확인 필요'}</strong>
              {selectedDongSummary && (
                <p className="schedule-note detail-note">
                  왕복 {formatMoney(selectedDongSummary.roundTrip)}
                </p>
              )}
            </div>
          ) : (
            <div className="detail-location-summary">
              <strong>{company?.fullGarageAddress || company?.address || '업체 주소 확인 필요'}</strong>
              <p className="schedule-note detail-note">업체 방문 수령/반납</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
