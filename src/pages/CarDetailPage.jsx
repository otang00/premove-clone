import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import SearchBox from '../components/SearchBox'
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
import {
  DEFAULT_DELIVERY_FORM,
  validateDeliveryForm,
} from '../services/deliveryForm'

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
    <article className="detail-card compact-card">
      <h2>{title}</h2>
      <p className="muted small-note">{message}</p>
      <Link to="/" className="outline" style={{ display: 'inline-block', marginTop: 12 }}>메인으로 돌아가기</Link>
    </article>
  )
}

function LoadingState() {
  return (
    <article className="detail-card compact-card">
      <h2>상세 정보 불러오는 중</h2>
      <p className="muted small-note">partner 상세 데이터를 불러오는 중입니다.</p>
    </article>
  )
}

export default function CarDetailPage() {
  const { carId } = useParams()
  const location = useLocation()
  const searchState = useMemo(() => parseSearchQuery(location.search), [location.search])
  const validation = useMemo(() => validateSearchState(searchState), [searchState])
  const hasSearchContext = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.has('deliveryDateTime') && params.has('returnDateTime')
  }, [location.search])

  const [company, setCompany] = useState(() => getMockCompany())
  const [car, setCar] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [insurance, setInsurance] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [reservationForm, setReservationForm] = useState(DEFAULT_RESERVATION_FORM)
  const [termsState, setTermsState] = useState(DEFAULT_TERMS_STATE)
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CARD)
  const [deliveryForm, setDeliveryForm] = useState(() => ({
    ...DEFAULT_DELIVERY_FORM,
    selectedDongId: searchState.dongId || null,
    selectedDongLabel: searchState.deliveryAddress || '',
  }))

  const reservationValidation = useMemo(
    () => validateReservationForm(reservationForm),
    [reservationForm],
  )
  const termsValidation = useMemo(() => validateTermsState(termsState), [termsState])
  const deliveryValidation = useMemo(
    () => validateDeliveryForm(deliveryForm, searchState.pickupOption),
    [deliveryForm, searchState.pickupOption],
  )
  const submitValidation = useMemo(
    () => {
      const base = validateReservationSubmission({ reservationValidation, termsValidation, paymentMethod })
      if (searchState.pickupOption !== 'delivery') return base
      if (deliveryValidation.isValid) return base
      return {
        errors: {
          ...base.errors,
          delivery: Object.values(deliveryValidation.errors)[0] || '딜리버리 정보를 확인해 주세요.',
        },
        isValid: false,
      }
    },
    [reservationValidation, termsValidation, paymentMethod, searchState.pickupOption, deliveryValidation],
  )

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

    fetchCarDetail(carId, searchState)
      .then((payload) => {
        if (isCancelled) return
        setCompany((current) => ({
          ...current,
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
  }, [carId, hasSearchContext, searchState, validation])

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

  const handleToggleAllTerms = (checked) => {
    setTermsState(toggleAllTerms(checked))
  }

  const handleToggleSingleTerm = (field, checked) => {
    setTermsState((current) => toggleSingleTerm(current, field, checked))
  }

  const updateDeliveryForm = (field, value) => {
    setDeliveryForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <PageShell>
      <main className="section-bg detail-page tighter-page">
        <div className="container detail-layout">
          <SearchBox compact />

          {!hasSearchContext && (
            <ContextErrorState
              title="검색 조건 확인 필요"
              message="상세 페이지는 검색 조건과 함께 진입해야 합니다. 메인에서 다시 검색해 주세요."
            />
          )}

          {hasSearchContext && !validation.isValid && (
            <ContextErrorState
              title="검색 조건 오류"
              message="대여/반납 시간 또는 검색 상태가 올바르지 않습니다. 메인에서 다시 검색해 주세요."
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
            <div className="detail-columns compact-detail">
              <section className="detail-main">
                <article className="detail-card summary-card compact-summary">
                  <div className="summary-image-wrap">
                    <img src={car.image} alt={car.name} />
                  </div>
                  <div>
                    <h1>{car.name}</h1>
                    <div className="meta-row"><span>{car.yearLabel}</span><span>{car.fuelType}</span><span>{car.seats}</span></div>
                    <div className="date-strip">
                      <span>{formatDisplay(searchState.deliveryDateTime)}</span>
                      <strong>1일</strong>
                      <span>{formatDisplay(searchState.returnDateTime)}</span>
                    </div>
                    <p className="feature-line">{car.features.join(', ')}</p>
                  </div>
                </article>

                <div className="tab-row slim-tab-row">
                  <button className="active">예약 정보</button>
                  <button>보험/유의사항</button>
                  <button>업체 정보</button>
                </div>

                <article className="detail-card compact-card">
                  <h2>보험 정보</h2>
                  <div className="info-grid three compact-info-grid info-stat-grid">
                    <div><span>보험 안내</span><strong>일반 자차</strong><small>+ {pricing.insurancePrice}</small></div>
                    <div><span>보상한도</span><strong>{insurance.general?.coverage ? `${insurance.general.coverage}만원` : '확인 필요'}</strong><small>대인/대물 기준</small></div>
                    <div><span>자차 면책금</span><strong>{insurance.general?.indemnificationFee ? `${insurance.general.indemnificationFee}만원` : '확인 필요'}</strong><small>사고 시 고객 부담금</small></div>
                  </div>
                </article>

                <article className="detail-card compact-card">
                  <h2>운전자 정보</h2>
                  <div className="form-grid compact-form-grid">
                    <div>
                      <input
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
                        placeholder="휴대폰번호"
                        inputMode="tel"
                        value={reservationForm.customerPhone}
                        onChange={(e) => updateReservationForm('customerPhone', e.target.value)}
                      />
                      {reservationForm.customerPhone && reservationValidation.errors.customerPhone && (
                        <p className="muted small-note">{reservationValidation.errors.customerPhone}</p>
                      )}
                    </div>
                    <button className="outline block">인증번호</button>
                  </div>
                  <p className="muted small-note">만 {car.rentAge}세 이상 / 면허 취득 {car.drivingYears}년 경과. 현장에서 면허 진위를 확인합니다.</p>
                </article>

                <article className="detail-card compact-card">
                  <h2>차량 대여 방법</h2>
                  <div className="info-grid two selectable compact-info-grid">
                    <button className={`select-card ${searchState.pickupOption === 'pickup' ? 'active' : ''}`}>
                      <strong>직접수령</strong>
                      <span>업체로 방문해 차량을 수령하고 반납합니다.</span>
                    </button>
                    <button className={`select-card ${searchState.pickupOption === 'delivery' ? 'active' : ''}`}>
                      <strong>왕복 딜리버리</strong>
                      <span>원하는 위치에서 차량을 받고 같은 방식으로 반납합니다.</span>
                    </button>
                  </div>
                </article>

                {searchState.pickupOption === 'delivery' && (
                  <article className="detail-card compact-card">
                    <h2>딜리버리 신청</h2>
                    <div className="form-grid compact-form-grid">
                      <div>
                        <button className="outline block" type="button">위치 선택</button>
                        <p className="muted small-note">
                          {deliveryForm.selectedDongLabel || '차량 대여/반납 위치를 선택해 주세요.'}
                        </p>
                        {!deliveryValidation.isValid && deliveryValidation.errors.selectedDongId && (
                          <p className="muted small-note">{deliveryValidation.errors.selectedDongId}</p>
                        )}
                      </div>
                      <div>
                        <input
                          placeholder="상세 주소를 입력해 주세요."
                          value={deliveryForm.deliveryAddressDetail}
                          onChange={(e) => updateDeliveryForm('deliveryAddressDetail', e.target.value)}
                        />
                        {!deliveryValidation.isValid && deliveryValidation.errors.deliveryAddressDetail && (
                          <p className="muted small-note">{deliveryValidation.errors.deliveryAddressDetail}</p>
                        )}
                      </div>
                      <div>
                        <input
                          placeholder="업체에 전달할 내용을 적어주세요."
                          value={deliveryForm.deliveryMemo}
                          onChange={(e) => updateDeliveryForm('deliveryMemo', e.target.value)}
                        />
                      </div>
                    </div>
                  </article>
                )}

                <article className="detail-card compact-card">
                  <h2>업체 정보</h2>
                  <div className="store-box">
                    <strong>{company.name}</strong>
                    <p>{company.address}</p>
                    <p className="muted small-note">직접수령 또는 왕복 딜리버리 방식으로 차량을 인수하고 반납할 수 있습니다.</p>
                    <div className="map-box">지도 영역 Placeholder</div>
                  </div>
                </article>

                <article className="detail-card compact-card">
                  <h2>결제 수단</h2>
                  <div className="info-grid three selectable compact-info-grid">
                    <button className={`select-card ${paymentMethod === PAYMENT_METHODS.CARD ? 'active' : ''}`} onClick={() => setPaymentMethod(PAYMENT_METHODS.CARD)}><strong>신용/체크카드</strong></button>
                    <button className={`select-card ${paymentMethod === PAYMENT_METHODS.KAKAO_PAY ? 'active' : ''}`} onClick={() => setPaymentMethod(PAYMENT_METHODS.KAKAO_PAY)}><strong>카카오페이</strong></button>
                    <button className={`select-card ${paymentMethod === PAYMENT_METHODS.GENERAL ? 'active' : ''}`} onClick={() => setPaymentMethod(PAYMENT_METHODS.GENERAL)}><strong>일반결제</strong></button>
                  </div>
                </article>

                <article className="detail-card compact-card">
                  <h2>이용 약관 동의</h2>
                  <div className="terms-list compact-terms">
                    <label><input type="checkbox" checked={termsState.allAgreed} onChange={(e) => handleToggleAllTerms(e.target.checked)} /> 전체 동의</label>
                    <label><input type="checkbox" checked={termsState.serviceAgreed} onChange={(e) => handleToggleSingleTerm('serviceAgreed', e.target.checked)} /> 서비스 이용약관</label>
                    <label><input type="checkbox" checked={termsState.rentalPolicyAgreed} onChange={(e) => handleToggleSingleTerm('rentalPolicyAgreed', e.target.checked)} /> 렌터카 이용 특약사항</label>
                    <label><input type="checkbox" checked={termsState.privacyAgreed} onChange={(e) => handleToggleSingleTerm('privacyAgreed', e.target.checked)} /> 개인정보 수집 및 이용 동의</label>
                  </div>
                  {!termsValidation.isValid && (
                    <p className="muted small-note">{Object.values(termsValidation.errors)[0]}</p>
                  )}
                  <div className="legal-note">
                    아이엠에스모빌리티 주식회사는 통신판매중개자로서 거래 당사자가 아니며, 상품/거래조건 관련 책임은 각 판매자에게 있습니다.
                  </div>
                </article>
              </section>

              <aside className="detail-side detail-card sticky-side compact-side">
                <h2>결제 정보</h2>
                <div className="price-lines compact-price-lines">
                  <div><span>기본 대여료</span><strong>{pricing.rentalCost}</strong></div>
                  <div><span>보험</span><strong>{pricing.insurancePrice}</strong></div>
                  {searchState.pickupOption === 'delivery' && (
                    <div><span>왕복 딜리버리 비용</span><strong>{pricing.deliveryRoundTrip}</strong></div>
                  )}
                  <div className="total"><span>총 예상 금액</span><strong>{pricing.finalPrice}</strong></div>
                </div>
                {!submitValidation.isValid && (
                  <p className="muted small-note">{Object.values(submitValidation.errors)[0]}</p>
                )}
                <button className="pay-button" disabled={!submitValidation.isValid}>예약 요청하기</button>
              </aside>
            </div>
          )}
        </div>
      </main>
    </PageShell>
  )
}
