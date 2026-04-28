'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  normalizeReservationCode,
  validateGuestLookupInput,
  validateGuestBookingCreateInput,
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
  assert.equal(result.errors.customerPhone, '휴대폰 번호를 확인해 주세요.')
  assert.equal(result.errors.customerBirth, '생년월일 8자리를 입력해 주세요.')
})

test('validateGuestLookupInput rejects impossible birth date', () => {
  const result = validateGuestLookupInput({ customerName: '홍길동', customerPhone: '01012345678', customerBirth: '30001001' })
  assert.equal(result.isValid, false)
  assert.equal(result.errors.customerBirth, '생년월일 형식을 확인해 주세요.')
})

test('validateGuestLookupInput rejects invalid styled name', () => {
  const result = validateGuestLookupInput({ customerName: '홍길동님', customerPhone: '01012345678', customerBirth: '19900101' })
  assert.equal(result.isValid, false)
  assert.equal(result.errors.customerName, '이름 형식을 확인해 주세요.')
})

test('validateGuestBookingCreateInput requires detail token and auth mode', () => {
  const result = validateGuestBookingCreateInput({
    carId: 1,
    deliveryDateTime: '2026-05-01 10:00',
    returnDateTime: '2026-05-02 10:00',
    pickupOption: 'pickup',
    customerName: '홍길동',
    customerPhone: '01012345678',
    customerBirth: '19900101',
    reservationAuthMode: 'weird_mode',
  })

  assert.equal(result.isValid, false)
  assert.equal(result.errors.detailToken, '예약 상세 접근 정보가 올바르지 않습니다.')
  assert.equal(result.errors.reservationAuthMode, '예약 인증 상태를 확인해 주세요.')
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
