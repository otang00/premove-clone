import { parseApiResponse } from '../utils/apiResponse'
import { toBookingViewModel } from './bookingViewModel'

export async function fetchAdminBookingConfirm(session, token) {
  const accessToken = session?.access_token
  const response = await fetch(`/api/admin/booking-confirm?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  const result = await parseApiResponse(response, '예약 확인 정보를 불러오지 못했습니다.')
  return {
    booking: toBookingViewModel(result.booking),
  }
}

export async function confirmAdminBooking(session, token) {
  const accessToken = session?.access_token
  const response = await fetch('/api/admin/booking-confirm', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ token }),
  })

  const result = await parseApiResponse(response, '예약 확정에 실패했습니다.')
  return {
    booking: toBookingViewModel(result.booking),
    alreadyProcessed: Boolean(result.alreadyProcessed),
    message: result.message || '',
  }
}

export async function cancelAdminBooking(session, token, payload = {}) {
  const accessToken = session?.access_token
  const response = await fetch('/api/admin/booking-cancel', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      token,
      reason: payload.reason || '',
    }),
  })

  const result = await parseApiResponse(response, '예약 취소에 실패했습니다.')
  return {
    booking: toBookingViewModel(result.booking),
    mapping: result.mapping || null,
  }
}
