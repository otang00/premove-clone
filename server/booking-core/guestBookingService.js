'use strict'

const {
  serializeBookingOrder,
  canGuestCancelBooking,
  resolveCancelSyncStatus,
} = require('./guestBookingUtils')
const {
  normalizeCustomerPhone,
  normalizeCustomerBirth,
  hashLookupValue,
  createPublicReservationCode,
  createPaymentReferenceId,
} = require('./bookingIdentity')
const { ensureBookingAvailability } = require('./bookingAvailabilityService')
const { buildSearchWindow } = require('../search-db/helpers/buildSearchWindow')

async function fetchCarBySourceCarId({ supabaseClient, sourceCarId } = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const { data, error } = await supabaseClient
    .from('cars')
    .select('*')
    .eq('source_car_id', sourceCarId)
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function generateUniqueReservationCode({ supabaseClient, now = new Date() } = {}) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = createPublicReservationCode(now)
    const { data, error } = await supabaseClient
      .from('booking_orders')
      .select('id')
      .eq('public_reservation_code', code)
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return code
    }
  }

  throw new Error('reservation_code_generation_failed')
}

async function findBookingOrderByGuestLookup({
  supabaseClient,
  customerName,
  customerPhone,
  customerBirth,
} = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const normalizedPhone = normalizeCustomerPhone(customerPhone)
  const normalizedBirth = normalizeCustomerBirth(customerBirth)
  const phoneHash = hashLookupValue(`phone:${normalizedPhone}`)
  const birthHash = hashLookupValue(`birth:${normalizedBirth}`)

  const { data: orders, error: orderError } = await supabaseClient
    .from('booking_orders')
    .select('*')
    .eq('customer_name', String(customerName || '').trim())
    .eq('customer_phone_last4', normalizedPhone.slice(-4))
    .order('created_at', { ascending: false })

  if (orderError) {
    throw orderError
  }

  const matchedOrders = Array.isArray(orders) ? orders : []
  if (matchedOrders.length === 0) {
    return { order: null, blockedReason: null }
  }

  const bookingOrderIds = matchedOrders.map((order) => order.id).filter(Boolean)
  const { data: lookupKeys, error: lookupError } = await supabaseClient
    .from('booking_lookup_keys')
    .select('booking_order_id, lookup_type, lookup_value_hash')
    .in('booking_order_id', bookingOrderIds)
    .in('lookup_type', ['customer_phone', 'customer_birth'])

  if (lookupError) {
    throw lookupError
  }

  const keyIndex = (Array.isArray(lookupKeys) ? lookupKeys : []).reduce((acc, item) => {
    if (!acc[item.booking_order_id]) {
      acc[item.booking_order_id] = {}
    }
    acc[item.booking_order_id][item.lookup_type] = item.lookup_value_hash
    return acc
  }, {})

  const matchedOrder = matchedOrders.find((order) => {
    const keys = keyIndex[order.id] || {}
    return keys.customer_phone === phoneHash && keys.customer_birth === birthHash
  }) || null

  if (!matchedOrder) {
    return { order: null, blockedReason: null }
  }

  if (matchedOrder.user_id) {
    return { order: null, blockedReason: 'member_booking_only' }
  }

  return { order: matchedOrder, blockedReason: null }
}

async function fetchBookingOrderByGuestLookup(params = {}) {
  const result = await findBookingOrderByGuestLookup(params)
  return result.order || null
}

