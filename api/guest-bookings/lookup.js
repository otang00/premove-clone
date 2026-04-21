'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { lookupGuestBooking } = require('../../server/booking-core/guestBookingService')
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
      error: 'invalid_guest_lookup_request',
      errors: validation.errors,
    })
  }

  const supabaseClient = createServerClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  try {
    const result = await lookupGuestBooking({
      supabaseClient,
      customerName: validation.normalized.customerName,
      customerPhone: validation.normalized.customerPhone,
      customerBirth: validation.normalized.customerBirth,
    })

    if (!result) {
      return res.status(404).json({
        error: 'booking_not_found',
        message: '일치하는 예약을 찾을 수 없습니다.',
      })
    }

    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({
      error: 'guest_lookup_failed',
      message: error?.message || 'guest_lookup_failed',
    })
  }
}
