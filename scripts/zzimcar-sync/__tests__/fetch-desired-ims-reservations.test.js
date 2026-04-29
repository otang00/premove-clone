const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isDesiredImsReservation,
  normalizeDesiredReservation,
} = require('../lib/fetch-desired-ims-reservations');

test('isDesiredImsReservation accepts active future reservation', () => {
  const now = new Date('2026-04-29T03:00:00.000Z');
  assert.equal(isDesiredImsReservation({
    ims_reservation_id: 'A1',
    car_number: '101하9257',
    status: 'confirmed',
    end_at: '2026-04-29T05:00:00.000Z',
  }, now), true);
});

test('isDesiredImsReservation rejects cancelled reservation', () => {
  const now = new Date('2026-04-29T03:00:00.000Z');
  assert.equal(isDesiredImsReservation({
    ims_reservation_id: 'A1',
    car_number: '101하9257',
    status: 'cancelled',
    end_at: '2026-04-29T05:00:00.000Z',
  }, now), false);
});

test('normalizeDesiredReservation normalizes shape', () => {
  const result = normalizeDesiredReservation({
    ims_reservation_id: 77,
    car_number: '101하 9257',
    start_at: '2026-05-01T01:00:00.000Z',
    end_at: '2026-05-02T01:00:00.000Z',
    status: 'paid',
  });

  assert.deepEqual(result, {
    imsReservationId: '77',
    carNumber: '101하9257',
    startAt: '2026-05-01T01:00:00.000Z',
    endAt: '2026-05-02T01:00:00.000Z',
    status: 'paid',
    raw: {
      ims_reservation_id: 77,
      car_number: '101하 9257',
      start_at: '2026-05-01T01:00:00.000Z',
      end_at: '2026-05-02T01:00:00.000Z',
      status: 'paid',
    },
  });
});