async function createGuestBooking({
  supabaseClient,
  bookingInput,
  requestedBy = 'guest',
  authUserId = null,
  now = new Date(),
} = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const car = await fetchCarBySourceCarId({ supabaseClient, sourceCarId: bookingInput.carId })
  if (!car) {
    return {
      ok: false,
      code: 'car_not_found',
      status: 404,
      message: '예약 차량 정보를 찾을 수 없습니다.',
    }
  }

  const searchWindow = buildSearchWindow({
    deliveryDateTime: bookingInput.deliveryDateTime,
    returnDateTime: bookingInput.returnDateTime,
  })
  const pickupAtIso = searchWindow.startIso
  const returnAtIso = searchWindow.endIso

  const availability = await ensureBookingAvailability({
    supabaseClient,
    dbCarId: car.id,
    sourceCarId: Number(car.source_car_id),
    pickupAt: pickupAtIso,
    returnAt: returnAtIso,
  })

  if (!availability.ok) {
    return availability
  }

  const reservationCode = await generateUniqueReservationCode({ supabaseClient, now })
  const paymentReferenceId = createPaymentReferenceId(now)
  const customerPhone = normalizeCustomerPhone(bookingInput.customerPhone)
  const customerBirth = normalizeCustomerBirth(bookingInput.customerBirth)
  const phoneLast4 = customerPhone.slice(-4)

  const insertPayload = {
    public_reservation_code: reservationCode,
    booking_channel: 'website',
    customer_name: bookingInput.customerName,
    customer_phone: customerPhone,
    customer_phone_last4: phoneLast4,
    user_id: authUserId,
    car_id: car.id,
    pickup_at: pickupAtIso,
    return_at: returnAtIso,
    pickup_method: bookingInput.pickupOption,
    pickup_location_snapshot: {
      pickupOption: bookingInput.pickupOption,
      deliveryAddress: bookingInput.deliveryAddress || '',
      deliveryAddressDetail: bookingInput.deliveryAddressDetail || '',
    },
    return_location_snapshot: {
      pickupOption: bookingInput.pickupOption,
      deliveryAddress: bookingInput.deliveryAddress || '',
      deliveryAddressDetail: bookingInput.deliveryAddressDetail || '',
    },
    quoted_total_amount: bookingInput.quotedTotalAmount,
    pricing_snapshot: {
      carName: car.display_name || car.name || '',
      quotedTotalAmount: bookingInput.quotedTotalAmount,
      paymentMethod: bookingInput.paymentMethod || null,
      customerBirth,
    },
    payment_provider: 'surrogate_web',
    payment_reference_id: paymentReferenceId,
    booking_status: 'confirmed_pending_sync',
    payment_status: 'paid',
    sync_status: 'pending',
    manual_review_required: false,
  }

  const { data: createdOrder, error: createError } = await supabaseClient
    .from('booking_orders')
    .insert(insertPayload)
    .select('*')
    .single()

  if (createError) {
    throw createError
  }

  const { error: lookupInsertError } = await supabaseClient
    .from('booking_lookup_keys')
    .insert([
      {
        booking_order_id: createdOrder.id,
        lookup_type: 'customer_phone',
        lookup_value_hash: hashLookupValue(`phone:${customerPhone}`),
        lookup_value_last4: phoneLast4,
        verified_at: now.toISOString(),
      },
      {
        booking_order_id: createdOrder.id,
        lookup_type: 'customer_birth',
        lookup_value_hash: hashLookupValue(`birth:${customerBirth}`),
        lookup_value_last4: customerBirth.slice(-4),
        verified_at: now.toISOString(),
      },
    ])

  if (lookupInsertError) {
    throw lookupInsertError
  }

  const { error: eventError } = await supabaseClient
    .from('reservation_status_events')
    .insert({
      booking_order_id: createdOrder.id,
      event_type: 'booking_created',
      event_payload: {
        requestedBy,
        authUserId,
        bookingChannel: 'website',
        paymentProvider: 'surrogate_web',
        paymentReferenceId,
        bookingStatus: 'confirmed_pending_sync',
        paymentStatus: 'paid',
        syncStatus: 'pending',
      },
    })

  if (eventError) {
    throw eventError
  }

  return {
    ok: true,
    status: 201,
    booking: serializeBookingOrder(createdOrder),
  }
}

