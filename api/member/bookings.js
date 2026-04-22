'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { getAccessTokenFromRequest } = require('../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../server/auth/getUserFromAccessToken')
const { ensureProfileForUser, serializeProfile } = require('../../server/auth/ensureProfileForUser')
const { serializeBookingOrder } = require('../../server/booking-core/guestBookingUtils')

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

  try {
    const authUser = await getUserFromAccessToken({ supabaseClient, accessToken })
    if (!authUser) {
      return res.status(401).json({ error: 'invalid_access_token', message: '로그인이 필요합니다.' })
    }

    const profile = await ensureProfileForUser({ supabaseClient, authUser })
    const { data, error } = await supabaseClient
      .from('booking_orders')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return res.status(200).json({
      profile: serializeProfile(profile),
      bookings: Array.isArray(data) ? data.map((item) => serializeBookingOrder(item)) : [],
    })
  } catch (error) {
    return res.status(500).json({
      error: 'member_bookings_failed',
      message: error?.message || 'member_bookings_failed',
    })
  }
}
