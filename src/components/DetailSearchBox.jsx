import { useMemo, useState } from 'react'
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

function DeliveryLocationModal({ open, company, selectedDongId, onClose, onSelect }) {
  const [selectedProvinceId, setSelectedProvinceId] = useState(null)
  const [selectedCityId, setSelectedCityId] = useState(null)

  const provinces = Array.isArray(company?.deliveryCostList) ? company.deliveryCostList : []

  const selectedProvince = useMemo(() => {
    if (!provinces.length) return null
    return provinces.find((province) => province.id === selectedProvinceId) || provinces[0]
  }, [provinces, selectedProvinceId])

  const cities = selectedProvince?.cities || []
  const selectedCity = useMemo(() => {
    if (!cities.length) return null
    return cities.find((city) => city.id === selectedCityId) || cities[0]
  }, [cities, selectedCityId])

  const dongs = selectedCity?.dongs || []
  const deliveryTimes = Array.isArray(company?.deliveryTimes) ? company.deliveryTimes : []

  if (!open) return null

  return (
    <div className="delivery-modal-backdrop" onClick={onClose}>
      <div className="delivery-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="딜리버리 요금 안내">
        <div className="delivery-modal-header">
          <div>
            <strong>딜리버리 지역 선택</strong>
            <p>{company?.fullGarageAddress || '업체 주소 확인 필요'}</p>
          </div>
          <button className="btn btn-outline btn-md delivery-modal-close" onClick={onClose}>닫기</button>
        </div>

        <div className="delivery-modal-hours">
          {deliveryTimes.length > 0
            ? deliveryTimes.map((item) => `${item.dayOfWeek} ${item.startAt.slice(0, 5)}~${item.endAt.slice(0, 5)}`).join(' · ')
            : '딜리버리 가능 시간 확인 필요'}
        </div>

        <div className="delivery-modal-body">
          <div className="delivery-column province-column">
            <span className="field-label">시/도</span>
            <div className="delivery-option-list">
              {provinces.map((province) => (
                <button
                  key={province.id}
                  className={`delivery-option-button ${selectedProvince?.id === province.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProvinceId(province.id)
                    setSelectedCityId(province.cities?.[0]?.id || null)
                  }}
                >
                  {province.name}
                </button>
              ))}
            </div>
          </div>

          <div className="delivery-column city-column">
            <span className="field-label">시/구/군</span>
            <div className="delivery-option-list">
              {cities.map((city) => (
                <button
                  key={city.id}
                  className={`delivery-option-button ${selectedCity?.id === city.id ? 'active' : ''}`}
                  onClick={() => setSelectedCityId(city.id)}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>

          <div className="delivery-column dong-column">
            <span className="field-label">동별 요금</span>
            <div className="delivery-fee-list">
              {dongs.map((dong) => (
                <button
                  key={dong.id}
                  className={`delivery-fee-card ${selectedDongId === dong.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelect({ dongId: dong.id, deliveryAddress: dong.fullLabel })
                    onClose()
                  }}
                >
                  <div className="delivery-fee-head">
                    <strong>{dong.name}</strong>
                    <span>{selectedCity?.name}</span>
                  </div>
                  <div className="delivery-fee-prices">
                    <div><span>편도</span><strong>{formatMoney(dong.oneWay)}</strong></div>
                    <div><span>왕복</span><strong>{formatMoney(dong.roundTrip)}</strong></div>
                  </div>
                </button>
              ))}
              {dongs.length === 0 && (
                <div className="delivery-empty">선택 가능한 딜리버리 지역이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DetailSearchBox({
  fixedSearchInfo,
  adjustState,
  deliveryForm,
  deliveryValidation,
  company,
  onPickupOptionChange,
  onLocationChange,
  onDeliveryFieldChange,
}) {
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
  const selectedLocation = adjustState.deliveryAddress || '딜리버리 위치를 선택해 주세요.'
  const selectedDongSummary = useMemo(() => {
    const provinces = Array.isArray(company?.deliveryCostList) ? company.deliveryCostList : []

    for (const province of provinces) {
      for (const city of province.cities || []) {
        for (const dong of city.dongs || []) {
          if (dong.id === adjustState.dongId) {
            return dong
          }
        }
      }
    }

    return null
  }, [company, adjustState.dongId])

  return (
    <>
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
            <div className="detail-toggle-row">
              <button
                className={`btn btn-tab btn-md ${adjustState.pickupOption === 'pickup' ? 'is-active' : ''}`}
                onClick={() => onPickupOptionChange('pickup')}
              >
                직접수령
              </button>
              <button
                className={`btn btn-tab btn-md ${adjustState.pickupOption === 'delivery' ? 'is-active' : ''}`}
                onClick={() => onPickupOptionChange('delivery')}
              >
                왕복 딜리버리
              </button>
            </div>
            <p className="schedule-note detail-note">
              {adjustState.pickupOption === 'pickup'
                ? '업체 방문 수령/반납'
                : 'partner 상세 페이지와 같은 방식으로 지역별 딜리버리 요금을 선택합니다.'}
            </p>
          </div>

          <div className="detail-search-section panel-form detail-location-field">
            <span className="field-label">위치</span>

            {adjustState.pickupOption === 'pickup' ? (
              <div className="detail-location-summary">
                <strong>{company?.fullGarageAddress || company?.address || '업체 주소 확인 필요'}</strong>
                <p className="schedule-note detail-note">업체 방문 수령/반납</p>
              </div>
            ) : (
              <div className="detail-delivery-panel">
                <button className="btn btn-outline btn-md btn-block" onClick={() => setIsDeliveryModalOpen(true)}>
                  딜리버리 지역 선택
                </button>
                <div className="detail-location-summary selected-delivery-summary panel-info">
                  <strong>{selectedLocation}</strong>
                  {selectedDongSummary && (
                    <p className="schedule-note detail-note">
                      편도 {formatMoney(selectedDongSummary.oneWay)} / 왕복 {formatMoney(selectedDongSummary.roundTrip)}
                    </p>
                  )}
                </div>
                {!deliveryValidation.isValid && deliveryValidation.errors.selectedDongId && (
                  <p className="muted small-note">{deliveryValidation.errors.selectedDongId}</p>
                )}
                <input
                  className="field-input"
                  placeholder="상세 주소를 입력해 주세요."
                  value={deliveryForm.deliveryAddressDetail}
                  onChange={(e) => onDeliveryFieldChange('deliveryAddressDetail', e.target.value)}
                />
                {!deliveryValidation.isValid && deliveryValidation.errors.deliveryAddressDetail && (
                  <p className="muted small-note">{deliveryValidation.errors.deliveryAddressDetail}</p>
                )}
                <input
                  className="field-input"
                  placeholder="업체에 전달할 내용을 적어주세요."
                  value={deliveryForm.deliveryMemo}
                  onChange={(e) => onDeliveryFieldChange('deliveryMemo', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <DeliveryLocationModal
        open={isDeliveryModalOpen}
        company={company}
        selectedDongId={adjustState.dongId}
        onClose={() => setIsDeliveryModalOpen(false)}
        onSelect={onLocationChange}
      />
    </>
  )
}
