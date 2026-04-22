import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { parseSearchQuery, validateSearchState } from '../utils/searchQuery'
import { fetchCarDetail } from '../services/carDetail'
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
import { createGuestBooking } from '../services/guestBookingApi'
import { useAuth } from '../hooks/useAuth'

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

const INSURANCE_SUMMARY_ITEMS = [
  { label: '대인 보상한도', value: '무한' },
  { label: '대인 면책금', value: '50만원' },
  { label: '대물 보상한도', value: '2,000만원' },
  { label: '대물 면책금', value: '50만원' },
  { label: '자손 보상한도', value: '1,500만원' },
  { label: '자손 면책금', value: '50만원' },
  { label: '휴차료', value: '1일 대여요금의 50%' },
  { label: '자차면책금', value: '50만~100만' },
]

const SELF_DAMAGE_POLICY = [
  '승용 경,소형: 400만원 / 면책금 50만원',
  '승용 준중형,중형: 700만원 / 면책금 50만원',
  '승용 준대형,대형: 1,000만원 / 면책금 50만원',
  '프리미엄: 2,000만원 / 면책금 50만원',
  'SUV 소형: 500만원 / 면책금 50만원',
  'SUV 중형: 700만원 / 면책금 50만원',
  'SUV 대형: 1,000만원 / 면책금 50만원',
  '승합: 1,000만원 / 면책금 50만원',
  '수입, 슈퍼카: 2,000만원 / 면책금 100만원',
  '캠핑카: 500만원 / 면책금 50만원',
]

const INSURANCE_NOTES = [
  '전 차량 기본보험 및 자차가 자동 포함됩니다.',
  '단독사고는 보장되며, 사고 발생 즉시 회사에 연락해 사고 경위가 확인되어야 합니다.',
  '휠, 타이어 및 소모품은 보장 대상에서 제외됩니다.',
  '사고 시 차량 회수가 진행될 수 있으며, 대차가 제공되는 경우 대차비용이 발생할 수 있습니다.',
  '임의수리 및 임의합의는 금지되며, 회사가 지정한 곳 외에서 진행한 수리는 인정되지 않을 수 있습니다.',
]

const INSURANCE_LIMITATIONS = [
  '음주운전, 무면허운전, 약물운전',
  '등록되지 않은 운전자의 운행',
  '사고 미신고 또는 지연신고, 사고 후 현장 이탈',
  '고의 또는 중대한 과실',
  '차량 도난 시 키 관리 소홀 또는 문 미잠금 등 이용자 과실',
  '침수지역 진입, 무리한 수로 통과, 위험지역 주차 등 통상적 운행 범위를 벗어난 경우',
  '차량 전대, 재임대, 영업 목적 무단 사용',
  '경기, 시험, 연습주행 등 일반 대여 목적 외 사용',
]

