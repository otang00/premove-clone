'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { lookupGuestBooking } = require('../../server/booking-core/guestBookingService')
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
      error: 'invalid_guest_lookup_request',
      errors: validation.errors,
    })
  }

  const protection = checkGuestLookupProtection({ action: 'lookup', req })
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
    const result = await lookupGuestBooking({
      supabaseClient,
      customerName: validation.normalized.customerName,
      customerPhone: validation.normalized.customerPhone,
      customerBirth: validation.normalized.customerBirth,
    })

    if (!result) {
      const failure = protection.recordFailure()
      await delayFailureResponse()
      applyRetryAfter(res, failure.retryAfterSeconds)
      return res.status(404).json({
        error: 'booking_not_found',
        message: '일치하는 예약을 찾을 수 없습니다.',
      })
    }

    if (result.blockedReason === 'member_booking_only') {
      const failure = protection.recordFailure()
      await delayFailureResponse()
      applyRetryAfter(res, failure.retryAfterSeconds)
      return res.status(403).json({
        error: 'member_booking_only',
        message: result.message || '이 예약은 회원 예약입니다. 로그인 후 예약내역에서 확인해 주세요.',
      })
    }

    protection.recordSuccess()

    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({
      error: 'guest_lookup_failed',
      message: error?.message || 'guest_lookup_failed',
    })
  }
}
