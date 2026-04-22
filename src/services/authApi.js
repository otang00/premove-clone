import { parseApiResponse } from '../utils/apiResponse'

function getAuthorizationHeaders(session) {
  const accessToken = session?.access_token
  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {}
}

export async function fetchAuthMe(session) {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: {
      ...getAuthorizationHeaders(session),
    },
  })

  return parseApiResponse(response, '회원 정보를 불러오지 못했습니다.')
}

export async function fetchMemberBookings(session) {
  const response = await fetch('/api/member/bookings', {
    method: 'GET',
    headers: {
      ...getAuthorizationHeaders(session),
    },
  })

  return parseApiResponse(response, '회원 예약내역을 불러오지 못했습니다.')
}

export async function fetchMemberBookingDetail(session, reservationCode) {
  const response = await fetch(`/api/member/bookings/${encodeURIComponent(reservationCode)}`, {
    method: 'GET',
    headers: {
      ...getAuthorizationHeaders(session),
    },
  })

  return parseApiResponse(response, '회원 예약 정보를 불러오지 못했습니다.')
}
