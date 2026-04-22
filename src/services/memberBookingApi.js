import { fetchMemberBookingDetail, fetchMemberBookings } from './authApi'

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

export function toBookingViewModel(booking) {
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

export async function getMemberBookings(session) {
  const result = await fetchMemberBookings(session)
  return {
    profile: result.profile || null,
    bookings: Array.isArray(result.bookings) ? result.bookings.map(toBookingViewModel) : [],
  }
}

export async function getMemberBookingDetail(session, reservationCode) {
  const result = await fetchMemberBookingDetail(session, reservationCode)
  return {
    booking: toBookingViewModel(result.booking),
  }
}
