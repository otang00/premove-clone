import { getMockCompany } from '../services/company'
import { parseDateTimeString } from '../utils/reservationSchedule'

const DELIVERY_LOCATION_OPTIONS = [
  { id: 440, label: '서울특별시 강남구 개포동' },
]

function formatDisplay(dateText) {
  const parsed = parseDateTimeString(dateText)
  if (!parsed) return '-'

  const week = ['일', '월', '화', '수', '목', '금', '토'][parsed.getDay()] || ''
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}(${week}) ${String(parsed.getHours()).padStart(2, '0')}:00`
}

function formatDriverAge(driverAge) {
  return Number(driverAge) === 21 ? '만 21세~25세' : '만 26세 이상'
}

function getLocationOptions(currentAddress, currentDongId) {
  const exists = DELIVERY_LOCATION_OPTIONS.some((option) => option.id === currentDongId)

  if (currentDongId && currentAddress && !exists) {
    return [{ id: currentDongId, label: currentAddress }, ...DELIVERY_LOCATION_OPTIONS]
  }

  return DELIVERY_LOCATION_OPTIONS
}

export default function DetailSearchBox({
  fixedSearchInfo,
  adjustState,
  deliveryForm,
  deliveryValidation,
  onPickupOptionChange,
  onLocationChange,
  onDeliveryFieldChange,
}) {
  const company = getMockCompany()
  const locationOptions = getLocationOptions(adjustState.deliveryAddress, adjustState.dongId)
  const selectedLocation = adjustState.deliveryAddress || '차량 대여/반납 위치를 선택해 주세요.'

  return (
    <section className="detail-card compact-card detail-search-box">
      <div className="info-grid three compact-info-grid detail-fixed-grid">
        <div className="detail-info-cell">
          <span className="field-label">대여 일시</span>
          <strong>{formatDisplay(fixedSearchInfo.deliveryDateTime)}</strong>
        </div>
        <div className="detail-info-cell">
          <span className="field-label">반납 일시</span>
          <strong>{formatDisplay(fixedSearchInfo.returnDateTime)}</strong>
        </div>
        <div className="detail-info-cell">
          <span className="field-label">운전자 연령</span>
          <strong>{formatDriverAge(fixedSearchInfo.driverAge)}</strong>
        </div>
      </div>

      <div className="detail-search-grid detail-adjust-grid">
        <div className="detail-search-section">
          <span className="field-label">수령 방식</span>
          <div className="detail-toggle-row">
            <button
              className={adjustState.pickupOption === 'pickup' ? 'primary' : 'ghost'}
              onClick={() => onPickupOptionChange('pickup')}
            >
              직접수령
            </button>
            <button
              className={adjustState.pickupOption === 'delivery' ? 'primary' : 'ghost'}
              onClick={() => onPickupOptionChange('delivery')}
            >
              왕복 딜리버리
            </button>
          </div>
          <p className="schedule-note detail-note">
            {adjustState.pickupOption === 'pickup'
              ? '업체 방문 수령/반납'
              : '선택한 위치 기준으로 왕복 딜리버리 진행'}
          </p>
        </div>

        <div className="detail-search-section detail-location-field">
          <span className="field-label">위치</span>

          {adjustState.pickupOption === 'pickup' ? (
            <div className="detail-location-summary">
              <strong>{company.address}</strong>
              <p className="schedule-note detail-note">업체 방문 수령/반납</p>
            </div>
          ) : (
            <div className="detail-delivery-panel">
              <select
                value={adjustState.dongId || ''}
                onChange={(e) => {
                  const selected = locationOptions.find((option) => String(option.id) === e.target.value)
                  onLocationChange({
                    dongId: selected ? selected.id : null,
                    deliveryAddress: selected ? selected.label : '',
                  })
                }}
              >
                <option value="">딜리버리 위치를 선택해 주세요.</option>
                {locationOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              <p className="schedule-note detail-note">{selectedLocation}</p>
              {!deliveryValidation.isValid && deliveryValidation.errors.selectedDongId && (
                <p className="muted small-note">{deliveryValidation.errors.selectedDongId}</p>
              )}
              <input
                placeholder="상세 주소를 입력해 주세요."
                value={deliveryForm.deliveryAddressDetail}
                onChange={(e) => onDeliveryFieldChange('deliveryAddressDetail', e.target.value)}
              />
              {!deliveryValidation.isValid && deliveryValidation.errors.deliveryAddressDetail && (
                <p className="muted small-note">{deliveryValidation.errors.deliveryAddressDetail}</p>
              )}
              <input
                placeholder="업체에 전달할 내용을 적어주세요."
                value={deliveryForm.deliveryMemo}
                onChange={(e) => onDeliveryFieldChange('deliveryMemo', e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
