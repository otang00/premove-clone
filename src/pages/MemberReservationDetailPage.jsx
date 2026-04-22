import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { cancelMemberBooking, getMemberBookingDetail } from '../services/memberBookingApi'

export default function MemberReservationDetailPage() {
  const navigate = useNavigate()
  const { reservationCode = '' } = useParams()
  const { loading, isAuthenticated, session } = useAuth()
  const [booking, setBooking] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(`/login?redirectTo=${encodeURIComponent(`/reservations/${reservationCode}`)}`, { replace: true })
    }
  }, [loading, isAuthenticated, navigate, reservationCode])

  useEffect(() => {
    let isCancelled = false

    if (!session?.access_token || !reservationCode) {
      setFetching(false)
      return () => {
        isCancelled = true
      }
    }

    getMemberBookingDetail(session, reservationCode)
      .then((result) => {
        if (isCancelled) return
        setBooking(result.booking || null)
        setError('')
        setSuccessMessage('')
      })
      .catch((fetchError) => {
        if (isCancelled) return
        setBooking(null)
        setError(fetchError.message || '회원 예약 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (isCancelled) return
        setFetching(false)
      })

    return () => {
      isCancelled = true
    }
  }, [reservationCode, session])

  async function handleCancel() {
    if (!booking?.canCancel || !session?.access_token) return

    const confirmed = window.confirm('이 예약을 취소하시겠습니까?')
    if (!confirmed) return

    try {
      setSubmitting(true)
      const result = await cancelMemberBooking(session, booking.reservationNumber)
      setBooking(result.booking || null)
      setError('')
      setSuccessMessage('예약이 취소되었습니다.')
    } catch (cancelError) {
      setError(cancelError.message || '회원 예약취소에 실패했습니다.')
      setSuccessMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>예약상세</h1>
              <p className="small-note" style={{ marginTop: 8 }}>
                로그인한 계정에 연결된 예약만 확인할 수 있습니다.
              </p>
            </div>

            {fetching ? <p className="field-note" style={{ margin: 0 }}>예약 정보를 불러오는 중입니다.</p> : null}
            {error ? <p className="field-note" style={{ color: '#be123c', margin: 0 }}>{error}</p> : null}
            {successMessage ? <p className="field-note" style={{ color: '#166534', margin: 0 }}>{successMessage}</p> : null}

            {booking ? (
              <div className="reservation-result-card panel-sub">
                <div className="reservation-result-card__header">
                  <div>
                    <span className="reservation-result-card__eyebrow">회원 예약 상세</span>
                    <strong className="reservation-result-card__title">{booking.pricingSnapshot?.carName || booking.reservationNumber || '-'}</strong>
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
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {booking?.canCancel ? (
                <button className="btn btn-dark btn-md" type="button" onClick={handleCancel} disabled={submitting || fetching}>
                  {submitting ? '처리 중' : '예약 취소'}
                </button>
              ) : null}
              <Link className="btn btn-outline btn-md" to="/reservations">예약내역</Link>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
