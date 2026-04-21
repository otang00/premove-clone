import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { getGuestReservation } from '../services/guestReservations'

function formatDisplay(dateText) {
  const [datePart = '', timePart = ''] = String(dateText || '').split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = '00', minute = '00'] = timePart.split(':')
  const d = new Date(year || 0, (month || 1) - 1, day || 1)
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] || ''
  return `${String(month || '').padStart(2, '0')}.${String(day || '').padStart(2, '0')}(${week}) ${hour}:${minute}`
}

function getPickupLabel(schedule) {
  if (!schedule) return '-'
  if (schedule.pickupOption !== 'delivery') return '회사 방문 수령'
  return [schedule.deliveryAddress, schedule.deliveryAddressDetail].filter(Boolean).join(' ')
}

export default function ReservationCompletePage() {
  const [searchParams] = useSearchParams()
  const reservationNumber = searchParams.get('reservationNumber') || ''
  const reservation = getGuestReservation(reservationNumber)

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>예약 확정</h1>
              <p className="small-note" style={{ marginTop: 8 }}>
                {reservation ? '예약이 정상적으로 저장되었습니다.' : '예약 정보를 찾지 못했습니다.'}
              </p>
            </div>

            {reservation ? (
              <>
                <div className="info-grid two">
                  <div><span>예약번호</span><strong>{reservation.reservationNumber}</strong></div>
                  <div><span>상태</span><strong>{reservation.status === 'cancelled' ? '예약 취소' : '예약 확정'}</strong></div>
                  <div><span>차량</span><strong>{reservation.car.name}</strong></div>
                  <div><span>총 금액</span><strong>{reservation.pricing.finalPrice}</strong></div>
                  <div><span>대여일시</span><strong>{formatDisplay(reservation.schedule.deliveryDateTime)}</strong></div>
                  <div><span>반납일시</span><strong>{formatDisplay(reservation.schedule.returnDateTime)}</strong></div>
                  <div><span>배차/수령</span><strong>{getPickupLabel(reservation.schedule)}</strong></div>
                  <div><span>예약자</span><strong>{reservation.customerName}</strong></div>
                </div>

                <div className="panel-sub" style={{ display: 'grid', gap: 8 }}>
                  <strong>비회원 예약조회 안내</strong>
                  <p className="field-note" style={{ margin: 0 }}>
                    예약번호와 휴대폰번호로 조회할 수 있습니다. 필요하면 조회 화면에서 예약 취소도 가능합니다.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    className="btn btn-dark btn-md"
                    to={`/guest-bookings?reservationNumber=${encodeURIComponent(reservation.reservationNumber)}&customerPhone=${encodeURIComponent(reservation.customerPhone)}`}
                  >
                    비회원 예약조회로 이동
                  </Link>
                  <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn btn-dark btn-md" to="/guest-bookings">비회원 예약조회</Link>
                <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
              </div>
            )}
          </article>
        </div>
      </section>
    </PageShell>
  )
}
