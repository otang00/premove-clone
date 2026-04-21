'use strict'

function normalizeReservationCode(value) {
  return String(value || '').trim().toUpperCase()
}

function normalizePhoneLast4(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.slice(-4)
}

function validateGuestLookupInput(input = {}) {
  const publicReservationCode = normalizeReservationCode(input.publicReservationCode)
  const phoneLast4 = normalizePhoneLast4(input.phoneLast4)
  const errors = {}

  if (!publicReservationCode) {
    errors.publicReservationCode = '예약번호를 입력해 주세요.'
  }

  if (!/^\d{4}$/.test(phoneLast4)) {
    errors.phoneLast4 = '휴대폰번호 뒤 4자리를 확인해 주세요.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      publicReservationCode,
      phoneLast4,
    },
  }
}

function serializeBookingOrder(order = {}) {
  return {
    id: order.id || null,
    publicReservationCode: order.public_reservation_code || null,
    customerName: order.customer_name || null,
    customerPhoneLast4: order.customer_phone_last4 || null,
    pickupAt: order.pickup_at || null,
    returnAt: order.return_at || null,
    pickupMethod: order.pickup_method || null,
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

function canGuestCancelBooking(order = {}, now = new Date()) {
  const bookingStatus = String(order.booking_status || '')
  const paymentStatus = String(order.payment_status || '')
  const pickupAt = order.pickup_at ? new Date(order.pickup_at) : null

  if (!['confirmed_pending_sync', 'confirmed'].includes(bookingStatus)) {
    return {
      ok: false,
      reason: 'cancel_not_allowed_status',
      message: '현재 상태에서는 예약취소가 불가합니다.',
    }
  }

  if (paymentStatus !== 'paid') {
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

  if (pickupAt <= now) {
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

module.exports = {
  normalizeReservationCode,
  normalizePhoneLast4,
  validateGuestLookupInput,
  serializeBookingOrder,
  canGuestCancelBooking,
  resolveCancelSyncStatus,
}
