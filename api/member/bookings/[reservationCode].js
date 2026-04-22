'use strict'

const { createServerClient } = require('../../../server/supabase/createServerClient')
const { getAccessTokenFromRequest } = require('../../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../../server/auth/getUserFromAccessToken')
const { serializeBookingOrder } = require('../../../server/booking-core/guestBookingUtils')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
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

  try {
    const authUser = await getUserFromAccessToken({ supabaseClient, accessToken })
    if (!authUser) {
      return res.status(401).json({ error: 'invalid_access_token', message: '로그인이 필요합니다.' })
    }

    const { data, error } = await supabaseClient
      .from('booking_orders')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('public_reservation_code', reservationCode)
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return res.status(404).json({ error: 'booking_not_found', message: '예약 정보를 찾지 못했습니다.' })
    }

    return res.status(200).json({
      booking: serializeBookingOrder(data),
    })
  } catch (error) {
    return res.status(500).json({
      error: 'member_booking_detail_failed',
      message: error?.message || 'member_booking_detail_failed',
    })
  }
}
