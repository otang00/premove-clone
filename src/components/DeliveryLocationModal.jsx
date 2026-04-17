import { useEffect, useMemo, useState } from 'react'

function findSelectedPath(provinces, selectedDongId) {
  if (!selectedDongId) return null

  for (const province of provinces) {
    for (const city of province.cities || []) {
      for (const dong of city.dongs || []) {
        if (dong.id === selectedDongId) {
          return {
            provinceId: province.id,
            cityId: city.id,
          }
        }
      }
    }
  }

  return null
}

export default function DeliveryLocationModal({
  open,
  company,
  selectedDongId,
  onClose,
  onSelect,
}) {
  const [selectedProvinceId, setSelectedProvinceId] = useState(null)
  const [selectedCityId, setSelectedCityId] = useState(null)

  const provinces = Array.isArray(company?.deliveryCostList) ? company.deliveryCostList : []
  const deliveryTimes = Array.isArray(company?.deliveryTimes) ? company.deliveryTimes : []

  useEffect(() => {
    if (!open || !provinces.length) return

    const selectedPath = findSelectedPath(provinces, selectedDongId)
    if (selectedPath) {
      setSelectedProvinceId(selectedPath.provinceId)
      setSelectedCityId(selectedPath.cityId)
      return
    }

    setSelectedProvinceId(provinces[0]?.id || null)
    setSelectedCityId(provinces[0]?.cities?.[0]?.id || null)
  }, [open, provinces, selectedDongId])

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

  if (!open) return null

  return (
    <div className="delivery-modal-backdrop" onClick={onClose}>
      <div className="delivery-modal delivery-region-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="딜리버리 지역 선택">
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

        <div className="delivery-modal-body delivery-region-grid">
          <div className="delivery-column delivery-region-column province-column">
            <div className="delivery-column-heading">
              <span className="field-label">시/도</span>
            </div>
            <div className="delivery-column-content">
              <div className="delivery-option-list delivery-region-list">
                {provinces.map((province) => (
                  <button
                    key={province.id}
                    className={`delivery-option-button delivery-region-button ${selectedProvince?.id === province.id ? 'is-active' : ''}`}
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
          </div>

          <div className="delivery-column delivery-region-column city-column">
            <div className="delivery-column-heading">
              <span className="field-label">시/구/군</span>
            </div>
            <div className="delivery-column-content">
              <div className="delivery-option-list delivery-region-list">
                {cities.map((city) => (
                  <button
                    key={city.id}
                    className={`delivery-option-button delivery-region-button ${selectedCity?.id === city.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedCityId(city.id)}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="delivery-column delivery-region-column dong-column">
            <div className="delivery-column-heading">
              <span className="field-label">딜리버리 지역</span>
            </div>
            <div className="delivery-column-content">
              <div className="delivery-fee-list delivery-region-list">
                {dongs.map((dong) => (
                  <button
                    key={dong.id}
                    className={`delivery-fee-card delivery-region-card ${selectedDongId === dong.id ? 'is-active' : ''}`}
                    onClick={() => {
                      onSelect({
                        dongId: dong.id,
                        deliveryAddress: dong.fullLabel,
                      })
                      onClose()
                    }}
                  >
                    <div className="delivery-fee-head delivery-region-summary">
                      <strong>{dong.name}</strong>
                      <span>{selectedCity?.name}</span>
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
    </div>
  )
}
