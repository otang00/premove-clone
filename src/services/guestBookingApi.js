import { parseApiResponse } from '../utils/apiResponse'

function formatDisplay(dateText) {
  const [datePart = '', timePart = ''] = String(dateText || '').split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = '00', minute = '00'] = timePart.split(':')
  const d = new Date(year || 0, (month || 1) - 1, day || 1)
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] || ''
  return `${String(month || '').padStart(2, '0')}.${String(day || '').padStart(2, '0')}(${week}) ${hour}:${minute}`
}

function formatIsoToLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function getPickupLabel(snapshot, pickupMethod) {
  if (pickupMethod !== 'delivery') return '회사 방문 수령'
  if (!snapshot) return '-'
  return [snapshot.deliveryAddress, snapshot.deliveryAddressDetail].filter(Boolean).join(' ')
}

function toBookingViewModel(booking) {
  if (!booking) return null

  return {
    ...booking,
    reservationNumber: booking.publicReservationCode,
    status: booking.bookingStatus === 'cancelled' ? 'cancelled' : 'confirmed',
    pricing: {
      finalPrice: `${Number(booking.quotedTotalAmount || 0).toLocaleString('ko-KR')}원`,
      rawFinalPrice: Number(booking.quotedTotalAmount || 0),
    },
    schedule: {
      deliveryDateTime: formatIsoToLocalDateTime(booking.pickupAt),
      returnDateTime: formatIsoToLocalDateTime(booking.returnAt),
      pickupOption: booking.pickupMethod,
      deliveryAddress: booking.pickupLocationSnapshot?.deliveryAddress || '',
      deliveryAddressDetail: booking.pickupLocationSnapshot?.deliveryAddressDetail || '',
      displayPickupLabel: getPickupLabel(booking.pickupLocationSnapshot, booking.pickupMethod),
    },
    display: {
      pickupAt: formatDisplay(formatIsoToLocalDateTime(booking.pickupAt)),
      returnAt: formatDisplay(formatIsoToLocalDateTime(booking.returnAt)),
    },
  }
}

export async function createGuestBooking(payload, options = {}) {
  const accessToken = options.session?.access_token
  const response = await fetch('/api/guest-bookings/create', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const result = await parseApiResponse(response, '예약 생성에 실패했습니다.')
  return toBookingViewModel(result.booking)
}

export async function lookupGuestBooking(payload) {
  const response = await fetch('/api/guest-bookings/lookup', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await parseApiResponse(response, '예약 조회에 실패했습니다.')
  return {
    booking: toBookingViewModel(result.booking),
    mapping: result.mapping || null,
  }
}

export async function cancelGuestBooking(payload) {
  const response = await fetch('/api/guest-bookings/cancel', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await parseApiResponse(response, '예약 취소에 실패했습니다.')
  return {
    booking: toBookingViewModel(result.booking),
    mapping: result.mapping || null,
  }
}
