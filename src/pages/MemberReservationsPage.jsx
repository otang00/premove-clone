import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { getMemberBookings } from '../services/memberBookingApi'

export default function MemberReservationsPage() {
  const navigate = useNavigate()
  const { loading, isAuthenticated, session } = useAuth()
  const [bookings, setBookings] = useState([])
  const [profile, setProfile] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login?redirectTo=/reservations', { replace: true })
    }
  }, [loading, isAuthenticated, navigate])

  useEffect(() => {
    let isCancelled = false

    if (!session?.access_token) {
      setFetching(false)
      return () => {
        isCancelled = true
      }
    }

    getMemberBookings(session)
      .then((result) => {
        if (isCancelled) return
        setProfile(result.profile || null)
        setBookings(result.bookings || [])
        setError('')
      })
      .catch((fetchError) => {
        if (isCancelled) return
        setError(fetchError.message || '회원 예약내역을 불러오지 못했습니다.')
        setBookings([])
      })
      .finally(() => {
        if (isCancelled) return
        setFetching(false)
      })

    return () => {
      isCancelled = true
    }
  }, [session])

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>예약내역</h1>
              <p className="small-note" style={{ marginTop: 8 }}>
                로그인한 계정에 연결된 예약만 보여줍니다.
              </p>
            </div>

            <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
              <div className="reservation-result-row"><span>회원 이메일</span><strong>{profile?.email || '-'}</strong></div>
              <div className="reservation-result-row"><span>회원 이름</span><strong>{profile?.name || '-'}</strong></div>
              <div className="reservation-result-row"><span>예약 수</span><strong>{fetching ? '불러오는 중' : `${bookings.length}건`}</strong></div>
            </div>

            {error ? <p className="field-note" style={{ color: '#be123c', margin: 0 }}>{error}</p> : null}

            {!fetching && bookings.length === 0 ? (
              <div className="panel-sub" style={{ display: 'grid', gap: 8 }}>
                <strong>연결된 예약이 없습니다.</strong>
                <p className="field-note" style={{ margin: 0 }}>
                  현재 계정에 연결된 예약이 아직 없습니다. 비회원으로 만든 예약은 추후 연결 기능에서 귀속할 수 있습니다.
                </p>
              </div>
            ) : null}

            {bookings.length > 0 ? (
              <div className="panel-sub" style={{ display: 'grid', gap: 16 }}>
                {bookings.map((booking) => (
                  <div key={booking.id} className="reservation-result-card">
                    <div className="reservation-result-card__header">
                      <div>
                        <span className="reservation-result-card__eyebrow">회원 예약</span>
                        <strong className="reservation-result-card__title">{booking.pricingSnapshot?.carName || booking.reservationNumber || '-'}</strong>
                      </div>
                      <div className={`reservation-result-card__status ${booking.status === 'cancelled' ? 'is-cancelled' : 'is-confirmed'}`}>
                        {booking.status === 'cancelled' ? '예약 취소' : '예약 확정'}
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
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="btn btn-outline btn-md" to="/guest-bookings">비회원 예약조회</Link>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
