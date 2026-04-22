'use strict'

const {
  normalizeCustomerName,
  normalizeCustomerPhone,
  normalizeCustomerBirth,
} = require('./bookingIdentity')

function normalizeReservationCode(value) {
  return String(value || '').trim().toUpperCase()
}

function validateGuestLookupInput(input = {}) {
  const customerName = normalizeCustomerName(input.customerName)
  const customerPhone = normalizeCustomerPhone(input.customerPhone)
  const customerBirth = normalizeCustomerBirth(input.customerBirth)
  const errors = {}

  if (!customerName) {
    errors.customerName = '이름을 입력해 주세요.'
  }

  if (!/^\d{10,11}$/.test(customerPhone)) {
    errors.customerPhone = '휴대폰번호를 확인해 주세요.'
  }

  if (!/^\d{8}$/.test(customerBirth)) {
    errors.customerBirth = '생년월일 8자리를 입력해 주세요.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      customerName,
      customerPhone,
      customerBirth,
    },
  }
}

function validateGuestBookingCreateInput(input = {}) {
  const customerName = normalizeCustomerName(input.customerName)
  const customerPhone = normalizeCustomerPhone(input.customerPhone)
  const customerBirth = normalizeCustomerBirth(input.customerBirth)
  const deliveryAddressDetail = String(input.deliveryAddressDetail || '').trim()
  const errors = {}

  if (!input.carId || Number.isNaN(Number(input.carId))) {
    errors.carId = '차량 정보가 올바르지 않습니다.'
  }

  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(input.deliveryDateTime || ''))) {
    errors.deliveryDateTime = '대여일시를 확인해 주세요.'
  }

  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(input.returnDateTime || ''))) {
    errors.returnDateTime = '반납일시를 확인해 주세요.'
  }

  if (!['pickup', 'delivery'].includes(String(input.pickupOption || ''))) {
    errors.pickupOption = '수령 방식을 확인해 주세요.'
  }

  if (String(input.pickupOption || '') === 'delivery' && !String(input.deliveryAddress || '').trim()) {
    errors.deliveryAddress = '딜리버리 주소를 확인해 주세요.'
  }

  if (String(input.pickupOption || '') === 'delivery' && !deliveryAddressDetail) {
    errors.deliveryAddressDetail = '상세주소를 입력해 주세요.'
  }

  if (!customerName) {
    errors.customerName = '이름을 입력해 주세요.'
  }

  if (!/^\d{10,11}$/.test(customerPhone)) {
    errors.customerPhone = '휴대폰번호를 확인해 주세요.'
  }

  if (!/^\d{8}$/.test(customerBirth)) {
    errors.customerBirth = '생년월일 8자리를 입력해 주세요.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      carId: Number(input.carId),
      deliveryDateTime: String(input.deliveryDateTime || '').trim(),
      returnDateTime: String(input.returnDateTime || '').trim(),
      pickupOption: String(input.pickupOption || '').trim(),
      deliveryAddress: String(input.deliveryAddress || '').trim(),
      deliveryAddressDetail,
      quotedTotalAmount: Number(input.quotedTotalAmount || 0),
      rentalAmount: Number(input.rentalAmount || 0),
      insuranceAmount: Number(input.insuranceAmount || 0),
      deliveryAmount: Number(input.deliveryAmount || 0),
      finalAmount: Number(input.finalAmount || input.quotedTotalAmount || 0),
      paymentMethod: String(input.paymentMethod || '').trim(),
      customerName,
      customerPhone,
      customerBirth,
    },
  }
}

function serializeBookingOrder(order = {}) {
  return {
    id: order.id || null,
    publicReservationCode: order.public_reservation_code || null,
    customerName: order.customer_name || null,
    customerPhone: order.customer_phone || null,
    customerPhoneLast4: order.customer_phone_last4 || null,
    customerBirth: order.customer_birth || order.pricing_snapshot?.customerBirth || null,
    pickupAt: order.pickup_at || null,
    returnAt: order.return_at || null,
    pickupMethod: order.pickup_method || null,
    pickupLocationSnapshot: order.pickup_location_snapshot || null,
    returnLocationSnapshot: order.return_location_snapshot || null,
    pricingSnapshot: order.pricing_snapshot || null,
    quotedTotalAmount: order.quoted_total_amount ?? null,
    bookingStatus: order.booking_status || null,
    paymentStatus: order.payment_status || null,
    syncStatus: order.sync_status || null,
    manualReviewRequired: Boolean(order.manual_review_required),
    cancelledAt: order.cancelled_at || null,
    completedAt: order.completed_at || null,
    createdAt: order.created_at || null,
    updatedAt: order.updated_at || null,
  }
}

function canGuestCancelBooking(order = {}, now = new Date(), options = {}) {
  const {
    allowStartedBooking = false,
    allowedBookingStatuses = ['confirmation_pending', 'confirmed_pending_sync', 'confirmed'],
  } = options
  const bookingStatus = String(order.booking_status || '')
  const paymentStatus = String(order.payment_status || '')
  const pickupAt = order.pickup_at ? new Date(order.pickup_at) : null

  if (!allowedBookingStatuses.includes(bookingStatus)) {
    return {
      ok: false,
      reason: 'cancel_not_allowed_status',
      message: '현재 상태에서는 예약취소가 불가합니다.',
    }
  }

  if (!['pending', 'paid'].includes(paymentStatus)) {
    return {
      ok: false,
      reason: 'cancel_not_allowed_payment_status',
      message: '현재 결제 상태에서는 예약취소가 불가합니다.',
    }
  }

  if (!pickupAt || Number.isNaN(pickupAt.getTime())) {
    return {
      ok: false,
      reason: 'cancel_invalid_pickup_at',
      message: '예약 정보가 올바르지 않아 취소할 수 없습니다.',
    }
  }

  if (!allowStartedBooking && pickupAt <= now) {
    return {
      ok: false,
      reason: 'cancel_started_booking',
      message: '대여 시작 이후 예약은 온라인 취소가 불가합니다.',
    }
  }

  return { ok: true }
}

function resolveCancelSyncStatus({ order = {}, hasActiveMapping = false } = {}) {
  if (hasActiveMapping) {
    return 'cancel_sync_pending'
  }

  if (['synced', 'cancel_sync_failed'].includes(String(order.sync_status || ''))) {
    return 'cancel_sync_pending'
  }

  return 'not_required'
}

function resolveCancelledPaymentStatus(order = {}) {
  const paymentStatus = String(order.payment_status || '')

  if (paymentStatus === 'paid') {
    return 'refund_pending'
  }

  return 'cancelled'
}

module.exports = {
  normalizeReservationCode,
  validateGuestLookupInput,
  validateGuestBookingCreateInput,
  serializeBookingOrder,
  canGuestCancelBooking,
  resolveCancelSyncStatus,
  resolveCancelledPaymentStatus,
}
