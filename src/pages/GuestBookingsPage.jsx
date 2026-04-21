import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { cancelGuestReservation, findGuestReservation } from '../services/guestReservations'

function formatDisplay(dateText) {
  const [datePart = '', timePart = ''] = String(dateText || '').split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = '00', minute = '00'] = timePart.split(':')
  const d = new Date(year || 0, (month || 1) - 1, day || 1)
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] || ''
  return `${String(month || '').padStart(2, '0')}.${String(day || '').padStart(2, '0')}(${week}) ${hour}:${minute}`
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '').slice(0, 11)
}

function normalizeBirth(value) {
  return String(value || '').replace(/[^\d]/g, '').slice(0, 8)
}

function getPickupLabel(schedule) {
  if (!schedule) return '-'
  if (schedule.pickupOption !== 'delivery') return '회사 방문 수령'
  return [schedule.deliveryAddress, schedule.deliveryAddressDetail].filter(Boolean).join(' ')
}

export default function GuestBookingsPage() {
  const [searchParams] = useSearchParams()
  const initialReservationNumber = searchParams.get('reservationNumber') || ''
  const initialCustomerPhone = searchParams.get('customerPhone') || ''
  const initialCustomerBirth = searchParams.get('customerBirth') || ''

  const [reservationNumber, setReservationNumber] = useState(initialReservationNumber)
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone)
  const [customerBirth, setCustomerBirth] = useState(initialCustomerBirth)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => Boolean(String(reservationNumber).trim()) && /^\d{10,11}$/.test(normalizePhone(customerPhone)) && /^\d{8}$/.test(normalizeBirth(customerBirth)),
    [reservationNumber, customerPhone, customerBirth],
  )

  const handleLookup = () => {
    const reservation = findGuestReservation({ reservationNumber, customerPhone, customerBirth })

    if (!reservation) {
      setResult(null)
      setError('일치하는 비회원 예약을 찾지 못했습니다. 예약번호, 휴대폰번호, 생년월일을 다시 확인해 주세요.')
      return
    }

    setResult(reservation)
    setError('')
  }

  const handleCancel = () => {
    if (!result || result.status === 'cancelled') return

    const confirmed = window.confirm('이 예약을 취소하시겠습니까?')
    if (!confirmed) return

    const cancelled = cancelGuestReservation({ reservationNumber: result.reservationNumber, customerPhone, customerBirth })
    setResult(cancelled)
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>비회원 예약조회</h1>
              <p className="small-note" style={{ marginTop: 8 }}>예약번호, 휴대폰번호, 생년월일로 예약 상태를 확인하고 취소할 수 있습니다.</p>
            </div>

            <div className="form-grid">
              <div>
                <input
                  className="field-input"
                  placeholder="예약번호"
                  value={reservationNumber}
                  onChange={(e) => setReservationNumber(e.target.value.toUpperCase())}
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
              <button className="btn btn-dark btn-md" disabled={!canSubmit} onClick={handleLookup}>예약 조회</button>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>

            {error && <p className="small-note" style={{ margin: 0 }}>{error}</p>}

            {result && (
              <div className="panel-sub" style={{ display: 'grid', gap: 16 }}>
                <div className="info-grid two">
                  <div><span>예약번호</span><strong>{result.reservationNumber}</strong></div>
                  <div><span>상태</span><strong>{result.status === 'cancelled' ? '예약 취소' : '예약 확정'}</strong></div>
                  <div><span>차량</span><strong>{result.car.name}</strong></div>
                  <div><span>총 금액</span><strong>{result.pricing.finalPrice}</strong></div>
                  <div><span>대여일시</span><strong>{formatDisplay(result.schedule.deliveryDateTime)}</strong></div>
                  <div><span>반납일시</span><strong>{formatDisplay(result.schedule.returnDateTime)}</strong></div>
                  <div><span>배차/수령</span><strong>{getPickupLabel(result.schedule)}</strong></div>
                  <div><span>예약자</span><strong>{result.customerName}</strong></div>
                  <div><span>휴대폰번호</span><strong>{result.customerPhone}</strong></div>
                  <div><span>생년월일</span><strong>{result.customerBirth}</strong></div>
                </div>

                {result.status === 'cancelled' ? (
                  <div className="legal-note" style={{ marginTop: 0 }}>이 예약은 이미 취소되었습니다.</div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-md" onClick={handleCancel}>예약 취소</button>
                  </div>
                )}
              </div>
            )}
          </article>
        </div>
      </section>
    </PageShell>
  )
}
