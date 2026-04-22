'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { getAccessTokenFromRequest } = require('../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../server/auth/getUserFromAccessToken')
const { assertAdminUser } = require('../../server/auth/adminAccess')
const { fetchBookingOrderByConfirmationToken } = require('../../server/booking-core/bookingConfirmationService')
const { cancelBookingOrder } = require('../../server/booking-core/guestBookingService')

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
    return res.status(401).json({ error: 'missing_access_token', message: '관리자 로그인이 필요합니다.' })
  }

  const token = String(req.body?.token || '').trim()
  const reason = String(req.body?.reason || '').trim()
  if (!token) {
    return res.status(400).json({ error: 'missing_token', message: '예약 토큰이 필요합니다.' })
  }

  try {
    const authUser = await getUserFromAccessToken({ supabaseClient, accessToken })
    if (!authUser) {
      return res.status(401).json({ error: 'invalid_access_token', message: '관리자 로그인이 필요합니다.' })
    }

    const access = assertAdminUser(authUser)
    if (!access.ok) {
      return res.status(access.status).json({ error: access.code, message: access.message })
    }

    const lookup = await fetchBookingOrderByConfirmationToken({ supabaseClient, token })
    if (!lookup.ok) {
      return res.status(lookup.status || 400).json({
        error: lookup.code || 'admin_cancel_lookup_failed',
        message: lookup.message || '예약 정보를 찾지 못했습니다.',
      })
    }

    const result = await cancelBookingOrder({
      supabaseClient,
      order: lookup.rawBooking,
      requestedBy: 'admin_web',
      eventType: 'admin_cancelled',
      reason,
    })

    if (!result.ok) {
      return res.status(result.status || 400).json({
        error: result.code || 'admin_cancel_failed',
        message: result.message || '예약 취소에 실패했습니다.',
        booking: result.booking || null,
      })
    }

    return res.status(200).json({
      booking: result.booking,
      mapping: result.mapping || null,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'admin_cancel_failed',
      message: error?.message || 'admin_cancel_failed',
    })
  }
}
