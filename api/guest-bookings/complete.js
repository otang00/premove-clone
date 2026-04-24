'use strict'

const { createServerPrivilegedClient } = require('../../server/supabase/createServerClient')
const { fetchBookingOrderByCompletionToken } = require('../../server/booking-core/guestBookingService')
const { verifyBookingCompleteToken } = require('../../server/security/bookingCompleteToken')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const token = String(req.query?.token || '').trim()
  if (!token) {
    return res.status(400).json({ error: 'missing_token', message: '완료 토큰이 필요합니다.' })
  }

  const tokenValidation = verifyBookingCompleteToken({ token })
  if (!tokenValidation.isValid) {
    return res.status(403).json({ error: 'invalid_booking_complete_token', message: '예약 완료 정보를 확인할 수 없습니다.' })
  }

  const supabaseClient = createServerPrivilegedClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  try {
    const booking = await fetchBookingOrderByCompletionToken({
      supabaseClient,
      bookingOrderId: tokenValidation.payload.boid,
      reservationCode: tokenValidation.payload.rc,
    })

    if (!booking) {
      return res.status(404).json({ error: 'booking_not_found', message: '예약 정보를 찾지 못했습니다.' })
    }

    return res.status(200).json({ booking })
  } catch (error) {
    return res.status(500).json({
      error: 'guest_booking_complete_failed',
      message: error?.message || 'guest_booking_complete_failed',
    })
  }
}
