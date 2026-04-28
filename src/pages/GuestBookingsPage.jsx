import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { cancelGuestBooking, lookupGuestBooking } from '../services/guestBookingApi'

function normalizePhone(value) { return String(value || '').replace(/[^\d]/g, '').slice(0, 11) }
function normalizeBirth(value) { return String(value || '').replace(/[^\d]/g, '').slice(0, 8) }

function ReservationCard({ booking, onCancel, isCancelling }) {
  return (
    <div className="reservation-result-card">
      <div className="reservation-result-card__header">
        <div>
          <span className="reservation-result-card__eyebrow">예약 조회 결과</span>
          <strong className="reservation-result-card__title">{booking.pricingSnapshot?.carName || '-'}</strong>
        </div>
        <div className={`reservation-result-card__status ${booking.statusTone === 'cancelled' ? 'is-cancelled' : booking.statusTone === 'pending' ? 'is-pending' : 'is-confirmed'}`}>
          {booking.statusLabel}
        </div>
      </div>

      <div className="reservation-result-card__price">
        <span>총 금액</span>
        <strong>{booking.pricing.finalPrice}</strong>
      </div>

      <div className="reservation-result-list">
        <div className="reservation-result-row"><span>예약번호</span><strong>{booking.reservationNumber}</strong></div>
        <div className="reservation-result-row"><span>대여일시</span><strong>{booking.display.pickupAt}</strong></div>
        <div className="reservation-result-row"><span>반납일시</span><strong>{booking.display.returnAt}</strong></div>
        <div className="reservation-result-row"><span>배차/수령</span><strong>{booking.schedule.displayPickupLabel}</strong></div>
        <div className="reservation-result-row"><span>예약자</span><strong>{booking.customerName}</strong></div>
        <div className="reservation-result-row"><span>휴대폰번호</span><strong>{booking.customerPhone}</strong></div>
        <div className="reservation-result-row"><span>생년월일</span><strong>{booking.customerBirth}</strong></div>
      </div>

      {booking.canCancel ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <button className="btn btn-outline btn-md" onClick={() => onCancel(booking.reservationNumber)} disabled={isCancelling}>
            {isCancelling ? '처리 중' : '예약 취소'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function GuestBookingsPage() {
  const [searchParams] = useSearchParams()
  const initialCustomerName = searchParams.get('customerName') || ''
  const initialCustomerPhone = searchParams.get('customerPhone') || ''
  const initialCustomerBirth = searchParams.get('customerBirth') || ''

  const [customerName, setCustomerName] = useState(initialCustomerName)
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone)
  const [customerBirth, setCustomerBirth] = useState(initialCustomerBirth)
  const [results, setResults] = useState([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [hasLookedUp, setHasLookedUp] = useState(false)
  const [isLookupSubmitting, setIsLookupSubmitting] = useState(false)
  const [cancellingReservationCode, setCancellingReservationCode] = useState('')

  const canSubmit = useMemo(
    () => Boolean(String(customerName).trim()) && /^\d{10,11}$/.test(normalizePhone(customerPhone)) && /^\d{8}$/.test(normalizeBirth(customerBirth)),
    [customerName, customerPhone, customerBirth],
  )

  const handleLookup = async () => {
    try {
      setIsLookupSubmitting(true)
      setHasLookedUp(true)
      setNotice('')
      const response = await lookupGuestBooking({ customerName, customerPhone, customerBirth })
      setResults(response.bookings || [])
      setError('')
    } catch (lookupError) {
      setResults([])
      setError(lookupError.message || '예약 조회에 실패했습니다.')
    } finally {
      setIsLookupSubmitting(false)
    }
  }

  const handleCancel = async (reservationCode) => {
    if (!reservationCode) return

    const confirmed = window.confirm('이 예약을 취소하시겠습니까?')
    if (!confirmed) return

    try {
      setCancellingReservationCode(reservationCode)
      setNotice('')
      const cancelled = await cancelGuestBooking({ customerName, customerPhone, customerBirth, reservationCode })
      setResults((current) => current.filter((item) => item.reservationNumber !== cancelled.booking?.reservationNumber))
      setError('')
      setNotice('예약이 취소되었습니다.')
    } catch (cancelError) {
      setError(cancelError.message || '예약 취소에 실패했습니다.')
    } finally {
      setCancellingReservationCode('')
    }
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>비회원 예약조회</h1>
              <p className="small-note" style={{ marginTop: 8 }}>이름, 휴대폰번호, 생년월일로 진행 중인 예약을 확인하고 취소할 수 있습니다.</p>
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
              <button className="btn btn-dark btn-md" disabled={!canSubmit || isLookupSubmitting} onClick={handleLookup}>{isLookupSubmitting ? '처리 중' : '예약 조회'}</button>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>

            {error && <p className="small-note" style={{ margin: 0 }}>{error}</p>}
            {notice && <p className="small-note" style={{ margin: 0 }}>{notice}</p>}

            {hasLookedUp && !error && results.length === 0 ? (
              <div className="legal-note" style={{ marginTop: 0 }}>조회 가능한 진행 중 예약이 없습니다.</div>
            ) : null}

            {results.length > 0 ? (
              <div className="panel-sub" style={{ display: 'grid', gap: 16 }}>
                {results.map((booking) => (
                  <ReservationCard
                    key={booking.id || booking.reservationNumber}
                    booking={booking}
                    onCancel={handleCancel}
                    isCancelling={cancellingReservationCode === booking.reservationNumber}
                  />
                ))}
              </div>
            ) : null}
          </article>
        </div>
      </section>
    </PageShell>
  )
}
