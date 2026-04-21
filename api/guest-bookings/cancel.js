'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { cancelGuestBooking } = require('../../server/booking-core/guestBookingService')
const { validateGuestLookupInput } = require('../../server/booking-core/guestBookingUtils')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {}
  const validation = validateGuestLookupInput(payload)
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'invalid_guest_cancel_request',
      errors: validation.errors,
    })
  }

  const supabaseClient = createServerClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  try {
    const result = await cancelGuestBooking({
      supabaseClient,
      publicReservationCode: validation.normalized.publicReservationCode,
      phoneLast4: validation.normalized.phoneLast4,
      requestedBy: 'guest',
      reason: payload.reason || '',
    })

    if (!result.ok) {
      return res.status(result.status || 400).json({
        error: result.code || 'guest_cancel_failed',
        message: result.message || '예약취소에 실패했습니다.',
        booking: result.booking || null,
      })
    }

    return res.status(200).json({
      booking: result.booking,
      mapping: result.mapping,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'guest_cancel_failed',
      message: error?.message || 'guest_cancel_failed',
    })
  }
}
