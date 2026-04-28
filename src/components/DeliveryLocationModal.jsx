import { useEffect, useMemo, useRef, useState } from 'react'

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
  const [mobileStep, setMobileStep] = useState('province')
  const provinceButtonRefs = useRef(new Map())
  const cityButtonRefs = useRef(new Map())
  const dongCardRefs = useRef(new Map())
  const desktopProvinceListRef = useRef(null)
  const desktopCityListRef = useRef(null)
  const desktopDongListRef = useRef(null)
  const mobileListRef = useRef(null)

  const provinces = Array.isArray(company?.deliveryCostList) ? company.deliveryCostList : []
  const deliveryTimes = Array.isArray(company?.deliveryTimes) ? company.deliveryTimes : []

  useEffect(() => {
    if (!open || !provinces.length) return

    const selectedPath = findSelectedPath(provinces, selectedDongId)
    if (selectedPath) {
      setSelectedProvinceId(selectedPath.provinceId)
      setSelectedCityId(selectedPath.cityId)
      setMobileStep('dong')
      return
    }

    setSelectedProvinceId(provinces[0]?.id || null)
    setSelectedCityId(provinces[0]?.cities?.[0]?.id || null)
    setMobileStep('province')
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

  const mobileStepTitle = {
    province: '시/도 선택',
    city: '시/구/군 선택',
    dong: '딜리버리 지역 선택',
  }

  useEffect(() => {
    if (!open) return

    const rafId = window.requestAnimationFrame(() => {
      const provinceButton = provinceButtonRefs.current.get(selectedProvince?.id)
      const cityButton = cityButtonRefs.current.get(selectedCity?.id)
      const dongCard = dongCardRefs.current.get(selectedDongId)

      provinceButton?.scrollIntoView({ block: 'start' })
      cityButton?.scrollIntoView({ block: 'start' })
      dongCard?.scrollIntoView({ block: 'start' })

      if (mobileListRef.current) {
        mobileListRef.current.scrollTop = 0
      }
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [open, selectedProvince?.id, selectedCity?.id, selectedDongId, mobileStep])

  useEffect(() => {
    if (!open) return
    desktopProvinceListRef.current?.scrollTo({ top: 0 })
    desktopCityListRef.current?.scrollTo({ top: 0 })
    desktopDongListRef.current?.scrollTo({ top: 0 })
  }, [open, selectedProvinceId, selectedCityId])

  if (!open) return null

  return (
    <div className="delivery-modal-backdrop" onClick={onClose}>
      <div className="delivery-modal delivery-region-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="딜리버리 지역 선택">
        <div className="delivery-modal-header">
          <div>
            <strong>딜리버리 지역 선택</strong>
            <p>{company?.fullGarageAddress || '회사 주소 확인 필요'}</p>
          </div>
          <button className="btn btn-outline btn-md delivery-modal-close" onClick={onClose}>닫기</button>
        </div>

        <div className="delivery-modal-hours">
          {deliveryTimes.length > 0
            ? deliveryTimes.map((item) => `${item.dayOfWeek} ${item.startAt.slice(0, 5)}~${item.endAt.slice(0, 5)}`).join(' · ')
            : '딜리버리 가능 시간 확인 필요'}
        </div>

        <div className="delivery-modal-body delivery-region-grid delivery-desktop-only">
          <div className="delivery-column delivery-region-column province-column">
            <div className="delivery-column-heading">
              <span className="field-label">시/도</span>
            </div>
            <div className="delivery-column-content">
              <div className="delivery-option-list delivery-region-list" ref={desktopProvinceListRef}>
                {provinces.map((province) => (
                  <button
                    key={province.id}
                    className={`delivery-option-button delivery-region-button ${selectedProvince?.id === province.id ? 'is-active' : ''}`}
                    ref={(node) => {
                      if (node) provinceButtonRefs.current.set(province.id, node)
                      else provinceButtonRefs.current.delete(province.id)
                    }}
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
              <div className="delivery-option-list delivery-region-list" ref={desktopCityListRef}>
                {cities.map((city) => (
                  <button
                    key={city.id}
                    className={`delivery-option-button delivery-region-button ${selectedCity?.id === city.id ? 'is-active' : ''}`}
                    ref={(node) => {
                      if (node) cityButtonRefs.current.set(city.id, node)
                      else cityButtonRefs.current.delete(city.id)
                    }}
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
              <div className="delivery-fee-list delivery-region-list" ref={desktopDongListRef}>
                {dongs.map((dong) => (
                  <button
                    key={dong.id}
                    className={`delivery-fee-card delivery-region-card ${selectedDongId === dong.id ? 'is-active' : ''}`}
                    ref={(node) => {
                      if (node) dongCardRefs.current.set(dong.id, node)
                      else dongCardRefs.current.delete(dong.id)
                    }}
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

        <div className="delivery-mobile-flow delivery-mobile-only">
          <div className="delivery-mobile-summary">
            <button
              type="button"
              className={`delivery-mobile-chip ${mobileStep === 'province' ? 'is-active' : ''}`}
              onClick={() => setMobileStep('province')}
            >
              {selectedProvince?.name || '시/도'}
            </button>
            <button
              type="button"
              className={`delivery-mobile-chip ${mobileStep === 'city' ? 'is-active' : ''}`}
              onClick={() => selectedProvince && setMobileStep('city')}
              disabled={!selectedProvince}
            >
              {selectedCity?.name || '시/구/군'}
            </button>
            <button
              type="button"
              className={`delivery-mobile-chip ${mobileStep === 'dong' ? 'is-active' : ''}`}
              onClick={() => selectedCity && setMobileStep('dong')}
              disabled={!selectedCity}
            >
              딜리버리 지역
            </button>
          </div>

          <div className="delivery-mobile-panel">
            <div className="delivery-mobile-panel-header">
              {mobileStep !== 'province' && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm delivery-mobile-back"
                  onClick={() => setMobileStep(mobileStep === 'dong' ? 'city' : 'province')}
                >
                  이전
                </button>
              )}
              <strong>{mobileStepTitle[mobileStep]}</strong>
            </div>

            {mobileStep === 'province' && (
              <div className="delivery-option-list delivery-region-list delivery-mobile-list" ref={mobileListRef}>
                {provinces.map((province) => (
                  <button
                    key={province.id}
                    className={`delivery-option-button delivery-region-button ${selectedProvince?.id === province.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedProvinceId(province.id)
                      setSelectedCityId(province.cities?.[0]?.id || null)
                      setMobileStep('city')
                    }}
                  >
                    {province.name}
                  </button>
                ))}
              </div>
            )}

            {mobileStep === 'city' && (
              <div className="delivery-option-list delivery-region-list delivery-mobile-list" ref={mobileListRef}>
                {cities.map((city) => (
                  <button
                    key={city.id}
                    className={`delivery-option-button delivery-region-button ${selectedCity?.id === city.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedCityId(city.id)
                      setMobileStep('dong')
                    }}
                  >
                    {city.name}
                  </button>
                ))}
                {cities.length === 0 && (
                  <div className="delivery-empty">선택 가능한 시/구/군이 없습니다.</div>
                )}
              </div>
            )}

            {mobileStep === 'dong' && (
              <div className="delivery-fee-list delivery-region-list delivery-mobile-list" ref={mobileListRef}>
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
