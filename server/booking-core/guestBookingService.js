'use strict'

const {
  serializeBookingOrder,
  canGuestCancelBooking,
  resolveCancelSyncStatus,
} = require('./guestBookingUtils')

async function fetchBookingOrderByGuestLookup({
  supabaseClient,
  publicReservationCode,
  phoneLast4,
} = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const { data, error } = await supabaseClient
    .from('booking_orders')
    .select('*')
    .eq('public_reservation_code', publicReservationCode)
    .eq('customer_phone_last4', phoneLast4)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function fetchActiveReservationMapping({ supabaseClient, bookingOrderId } = {}) {
  if (!supabaseClient || !bookingOrderId) {
    return null
  }

  const { data, error } = await supabaseClient
    .from('reservation_mappings')
    .select('*')
    .eq('booking_order_id', bookingOrderId)
    .neq('mapping_status', 'closed')
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function lookupGuestBooking({
  supabaseClient,
  publicReservationCode,
  phoneLast4,
} = {}) {
  const order = await fetchBookingOrderByGuestLookup({
    supabaseClient,
    publicReservationCode,
    phoneLast4,
  })

  if (!order) {
    return null
  }

  const activeMapping = await fetchActiveReservationMapping({
    supabaseClient,
    bookingOrderId: order.id,
  })

  return {
    booking: serializeBookingOrder(order),
    mapping: activeMapping
      ? {
        externalSystem: activeMapping.external_system || null,
        externalReservationId: activeMapping.external_reservation_id || null,
        imsReservationId: activeMapping.ims_reservation_id || null,
        mappingStatus: activeMapping.mapping_status || null,
        updatedAt: activeMapping.updated_at || null,
      }
      : null,
  }
}

async function cancelGuestBooking({
  supabaseClient,
  publicReservationCode,
  phoneLast4,
  requestedBy = 'guest',
  reason = '',
  now = new Date(),
} = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const order = await fetchBookingOrderByGuestLookup({
    supabaseClient,
    publicReservationCode,
    phoneLast4,
  })

  if (!order) {
    return {
      ok: false,
      code: 'booking_not_found',
      status: 404,
      message: '일치하는 예약을 찾을 수 없습니다.',
    }
  }

  const cancelCheck = canGuestCancelBooking(order, now)
  if (!cancelCheck.ok) {
    return {
      ok: false,
      code: cancelCheck.reason,
      status: 409,
      message: cancelCheck.message,
      booking: serializeBookingOrder(order),
    }
  }

  const activeMapping = await fetchActiveReservationMapping({
    supabaseClient,
    bookingOrderId: order.id,
  })
  const nextSyncStatus = resolveCancelSyncStatus({
    order,
    hasActiveMapping: Boolean(activeMapping),
  })
  const cancelledAt = now.toISOString()

  const updatePayload = {
    booking_status: 'cancelled',
    payment_status: 'refund_pending',
    sync_status: nextSyncStatus,
    cancelled_at: cancelledAt,
  }

  const { data: updatedOrder, error: updateError } = await supabaseClient
    .from('booking_orders')
    .update(updatePayload)
    .eq('id', order.id)
    .select('*')
    .single()

  if (updateError) {
    throw updateError
  }

  if (activeMapping && nextSyncStatus === 'cancel_sync_pending') {
    const { error: mappingError } = await supabaseClient
      .from('reservation_mappings')
      .update({
        mapping_status: 'cancel_pending',
        last_sync_attempt_at: cancelledAt,
      })
      .eq('id', activeMapping.id)

    if (mappingError) {
      throw mappingError
    }
  }

  const eventPayload = {
    requestedBy,
    reason: String(reason || '').trim() || null,
    previousBookingStatus: order.booking_status || null,
    previousPaymentStatus: order.payment_status || null,
    previousSyncStatus: order.sync_status || null,
    nextSyncStatus,
    hasActiveMapping: Boolean(activeMapping),
  }

  const { error: eventError } = await supabaseClient
    .from('reservation_status_events')
    .insert({
      booking_order_id: order.id,
      event_type: 'guest_cancelled',
      event_payload: eventPayload,
    })

  if (eventError) {
    throw eventError
  }

  return {
    ok: true,
    status: 200,
    booking: serializeBookingOrder(updatedOrder),
    mapping: activeMapping
      ? {
        externalSystem: activeMapping.external_system || null,
        externalReservationId: activeMapping.external_reservation_id || null,
        imsReservationId: activeMapping.ims_reservation_id || null,
        mappingStatus: 'cancel_pending',
      }
      : null,
  }
}

module.exports = {
  fetchBookingOrderByGuestLookup,
  fetchActiveReservationMapping,
  lookupGuestBooking,
  cancelGuestBooking,
}
