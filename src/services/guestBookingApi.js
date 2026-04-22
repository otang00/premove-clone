import { parseApiResponse } from '../utils/apiResponse'
import { toBookingViewModel } from './bookingViewModel'

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
