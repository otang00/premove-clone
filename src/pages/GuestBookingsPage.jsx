import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { cancelGuestBooking, lookupGuestBooking } from '../services/guestBookingApi'

function formatDisplay(dateText) {
  const [datePart = '', timePart = ''] = String(dateText || '').split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = '00', minute = '00'] = timePart.split(':')
  const d = new Date(year || 0, (month || 1) - 1, day || 1)
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] || ''
  return `${String(month || '').padStart(2, '0')}.${String(day || '').padStart(2, '0')}(${week}) ${hour}:${minute}`
}

function normalizePhone(value) { return String(value || '').replace(/[^\d]/g, '').slice(0, 11) }
function normalizeBirth(value) { return String(value || '').replace(/[^\d]/g, '').slice(0, 8) }

export default function GuestBookingsPage() {
  const [searchParams] = useSearchParams()
  const initialCustomerName = searchParams.get('customerName') || ''
  const initialCustomerPhone = searchParams.get('customerPhone') || ''
  const initialCustomerBirth = searchParams.get('customerBirth') || ''

  const [customerName, setCustomerName] = useState(initialCustomerName)
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone)
  const [customerBirth, setCustomerBirth] = useState(initialCustomerBirth)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => Boolean(String(customerName).trim()) && /^\d{10,11}$/.test(normalizePhone(customerPhone)) && /^\d{8}$/.test(normalizeBirth(customerBirth)),
    [customerName, customerPhone, customerBirth],
  )

  const handleLookup = async () => {
    try {
      setIsSubmitting(true)
      const response = await lookupGuestBooking({ customerName, customerPhone, customerBirth })
      setResult(response.booking)
      setError('')
    } catch (lookupError) {
      setResult(null)
      setError(lookupError.message || '일치하는 비회원 예약을 찾지 못했습니다. 이름, 휴대폰번호, 생년월일을 다시 확인해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!result?.canCancel) return

    const confirmed = window.confirm('이 예약을 취소하시겠습니까?')
    if (!confirmed) return

    try {
      setIsSubmitting(true)
      const cancelled = await cancelGuestBooking({ customerName, customerPhone, customerBirth })
      setResult(cancelled.booking)
      setError('')
    } catch (cancelError) {
      setError(cancelError.message || '예약 취소에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>비회원 예약조회</h1>
              <p className="small-note" style={{ marginTop: 8 }}>이름, 휴대폰번호, 생년월일로 예약 상태를 확인하고 취소할 수 있습니다.</p>
            </div>

            <div className="stack-form stack-form-centered">
              <div>
                <input
                  className="field-input"
                  placeholder="이름"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <input
                  className="field-input"
                  placeholder="휴대폰번호"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(normalizePhone(e.target.value))}
                />
              </div>
              <div>
                <input
                  className="field-input"
                  placeholder="생년월일 8자리"
                  inputMode="numeric"
                  value={customerBirth}
                  onChange={(e) => setCustomerBirth(normalizeBirth(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-dark btn-md" disabled={!canSubmit || isSubmitting} onClick={handleLookup}>{isSubmitting ? '처리 중' : '예약 조회'}</button>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>

            {error && <p className="small-note" style={{ margin: 0 }}>{error}</p>}

            {result && (
              <div className="panel-sub" style={{ display: 'grid', gap: 16 }}>
                <div className="reservation-result-card">
                  <div className="reservation-result-card__header">
                    <div>
                      <span className="reservation-result-card__eyebrow">예약 조회 결과</span>
                      <strong className="reservation-result-card__title">{result.pricingSnapshot?.carName || '-'}</strong>
                    </div>
                    <div className={`reservation-result-card__status ${result.statusTone === 'cancelled' ? 'is-cancelled' : result.statusTone === 'pending' ? 'is-pending' : 'is-confirmed'}`}>
                      {result.statusLabel}
                    </div>
                  </div>

                  <div className="reservation-result-card__price">
                    <span>총 금액</span>
                    <strong>{result.pricing.finalPrice}</strong>
                  </div>

                  <div className="reservation-result-list">
                    <div className="reservation-result-row"><span>예약번호</span><strong>{result.reservationNumber}</strong></div>
                    <div className="reservation-result-row"><span>대여일시</span><strong>{result.display.pickupAt}</strong></div>
                    <div className="reservation-result-row"><span>반납일시</span><strong>{result.display.returnAt}</strong></div>
                    <div className="reservation-result-row"><span>배차/수령</span><strong>{result.schedule.displayPickupLabel}</strong></div>
                    <div className="reservation-result-row"><span>예약자</span><strong>{result.customerName}</strong></div>
                    <div className="reservation-result-row"><span>휴대폰번호</span><strong>{result.customerPhone}</strong></div>
                    <div className="reservation-result-row"><span>생년월일</span><strong>{result.customerBirth}</strong></div>
                  </div>
                </div>

                {result.status === 'cancelled' ? (
                  <div className="legal-note" style={{ marginTop: 0 }}>이 예약은 이미 취소되었습니다.</div>
                ) : result.canCancel ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-md" onClick={handleCancel} disabled={isSubmitting}>{isSubmitting ? '처리 중' : '예약 취소'}</button>
                  </div>
                ) : null}
              </div>
            )}
          </article>
        </div>
      </section>
    </PageShell>
  )
}
