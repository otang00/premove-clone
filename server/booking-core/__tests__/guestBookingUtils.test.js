'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  normalizeReservationCode,
  normalizePhoneLast4,
  validateGuestLookupInput,
  canGuestCancelBooking,
  resolveCancelSyncStatus,
} = require('../guestBookingUtils')

test('normalizeReservationCode trims and uppercases', () => {
  assert.equal(normalizeReservationCode(' ab-1234 '), 'AB-1234')
})

test('normalizePhoneLast4 keeps final four digits only', () => {
  assert.equal(normalizePhoneLast4('010-1234-5678'), '5678')
})

test('validateGuestLookupInput validates both fields', () => {
  const result = validateGuestLookupInput({ publicReservationCode: 'r-1', phoneLast4: '12' })
  assert.equal(result.isValid, false)
  assert.equal(result.errors.publicReservationCode, undefined)
  assert.equal(result.errors.phoneLast4, '휴대폰번호 뒤 4자리를 확인해 주세요.')
})

test('canGuestCancelBooking allows future paid confirmed booking', () => {
  const result = canGuestCancelBooking({
    booking_status: 'confirmed',
    payment_status: 'paid',
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
