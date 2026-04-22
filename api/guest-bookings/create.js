'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { createGuestBooking } = require('../../server/booking-core/guestBookingService')
const { validateGuestBookingCreateInput } = require('../../server/booking-core/guestBookingUtils')
const { getAccessTokenFromRequest } = require('../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../server/auth/getUserFromAccessToken')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {}
  const validation = validateGuestBookingCreateInput(payload)
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'invalid_guest_booking_create_request',
      errors: validation.errors,
    })
  }

  const supabaseClient = createServerClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  try {
    const accessToken = getAccessTokenFromRequest(req)
    const authUser = accessToken
      ? await getUserFromAccessToken({ supabaseClient, accessToken })
      : null

    const result = await createGuestBooking({
      supabaseClient,
      bookingInput: validation.normalized,
      requestedBy: authUser ? 'member_web' : 'guest_web',
      authUserId: authUser?.id || null,
    })

    if (!result.ok) {
      return res.status(result.status || 400).json({
        error: result.code || 'guest_booking_create_failed',
        message: result.message || '예약 생성에 실패했습니다.',
        conflicts: result.conflicts || null,
      })
    }

    return res.status(201).json({
      booking: result.booking,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'guest_booking_create_failed',
      message: error?.message || 'guest_booking_create_failed',
    })
  }
}
