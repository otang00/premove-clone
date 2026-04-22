'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { getAccessTokenFromRequest } = require('../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../server/auth/getUserFromAccessToken')
const { assertAdminUser } = require('../../server/auth/adminAccess')
const { fetchBookingOrderByConfirmationToken, confirmBookingByToken } = require('../../server/booking-core/bookingConfirmationService')

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST')
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

  const token = String(req.method === 'GET' ? req.query?.token || '' : req.body?.token || '').trim()
  if (!token) {
    return res.status(400).json({ error: 'missing_token', message: '확정 토큰이 필요합니다.' })
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

    if (req.method === 'GET') {
      const result = await fetchBookingOrderByConfirmationToken({ supabaseClient, token })
      if (!result.ok) {
        return res.status(result.status || 400).json({ error: result.code || 'booking_confirm_lookup_failed', message: result.message })
      }

      return res.status(200).json({ booking: result.booking })
    }

    const result = await confirmBookingByToken({ supabaseClient, token, requestedBy: 'admin_web' })
    if (!result.ok) {
      return res.status(result.status || 400).json({
        error: result.code || 'booking_confirm_failed',
        message: result.message || '예약 확정에 실패했습니다.',
        booking: result.booking || null,
      })
    }

    return res.status(200).json({
      booking: result.booking,
      alreadyProcessed: Boolean(result.alreadyProcessed),
      message: result.message || null,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'booking_confirm_failed',
      message: error?.message || 'booking_confirm_failed',
    })
  }
}
