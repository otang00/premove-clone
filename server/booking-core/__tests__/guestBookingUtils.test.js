'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  normalizeReservationCode,
  validateGuestLookupInput,
  canGuestCancelBooking,
  resolveCancelSyncStatus,
  resolveCancelledPaymentStatus,
} = require('../guestBookingUtils')

test('normalizeReservationCode trims and uppercases', () => {
  assert.equal(normalizeReservationCode(' ab-1234 '), 'AB-1234')
})

test('validateGuestLookupInput validates all fields', () => {
  const result = validateGuestLookupInput({ customerName: '홍길동', customerPhone: '010-1234', customerBirth: '1990' })
  assert.equal(result.isValid, false)
  assert.equal(result.errors.customerName, undefined)
  assert.equal(result.errors.customerPhone, '휴대폰번호를 확인해 주세요.')
  assert.equal(result.errors.customerBirth, '생년월일 8자리를 입력해 주세요.')
})

test('canGuestCancelBooking allows future paid confirmed booking', () => {
  const result = canGuestCancelBooking({
    booking_status: 'confirmed',
    payment_status: 'paid',
    pickup_at: '2099-04-21T10:00:00.000Z',
  }, new Date('2099-04-20T10:00:00.000Z'))

  assert.deepEqual(result, { ok: true })
})

test('canGuestCancelBooking allows future pending confirmation booking', () => {
  const result = canGuestCancelBooking({
    booking_status: 'confirmation_pending',
    payment_status: 'pending',
    pickup_at: '2099-04-21T10:00:00.000Z',
  }, new Date('2099-04-20T10:00:00.000Z'))

  assert.deepEqual(result, { ok: true })
})

test('canGuestCancelBooking rejects started booking', () => {
  const result = canGuestCancelBooking({
    booking_status: 'confirmed',
    payment_status: 'paid',
    pickup_at: '2099-04-21T10:00:00.000Z',
  }, new Date('2099-04-21T10:00:00.000Z'))

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'cancel_started_booking')
})

test('resolveCancelSyncStatus requests external cancel when mapping exists', () => {
  assert.equal(resolveCancelSyncStatus({ hasActiveMapping: true }), 'cancel_sync_pending')
  assert.equal(resolveCancelSyncStatus({ order: { sync_status: 'synced' }, hasActiveMapping: false }), 'cancel_sync_pending')
  assert.equal(resolveCancelSyncStatus({ order: { sync_status: 'pending' }, hasActiveMapping: false }), 'not_required')
})

test('resolveCancelledPaymentStatus uses refund only when already paid', () => {
  assert.equal(resolveCancelledPaymentStatus({ payment_status: 'paid' }), 'refund_pending')
  assert.equal(resolveCancelledPaymentStatus({ payment_status: 'pending' }), 'cancelled')
})
