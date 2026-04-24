'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { cancelGuestBooking } = require('../../server/booking-core/guestBookingService')
const { validateGuestLookupInput } = require('../../server/booking-core/guestBookingUtils')
const { checkGuestLookupProtection, applyRetryAfter, delayFailureResponse } = require('../../server/security/guestLookupProtection')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {}
  const validation = validateGuestLookupInput(payload)
  if (!validation.isValid) {
    await delayFailureResponse()
    return res.status(400).json({
      error: 'invalid_guest_cancel_request',
      errors: validation.errors,
    })
  }

  const protection = checkGuestLookupProtection({ action: 'cancel', req })
  if (!protection.ok) {
    applyRetryAfter(res, protection.retryAfterSeconds)
    return res.status(429).json({
      error: 'too_many_requests',
      message: '요청이 일시적으로 제한되었습니다. 잠시 후 다시 시도해 주세요.',
    })
  }

  const supabaseClient = createServerClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  try {
    const result = await cancelGuestBooking({
      supabaseClient,
      customerName: validation.normalized.customerName,
      customerPhone: validation.normalized.customerPhone,
      customerBirth: validation.normalized.customerBirth,
      requestedBy: 'guest',
      reason: payload.reason || '',
    })

    if (!result.ok) {
      const shouldCountAsFailure = ['member_booking_only', 'booking_not_found', 'cancel_not_allowed_status', 'cancel_not_allowed_payment_status', 'cancel_started_booking'].includes(result.code)
      if (shouldCountAsFailure) {
        const failure = protection.recordFailure()
        await delayFailureResponse()
        applyRetryAfter(res, failure.retryAfterSeconds)
      }

      return res.status(result.status || 400).json({
        error: result.code || 'guest_cancel_failed',
        message: result.message || '예약취소에 실패했습니다.',
        booking: result.booking || null,
      })
    }

    protection.recordSuccess()

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
