'use strict'

const { createServerClient } = require('../../../../server/supabase/createServerClient')
const { getAccessTokenFromRequest } = require('../../../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../../../server/auth/getUserFromAccessToken')
const { cancelMemberBooking } = require('../../../../server/booking-core/guestBookingService')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const supabaseClient = createServerClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  const accessToken = getAccessTokenFromRequest(req)
  if (!accessToken) {
    return res.status(401).json({ error: 'missing_access_token', message: '로그인이 필요합니다.' })
  }

  const reservationCode = String(req.query?.reservationCode || '').trim().toUpperCase()
  if (!reservationCode) {
    return res.status(400).json({ error: 'missing_reservation_code', message: '예약번호가 필요합니다.' })
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {}

  try {
    const authUser = await getUserFromAccessToken({ supabaseClient, accessToken })
    if (!authUser) {
      return res.status(401).json({ error: 'invalid_access_token', message: '로그인이 필요합니다.' })
    }

    const result = await cancelMemberBooking({
      supabaseClient,
      authUserId: authUser.id,
      reservationCode,
      requestedBy: 'member_web',
      reason: payload.reason || '',
    })

    if (!result.ok) {
      return res.status(result.status || 400).json({
        error: result.code || 'member_cancel_failed',
        message: result.message || '예약취소에 실패했습니다.',
        booking: result.booking || null,
      })
    }

    return res.status(200).json({
      booking: result.booking,
      mapping: result.mapping || null,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'member_cancel_failed',
      message: error?.message || 'member_cancel_failed',
    })
  }
}
