'use strict'

const { serializeBookingOrder } = require('./guestBookingUtils')
const { verifyBookingConfirmToken } = require('../security/bookingConfirmToken')

function isAlreadyProcessedStatus(bookingStatus = '') {
  return ['confirmed_pending_sync', 'confirmed', 'in_use', 'completed'].includes(String(bookingStatus || ''))
}

async function fetchBookingOrderByConfirmationToken({ supabaseClient, token } = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const tokenCheck = verifyBookingConfirmToken({ token })
  if (!tokenCheck.isValid) {
    return {
      ok: false,
      status: 400,
      code: tokenCheck.reason || 'invalid_token',
      message: '확정 링크가 올바르지 않습니다.',
    }
  }

  const { boid, rc } = tokenCheck.payload
  const { data, error } = await supabaseClient
    .from('booking_orders')
    .select('*')
    .eq('id', boid)
    .eq('public_reservation_code', rc)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return {
      ok: false,
      status: 404,
      code: 'booking_not_found',
      message: '예약 정보를 찾지 못했습니다.',
    }
  }

  return {
    ok: true,
    status: 200,
    rawBooking: data,
    booking: serializeBookingOrder(data),
    tokenPayload: tokenCheck.payload,
  }
}

async function recordReservationStatusEvent({ supabaseClient, bookingOrderId, eventType, eventPayload } = {}) {
  if (!supabaseClient || !bookingOrderId || !eventType) {
    return
  }

  const { error } = await supabaseClient
    .from('reservation_status_events')
    .insert({
      booking_order_id: bookingOrderId,
      event_type: eventType,
      event_payload: eventPayload || null,
    })

  if (error) {
    throw error
  }
}

async function confirmBookingByToken({ supabaseClient, token, requestedBy = 'email_confirm_link' } = {}) {
  const lookup = await fetchBookingOrderByConfirmationToken({ supabaseClient, token })
  if (!lookup.ok) {
    return lookup
  }

  const order = lookup.booking
  if (String(order.bookingStatus || '') === 'cancelled') {
    return {
      ok: false,
      status: 409,
      code: 'booking_cancelled',
      message: '취소된 예약은 확정할 수 없습니다.',
      booking: order,
    }
  }

  if (isAlreadyProcessedStatus(order.bookingStatus)) {
    return {
      ok: true,
      status: 200,
      booking: order,
      alreadyProcessed: true,
      message: '이미 처리된 예약입니다.',
    }
  }

  const { data: updatedOrder, error: updateError } = await supabaseClient
    .from('booking_orders')
    .update({
      booking_status: 'confirmed_pending_sync',
      payment_status: 'paid',
      sync_status: 'pending',
    })
    .eq('id', order.id)
    .eq('booking_status', 'confirmation_pending')
    .select('*')
    .single()

  if (updateError) {
    throw updateError
  }

  await recordReservationStatusEvent({
    supabaseClient,
    bookingOrderId: order.id,
    eventType: 'booking_confirmed',
    eventPayload: {
      requestedBy,
      previousBookingStatus: order.bookingStatus || null,
      previousPaymentStatus: order.paymentStatus || null,
      nextBookingStatus: 'confirmed_pending_sync',
      nextPaymentStatus: 'paid',
      nextSyncStatus: 'pending',
    },
  })

  return {
    ok: true,
    status: 200,
    booking: serializeBookingOrder(updatedOrder),
    alreadyProcessed: false,
    message: '예약이 확정되었습니다.',
  }
}

module.exports = {
  fetchBookingOrderByConfirmationToken,
  confirmBookingByToken,
  recordReservationStatusEvent,
}