async function fetchBookingOrderByMemberReservationCode({
  supabaseClient,
  authUserId,
  reservationCode,
} = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  if (!authUserId || !reservationCode) {
    return null
  }

  const { data, error } = await supabaseClient
    .from('booking_orders')
    .select('*')
    .eq('user_id', authUserId)
    .eq('public_reservation_code', String(reservationCode || '').trim().toUpperCase())
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
  customerName,
  customerPhone,
  customerBirth,
} = {}) {
  const lookupResult = await findBookingOrderByGuestLookup({
    supabaseClient,
    customerName,
    customerPhone,
    customerBirth,
  })

  if (lookupResult.blockedReason === 'member_booking_only') {
    return {
      blockedReason: 'member_booking_only',
      message: '이 예약은 회원 예약입니다. 로그인 후 예약내역에서 확인해 주세요.',
    }
  }

  const order = lookupResult.order
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

async function cancelBookingOrder({
  supabaseClient,
  order,
  requestedBy = 'guest',
  eventType = 'guest_cancelled',
  reason = '',
  now = new Date(),
} = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  if (!order?.id) {
    return {
      ok: false,
      code: 'booking_not_found',
      status: 404,
      message: '예약 정보를 찾을 수 없습니다.',
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

  const { data: updatedOrder, error: updateError } = await supabaseClient
    .from('booking_orders')
    .update({
      booking_status: 'cancelled',
      payment_status: 'refund_pending',
      sync_status: nextSyncStatus,
      cancelled_at: cancelledAt,
    })
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

  const { error: eventError } = await supabaseClient
    .from('reservation_status_events')
    .insert({
      booking_order_id: order.id,
      event_type: eventType,
      event_payload: {
        requestedBy,
        reason: String(reason || '').trim() || null,
        previousBookingStatus: order.booking_status || null,
        previousPaymentStatus: order.payment_status || null,
        previousSyncStatus: order.sync_status || null,
        nextSyncStatus,
        hasActiveMapping: Boolean(activeMapping),
      },
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

async function cancelGuestBooking({
  supabaseClient,
  customerName,
  customerPhone,
  customerBirth,
  requestedBy = 'guest',
  reason = '',
  now = new Date(),
} = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const lookupResult = await findBookingOrderByGuestLookup({
    supabaseClient,
    customerName,
    customerPhone,
    customerBirth,
  })

  if (lookupResult.blockedReason === 'member_booking_only') {
    return {
      ok: false,
      code: 'member_booking_only',
      status: 403,
      message: '이 예약은 회원 예약입니다. 로그인 후 예약내역에서 취소해 주세요.',
    }
  }

  const order = lookupResult.order
  if (!order) {
    return {
      ok: false,
      code: 'booking_not_found',
      status: 404,
      message: '일치하는 예약을 찾을 수 없습니다.',
    }
  }

  return cancelBookingOrder({
    supabaseClient,
    order,
    requestedBy,
    eventType: 'guest_cancelled',
    reason,
    now,
  })
}

async function cancelMemberBooking({
  supabaseClient,
  authUserId,
  reservationCode,
  requestedBy = 'member',
  reason = '',
  now = new Date(),
} = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const order = await fetchBookingOrderByMemberReservationCode({
    supabaseClient,
    authUserId,
    reservationCode,
  })

  if (!order) {
    return {
      ok: false,
      code: 'booking_not_found',
      status: 404,
      message: '예약 정보를 찾지 못했습니다.',
    }
  }

  return cancelBookingOrder({
    supabaseClient,
    order,
    requestedBy,
    eventType: 'member_cancelled',
    reason,
    now,
  })
}

module.exports = {
  fetchCarBySourceCarId,
  findBookingOrderByGuestLookup,
  fetchBookingOrderByGuestLookup,
  fetchBookingOrderByMemberReservationCode,
  fetchActiveReservationMapping,
  createGuestBooking,
  lookupGuestBooking,
  cancelBookingOrder,
  cancelGuestBooking,
  cancelMemberBooking,
}
