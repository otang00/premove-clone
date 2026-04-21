import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import DetailSearchBox from './DetailSearchBox'
import { parseSearchQuery, validateSearchState } from '../utils/searchQuery'
import { fetchCarDetail } from '../services/carDetail'
import { getMockCompany } from '../services/company'
import {
  DEFAULT_RESERVATION_FORM,
  normalizeBirth,
  normalizePhone,
  validateReservationForm,
} from '../services/reservationForm'
import {
  DEFAULT_TERMS_STATE,
  PAYMENT_METHODS,
  toggleAllTerms,
  toggleSingleTerm,
  validateReservationSubmission,
  validateTermsState,
} from '../services/reservationUiState'

function formatDisplay(dateText) {
  const [datePart = '', timePart = ''] = dateText.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = '00', minute = '00'] = timePart.split(':')
  const d = new Date(year, (month || 1) - 1, day || 1)
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] || ''
  return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}(${week}) ${hour}:${minute}`
}

function ContextErrorState({ title, message }) {
  return (
    <article className="detail-card panel">
      <h2>{title}</h2>
      <p className="muted small-note">{message}</p>
      <Link to="/" className="btn btn-outline btn-md" style={{ display: 'inline-flex', marginTop: 12 }}>메인으로 돌아가기</Link>
    </article>
  )
}

function LoadingState() {
  return (
    <article className="detail-card panel">
      <h2>상세 정보 불러오는 중</h2>
      <p className="muted small-note">상세 데이터를 불러오는 중입니다.</p>
    </article>
  )
}

function formatOperatingHours(deliveryTimes = []) {
  if (!Array.isArray(deliveryTimes) || deliveryTimes.length === 0) {
    return '매일 09:00 ~ 21:00'
  }

  const first = deliveryTimes[0]
  if (!first?.startAt || !first?.endAt) {
    return '매일 09:00 ~ 21:00'
  }

  return `매일 ${first.startAt} ~ ${first.endAt}`
}

export default function CarDetailSection() {
  const { carId } = useParams()
  const location = useLocation()
  const parsedSearchState = useMemo(() => parseSearchQuery(location.search), [location.search])
  const detailToken = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('detailToken') || ''
  }, [location.search])
  const validation = useMemo(() => validateSearchState(parsedSearchState), [parsedSearchState])
  const hasSearchContext = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.has('deliveryDateTime') && params.has('returnDateTime')
  }, [location.search])
  const fixedSearchInfo = useMemo(
    () => ({
      deliveryDateTime: parsedSearchState.deliveryDateTime,
      returnDateTime: parsedSearchState.returnDateTime,
      driverAge: parsedSearchState.driverAge,
    }),
    [parsedSearchState.deliveryDateTime, parsedSearchState.returnDateTime, parsedSearchState.driverAge],
  )

  const [company, setCompany] = useState(() => getMockCompany())
  const [car, setCar] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [insurance, setInsurance] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [reservationForm, setReservationForm] = useState(DEFAULT_RESERVATION_FORM)
  const [termsState, setTermsState] = useState(DEFAULT_TERMS_STATE)
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CARD)
  const [deliveryAddressDetail, setDeliveryAddressDetail] = useState(parsedSearchState.deliveryAddressDetail || '')
  const [deliveryAddressDetailError, setDeliveryAddressDetailError] = useState('')

  useEffect(() => {
    setDeliveryAddressDetail(parsedSearchState.deliveryAddressDetail || '')
    setDeliveryAddressDetailError('')
  }, [parsedSearchState.deliveryAddressDetail])

  const reservationValidation = useMemo(
    () => validateReservationForm(reservationForm),
    [reservationForm],
  )
  const termsValidation = useMemo(() => validateTermsState(termsState), [termsState])
  const submitValidation = useMemo(
    () => validateReservationSubmission({ reservationValidation, termsValidation, paymentMethod }),
    [reservationValidation, termsValidation, paymentMethod],
  )

  const isDeliveryAddressDetailValid = parsedSearchState.pickupOption !== 'delivery' || Boolean(deliveryAddressDetail.trim())
  const isReservationActionEnabled = submitValidation.isValid

  useEffect(() => {
    let isCancelled = false

    if (!carId || !hasSearchContext || !validation.isValid) {
      setCar(null)
      setPricing(null)
      setInsurance(null)
      setFetchError('')
      setIsLoading(false)
      return () => {
        isCancelled = true
      }
    }

    setIsLoading(true)
    setFetchError('')

    fetchCarDetail(carId, parsedSearchState, detailToken)
      .then((payload) => {
        if (isCancelled) return
        setCompany((current) => ({
          ...current,
          ...payload.company,
          name: payload.company.companyName || current.name,
          address: payload.company.fullGarageAddress || current.address,
          phone: payload.company.companyTel || current.phone,
        }))
        setCar(payload.car)
        setPricing(payload.pricing)
        setInsurance(payload.insurance)
      })
      .catch((error) => {
        if (isCancelled) return
        setCar(null)
        setPricing(null)
        setInsurance(null)
        setFetchError(error.message || '상세 조회에 실패했습니다.')
      })
      .finally(() => {
        if (isCancelled) return
        setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [carId, detailToken, hasSearchContext, validation, parsedSearchState])

  const updateReservationForm = (field, value) => {
    setReservationForm((current) => {
      if (field === 'customerPhone') {
        return { ...current, customerPhone: normalizePhone(value) }
      }

      if (field === 'customerBirth') {
        return { ...current, customerBirth: normalizeBirth(value) }
      }

      return { ...current, [field]: value }
    })
  }

  const handleDeliveryAddressDetailChange = (value) => {
    setDeliveryAddressDetail(value)
    setDeliveryAddressDetailError('')
  }

  const handleToggleAllTerms = (checked) => {
    setTermsState(toggleAllTerms(checked))
  }

  const handleToggleSingleTerm = (field, checked) => {
    setTermsState((current) => toggleSingleTerm(current, field, checked))
  }

  const handleReservationSubmit = () => {
    if (parsedSearchState.pickupOption === 'delivery' && !deliveryAddressDetail.trim()) {
      setDeliveryAddressDetailError('상세주소를 입력해 주세요.')
      return
    }
  }

  return (
    <section className="section-bg detail-page">
      <div className="container detail-layout">
        <DetailSearchBox
          fixedSearchInfo={fixedSearchInfo}
          searchState={parsedSearchState}
          company={company}
          deliveryAddressDetail={deliveryAddressDetail}
          deliveryAddressDetailError={deliveryAddressDetailError}
          onDeliveryAddressDetailChange={handleDeliveryAddressDetailChange}
        />

        {!hasSearchContext && (
          <ContextErrorState
            title="검색 조건 확인 필요"
            message="상세 페이지는 검색 조건과 함께 진입해야 합니다. 메인에서 다시 검색해 주세요."
          />
        )}

        {hasSearchContext && !validation.isValid && (
          <ContextErrorState
            title="검색 조건 오류"
            message={Object.values(validation.errors)[0] || '검색 조건이 올바르지 않습니다. 메인에서 다시 검색해 주세요.'}
          />
        )}

        {hasSearchContext && validation.isValid && isLoading && <LoadingState />}

        {hasSearchContext && validation.isValid && !isLoading && fetchError && (
          <ContextErrorState
            title="상세 조회 실패"
            message={fetchError}
          />
        )}

        {hasSearchContext && validation.isValid && !isLoading && !fetchError && car && pricing && insurance && (
          <div className="detail-columns">
            <section className="detail-main">
              <article className="detail-card panel summary-card">
                <div className="summary-image-wrap">
                  {car.image ? <img src={car.image} alt={car.name} /> : <div className="pickup-location-readonly-box">이미지 준비중</div>}
                </div>
                <div>
                  <h1>{car.name}</h1>
                  <div className="meta-row"><span>{car.yearLabel}</span><span>{car.fuelType}</span><span>{car.seats}</span></div>
                  <div className="date-strip">
                    <span>{formatDisplay(fixedSearchInfo.deliveryDateTime)}</span>
                    <strong>1일</strong>
                    <span>{formatDisplay(fixedSearchInfo.returnDateTime)}</span>
                  </div>
                  <p className="feature-line">{car.features.join(', ')}</p>
                </div>
              </article>

              <div className="tab-row">
                <button className="btn btn-tab btn-md is-active">예약 정보</button>
                <button className="btn btn-tab btn-md">보험/유의사항</button>
                <button className="btn btn-tab btn-md">회사 정보</button>
              </div>

              <article className="detail-card panel">
                <h2>보험 정보</h2>
                <div className="info-grid three info-stat-grid">
                  <div><span>보험 안내</span><strong>일반 자차</strong><small>현재 운영 기준 보험입니다</small></div>
                  <div><span>보상한도</span><strong>{insurance.general?.coverage ? `${insurance.general.coverage}만원` : '회사 기준 적용'}</strong><small>세부 한도는 예약 단계에서 다시 안내합니다</small></div>
                  <div><span>자차 면책금</span><strong>{insurance.general?.indemnificationFee ? `${insurance.general.indemnificationFee}만원` : '회사 기준 적용'}</strong><small>완전 자차는 후속 기능에서 추가 예정입니다</small></div>
                </div>
              </article>

              <article className="detail-card panel">
                <h2>회사 정보</h2>
                <div className="info-grid three info-stat-grid">
                  <div><span>회사명</span><strong>{company.name || company.companyName || '빵빵카 주식회사'}</strong><small>{company.phone || company.companyTel || '연락처 확인 필요'}</small></div>
                  <div><span>운영시간</span><strong>{formatOperatingHours(company.deliveryTimes)}</strong><small>배차/반차는 운영시간 내 가능합니다</small></div>
                  <div><span>수령 방식</span><strong>{parsedSearchState.pickupOption === 'delivery' ? '딜리버리' : '회사 방문'}</strong><small>{parsedSearchState.pickupOption === 'delivery' ? '메인에서 선택한 위치 기준' : '회사 방문 수령/반납'}</small></div>
                </div>
                <p className="muted small-note">{company.address || company.fullGarageAddress || '회사 주소 확인 필요'}</p>
              </article>

              <article className="detail-card panel">
                <h2>운전자 정보</h2>
                <div className="form-grid">
                  <div>
                    <input
                      className="field-input"
                      placeholder="이름"
                      value={reservationForm.customerName}
                      onChange={(e) => updateReservationForm('customerName', e.target.value)}
                    />
                    {reservationForm.customerName && reservationValidation.errors.customerName && (
                      <p className="muted small-note">{reservationValidation.errors.customerName}</p>
                    )}
                  </div>
                  <div>
                    <input
                      className="field-input"
                      placeholder="생년월일 8자리"
                      inputMode="numeric"
                      value={reservationForm.customerBirth}
                      onChange={(e) => updateReservationForm('customerBirth', e.target.value)}
                    />
                    {reservationForm.customerBirth && reservationValidation.errors.customerBirth && (
                      <p className="muted small-note">{reservationValidation.errors.customerBirth}</p>
                    )}
                  </div>
                  <div>
                    <input
                      className="field-input"
                      placeholder="휴대폰번호"
                      inputMode="tel"
                      value={reservationForm.customerPhone}
                      onChange={(e) => updateReservationForm('customerPhone', e.target.value)}
                    />
                    {reservationForm.customerPhone && reservationValidation.errors.customerPhone && (
                      <p className="muted small-note">{reservationValidation.errors.customerPhone}</p>
                    )}
                  </div>
                  <button className="btn btn-outline btn-lg btn-block">인증번호</button>
                </div>
                <p className="muted small-note">차량 또는 계약서 기준 만 {car.rentAge}세 이상 예약 가능하며, 면허 취득 1년 이상이어야 합니다. 현장에서 면허와 예약자 본인 확인이 되지 않으면 배차가 불가할 수 있습니다.</p>
              </article>

              <article className="detail-card panel">
                <h2>결제 방식 선택</h2>
                <div className="info-grid three payment-method-grid">
                  <button className={`btn-select payment-method-card ${paymentMethod === PAYMENT_METHODS.CARD ? 'is-active' : ''}`} onClick={() => setPaymentMethod(PAYMENT_METHODS.CARD)}><strong>결제 방식 1</strong><span>결제 단계에서 제공되는 방식으로 진행</span></button>
                  <button className={`btn-select payment-method-card ${paymentMethod === PAYMENT_METHODS.KAKAO_PAY ? 'is-active' : ''}`} onClick={() => setPaymentMethod(PAYMENT_METHODS.KAKAO_PAY)}><strong>결제 방식 2</strong><span>결제 단계에서 제공되는 방식으로 진행</span></button>
                  <button className={`btn-select payment-method-card ${paymentMethod === PAYMENT_METHODS.GENERAL ? 'is-active' : ''}`} onClick={() => setPaymentMethod(PAYMENT_METHODS.GENERAL)}><strong>결제 방식 3</strong><span>결제 단계에서 제공되는 방식으로 진행</span></button>
                </div>
                <p className="muted small-note">세부 결제수단은 운영 정책에 따라 결제 단계에서 안내됩니다.</p>
              </article>

              <article className="detail-card panel">
                <h2>이용 약관 동의</h2>
                <div className="terms-list">
                  <label><input type="checkbox" checked={termsState.allAgreed} onChange={(e) => handleToggleAllTerms(e.target.checked)} /> 전체 동의</label>
                  <label><input type="checkbox" checked={termsState.serviceAgreed} onChange={(e) => handleToggleSingleTerm('serviceAgreed', e.target.checked)} /> 서비스 이용약관</label>
                  <label><input type="checkbox" checked={termsState.rentalPolicyAgreed} onChange={(e) => handleToggleSingleTerm('rentalPolicyAgreed', e.target.checked)} /> 렌터카 이용약관</label>
                  <label><input type="checkbox" checked={termsState.privacyAgreed} onChange={(e) => handleToggleSingleTerm('privacyAgreed', e.target.checked)} /> 개인정보 수집 및 이용 동의</label>
                </div>
                {!termsValidation.isValid && (
                  <p className="muted small-note">{Object.values(termsValidation.errors)[0]}</p>
                )}
                <div className="legal-note">
                  빵빵카 주식회사는 본 서비스와 렌터카 계약 시스템을 직접 제공합니다. 결제가 정상적으로 완료된 예약에 한해 예약이 확정되며, 운전자 자격 미충족, 본인 확인 실패, 면허 확인 실패, 결제 확인 실패, 차량 상태 이상, 배차 불가 등 회사가 고지한 사유가 있으면 예약이 거절되거나 취소될 수 있습니다.
                </div>
              </article>
            </section>

            <aside className="detail-side detail-card panel-sticky sticky-side">
              <h2>결제 정보</h2>
              <div className="price-lines price-lines-compact">
                <div className="total"><span>총 예상 금액</span><strong>{pricing.finalPrice}</strong></div>
              </div>
              {!isDeliveryAddressDetailValid && (
                <p className="muted small-note">상세주소를 입력해 주세요.</p>
              )}
              {isDeliveryAddressDetailValid && !submitValidation.isValid && (
                <p className="muted small-note">{Object.values(submitValidation.errors)[0]}</p>
              )}
              <button className="btn btn-dark btn-lg btn-block" disabled={!isReservationActionEnabled} onClick={handleReservationSubmit}>결제 진행하기</button>
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}
