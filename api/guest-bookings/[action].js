'use strict'

const { createServerPrivilegedClient } = require('../../server/supabase/createServerClient')
const { createGuestBooking, lookupGuestBooking, fetchBookingOrderByCompletionToken, cancelGuestBooking } = require('../../server/booking-core/guestBookingService')
const { recordReservationStatusEvent } = require('../../server/booking-core/bookingConfirmationService')
const { validateGuestBookingCreateInput, validateGuestLookupInput } = require('../../server/booking-core/guestBookingUtils')
const { getAccessTokenFromRequest } = require('../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../server/auth/getUserFromAccessToken')
const { sendBookingConfirmationEmail } = require('../../server/email/sendBookingConfirmationEmail')
const { createBookingCompleteToken, verifyBookingCompleteToken } = require('../../server/security/bookingCompleteToken')
const { checkGuestLookupProtection, applyRetryAfter, delayFailureResponse } = require('../../server/security/guestLookupProtection')

function getBody(req) {
  return typeof req.body === 'object' && req.body !== null ? req.body : {}
}

async function handleCreate(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = getBody(req)
  const validation = validateGuestBookingCreateInput(payload)
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'invalid_guest_booking_create_request',
      errors: validation.errors,
    })
  }

  const supabaseClient = createServerPrivilegedClient()
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

    let emailMeta = null
    try {
      const emailResult = await sendBookingConfirmationEmail({ booking: result.booking, req })
      emailMeta = {
        delivered: true,
        messageId: emailResult.messageId,
        accepted: emailResult.accepted,
        rejected: emailResult.rejected,
        confirmUrl: emailResult.confirmUrl,
      }

      await recordReservationStatusEvent({
        supabaseClient,
        bookingOrderId: result.booking.id,
        eventType: 'booking_confirmation_email_sent',
        eventPayload: {
          requestedBy: authUser ? 'member_web' : 'guest_web',
          messageId: emailResult.messageId,
          accepted: emailResult.accepted,
          rejected: emailResult.rejected,
          response: emailResult.response,
        },
      })
    } catch (emailError) {
      console.error('[booking-confirmation-email] failed', {
        reservationCode: result.booking.publicReservationCode,
        message: emailError?.message || 'unknown_email_error',
      })

      await recordReservationStatusEvent({
        supabaseClient,
        bookingOrderId: result.booking.id,
        eventType: 'booking_confirmation_email_failed',
        eventPayload: {
          requestedBy: authUser ? 'member_web' : 'guest_web',
          message: emailError?.message || 'unknown_email_error',
        },
      }).catch(() => null)

      emailMeta = {
        delivered: false,
      }
    }

    return res.status(201).json({
      booking: result.booking,
      completionToken: createBookingCompleteToken({
        bookingOrderId: result.booking.id,
        reservationCode: result.booking.publicReservationCode,
      }).token,
      email: emailMeta,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'guest_booking_create_failed',
      message: error?.message || 'guest_booking_create_failed',
    })
  }
}

async function handleLookup(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = getBody(req)
  const completionToken = String(payload.completionToken || '').trim()

  if (completionToken) {
    const tokenValidation = verifyBookingCompleteToken({ token: completionToken })
    if (!tokenValidation.isValid) {
      return res.status(403).json({
        error: 'invalid_booking_complete_token',
        message: '예약 완료 정보를 확인할 수 없습니다.',
      })
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
        return res.status(404).json({
          error: 'booking_not_found',
          message: '예약 정보를 찾지 못했습니다.',
        })
      }

      return res.status(200).json({ booking })
    } catch (error) {
      return res.status(500).json({
        error: 'guest_booking_complete_failed',
        message: error?.message || 'guest_booking_complete_failed',
      })
    }
  }

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

  const supabaseClient = createServerPrivilegedClient()
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

async function handleCancel(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = getBody(req)
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

  const supabaseClient = createServerPrivilegedClient()
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

module.exports = async function handler(req, res) {
  const action = String(req.query?.action || '').trim()

  if (action === 'create') {
    return handleCreate(req, res)
  }

  if (action === 'lookup') {
    return handleLookup(req, res)
  }

  if (action === 'cancel') {
    return handleCancel(req, res)
  }

  return res.status(404).json({ error: 'not_found' })
}