export default function CarDetailSection() {
  const { carId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()
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
  const [isInsuranceExpanded, setIsInsuranceExpanded] = useState(false)
  const [hasReservationSubmitAttempted, setHasReservationSubmitAttempted] = useState(false)
  const [isReservationConfirmOpen, setIsReservationConfirmOpen] = useState(false)
  const [reservationSubmitError, setReservationSubmitError] = useState('')
  const [isCreatingReservation, setIsCreatingReservation] = useState(false)
  const paymentSummaryRef = useRef(null)
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
  const isReservationActionEnabled = submitValidation.isValid && isDeliveryAddressDetailValid
  const shouldShowReservationErrors = hasReservationSubmitAttempted
  const reservationSubmitMessages = useMemo(() => {
    const messages = []

    if (!reservationValidation.isValid) {
      messages.push(...Object.values(reservationValidation.errors))
    }

    if (!termsValidation.isValid) {
      messages.push(...Object.values(termsValidation.errors))
    }

    if (!paymentMethod) {
      messages.push('결제 방식을 선택해 주세요.')
    }

    if (parsedSearchState.pickupOption === 'delivery' && !deliveryAddressDetail.trim()) {
      messages.push('상세주소를 입력해 주세요.')
    }

    return [...new Set(messages.filter(Boolean))]
  }, [deliveryAddressDetail, parsedSearchState.pickupOption, paymentMethod, reservationValidation.errors, reservationValidation.isValid, termsValidation.errors, termsValidation.isValid])

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
    setHasReservationSubmitAttempted(true)
    setReservationSubmitError('')

    if (parsedSearchState.pickupOption === 'delivery' && !deliveryAddressDetail.trim()) {
      setDeliveryAddressDetailError('상세주소를 입력해 주세요.')
    }

    if (!car || !pricing || !isReservationActionEnabled) {
      requestAnimationFrame(() => {
        paymentSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    setIsReservationConfirmOpen(true)
  }

  const handleConfirmReservation = async () => {
    if (!car || !pricing || !isReservationActionEnabled) {
      return
    }

    try {
      setIsCreatingReservation(true)
      setReservationSubmitError('')

      const reservation = await createGuestBooking({
        carId: Number(car.id),
        deliveryDateTime: parsedSearchState.deliveryDateTime,
        returnDateTime: parsedSearchState.returnDateTime,
        pickupOption: parsedSearchState.pickupOption,
        deliveryAddress: parsedSearchState.deliveryAddress || '',
        deliveryAddressDetail: deliveryAddressDetail.trim(),
        quotedTotalAmount: pricing.raw?.finalPrice || 0,
        paymentMethod,
        customerName: reservationValidation.normalized.customerName,
        customerPhone: reservationValidation.normalized.customerPhone,
        customerBirth: reservationValidation.normalized.customerBirth,
      }, {
        session,
      })

      setIsReservationConfirmOpen(false)
      navigate(`/reservation-complete?customerName=${encodeURIComponent(reservation.customerName)}&customerPhone=${encodeURIComponent(reservation.customerPhone)}&customerBirth=${encodeURIComponent(reservation.customerBirth)}`)
    } catch (error) {
      setReservationSubmitError(error.message || '예약 생성에 실패했습니다.')
      setIsReservationConfirmOpen(false)
    } finally {
      setIsCreatingReservation(false)
    }
  }

  const reservationLocationText = parsedSearchState.pickupOption === 'delivery'
    ? (parsedSearchState.deliveryAddress || '배차 위치 확인 필요')
    : '회사 방문 수령'

  return (
    <section className="section-bg detail-page">
      <div className="container detail-layout">
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
                  <p className="feature-line">{car.features.join(', ')}</p>
                </div>
              </article>

              <article className="detail-card panel">
                <h2>예약 정보</h2>
                <div className="info-grid three info-stat-grid reservation-info-grid">
                  <div><span>대여일시</span><strong>{formatDisplay(fixedSearchInfo.deliveryDateTime)}</strong></div>
                  <div><span>반납일시</span><strong>{formatDisplay(fixedSearchInfo.returnDateTime)}</strong></div>
                  <div><span>배차 위치</span><strong>{reservationLocationText}</strong><small>{parsedSearchState.pickupOption === 'delivery' ? '검색에서 선택한 위치' : '회사 방문 수령'}</small></div>
                </div>
                <div className="reservation-price-card panel-sub">
                  <span className="reservation-price-label">총 예상 금액</span>
                  <strong>{pricing.finalPrice}</strong>
                  <p className="field-note">보험 포함 기준이며, 최종 결제 단계에서 확정됩니다.</p>
                </div>
                {parsedSearchState.pickupOption === 'delivery' && (
                  <div className="reservation-detail-input-wrap">
                    <span className="field-label">상세주소</span>
                    <input
                      className="field-input"
                      placeholder="상세주소를 입력해 주세요."
                      value={deliveryAddressDetail}
                      onChange={(e) => handleDeliveryAddressDetailChange(e.target.value)}
                    />
                    {deliveryAddressDetailError && (
                      <p className="muted small-note">{deliveryAddressDetailError}</p>
                    )}
                    <p className="muted small-note">배차를 위해 동, 호수, 건물명 등 상세주소를 입력해 주세요.</p>
                  </div>
                )}
              </article>

              <article className="detail-card panel">
                <h2>운전자 정보</h2>
                <div className="stack-form stack-form-centered">
                  <div>
                    <input
                      className="field-input"
                      placeholder="이름"
                      value={reservationForm.customerName}
                      onChange={(e) => updateReservationForm('customerName', e.target.value)}
                    />
                    {(shouldShowReservationErrors || reservationForm.customerName) && reservationValidation.errors.customerName && (
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
                    {(shouldShowReservationErrors || reservationForm.customerBirth) && reservationValidation.errors.customerBirth && (
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
                    {(shouldShowReservationErrors || reservationForm.customerPhone) && reservationValidation.errors.customerPhone && (
                      <p className="muted small-note">{reservationValidation.errors.customerPhone}</p>
                    )}
                  </div>
                </div>
                <p className="muted small-note">이름, 생년월일, 휴대폰번호를 정확히 입력해야 예약 확정 및 비회원 예약조회가 가능합니다. 차량 또는 계약서 기준 만 {car.rentAge}세 이상 예약 가능하며, 면허 취득 1년 이상이어야 합니다. 현장에서 면허와 예약자 본인 확인이 되지 않으면 배차가 불가할 수 있습니다.</p>
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

              <article className="detail-card panel payment-summary-card" ref={paymentSummaryRef}>
                <h2>결제 정보</h2>
                <div className="price-lines">
                  <div className="total"><span>총 예상 금액</span><strong>{pricing.finalPrice}</strong></div>
                </div>
                {shouldShowReservationErrors && reservationSubmitMessages.length > 0 && (
                  <div className="legal-note" style={{ marginTop: 0, background: '#fff4f4', color: '#9f1239' }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>아래 항목 확인 후 예약 확정을 눌러 주세요.</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {reservationSubmitMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {reservationSubmitError && (
                  <div className="legal-note" style={{ marginTop: 0, background: '#fff4f4', color: '#9f1239' }}>{reservationSubmitError}</div>
                )}
                <button className="btn btn-dark btn-lg btn-block" onClick={handleReservationSubmit}>예약 확정하기</button>
              </article>

              <article className="detail-card panel">
                <h2>보험/유의사항</h2>
                <div className="info-grid two info-stat-grid insurance-summary-grid">
                  {INSURANCE_SUMMARY_ITEMS.map((item) => (
                    <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
                  ))}
                </div>
                <button
                  className="btn btn-outline btn-md insurance-toggle-btn"
                  onClick={() => setIsInsuranceExpanded((current) => !current)}
                >
                  {isInsuranceExpanded ? '상세내용 접기' : '보험/유의사항 상세보기'}
                </button>
                {isInsuranceExpanded && (
                  <>
                    <div className="insurance-policy-block">
                      <h3>차종별 자차 보상한도 / 자차면책금</h3>
                      <ul className="policy-bullet-list">
                        {SELF_DAMAGE_POLICY.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="insurance-policy-block">
                      <h3>보험 유의사항</h3>
                      <ul className="policy-bullet-list">
                        {INSURANCE_NOTES.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="insurance-policy-block">
                      <h3>면책 제한 사유</h3>
                      <ul className="policy-bullet-list">
                        {INSURANCE_LIMITATIONS.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </article>
            </section>
          </div>
        )}
        {isReservationConfirmOpen && car && pricing && (
          <div className="delivery-modal-backdrop" onClick={() => setIsReservationConfirmOpen(false)}>
            <div className="search-guard-modal reservation-confirm-modal" onClick={(event) => event.stopPropagation()}>
              <strong>예약을 확정하시겠습니까?</strong>
              <p className="field-note">입력한 예약자 정보와 예약 조건을 확인한 뒤 확정해 주세요.</p>
              <div className="reservation-result-card reservation-confirm-card">
                <div className="reservation-result-card__header">
                  <div>
                    <span className="reservation-result-card__eyebrow">예약 확인</span>
                    <strong className="reservation-result-card__title">{car.name}</strong>
                  </div>
                  <div className="reservation-result-card__status is-confirmed">확정 전 확인</div>
                </div>

                <div className="reservation-result-card__price">
                  <span>총 예상 금액</span>
                  <strong>{pricing.finalPrice}</strong>
                </div>

                <div className="reservation-result-list">
                  <div className="reservation-result-row"><span>예약자명</span><strong>{reservationValidation.normalized.customerName}</strong></div>
                  <div className="reservation-result-row"><span>휴대폰번호</span><strong>{reservationValidation.normalized.customerPhone}</strong></div>
                  <div className="reservation-result-row"><span>생년월일</span><strong>{reservationValidation.normalized.customerBirth}</strong></div>
                  <div className="reservation-result-row"><span>대여일시</span><strong>{formatDisplay(fixedSearchInfo.deliveryDateTime)}</strong></div>
                  <div className="reservation-result-row"><span>반납일시</span><strong>{formatDisplay(fixedSearchInfo.returnDateTime)}</strong></div>
                  <div className="reservation-result-row"><span>배차/수령</span><strong>{reservationLocationText}</strong></div>
                </div>
              </div>
              <div className="search-guard-actions">
                <button className="btn btn-outline btn-md" onClick={() => setIsReservationConfirmOpen(false)}>다시 확인</button>
                <button className="btn btn-dark btn-md" onClick={handleConfirmReservation} disabled={isCreatingReservation}>{isCreatingReservation ? '예약 생성 중' : '예약 확정'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
