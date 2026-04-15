'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { calculateGroupPrice } = require('../calculateGroupPrice')

const policy = {
  price_policy_id: 'policy_1',
  policy_name: '테슬라 모델3',
  ims_group_id: 22015,
  base_daily_price: 240000,
  weekday_1_2d_price: 108000,
  weekday_3_4d_price: 96000,
  weekday_5_6d_price: 90000,
  weekday_7d_plus_price: 84000,
  weekend_1_2d_price: 120000,
  weekend_3_4d_price: 108000,
  weekend_5_6d_price: 102000,
  weekend_7d_plus_price: 96000,
  hour_1_price: 10800,
  hour_6_price: 0,
  hour_12_price: 0,
}

test('calculateGroupPrice returns weekday 24h daily price', () => {
  const result = calculateGroupPrice({
    policy,
    searchWindow: {
      startAt: new Date('2026-04-16T01:00:00.000Z'),
      endAt: new Date('2026-04-17T01:00:00.000Z'),
    },
  })

  assert.equal(result.durationBucket, 'days_1_2')
  assert.equal(result.billableDays, 1)
  assert.equal(result.weekdayDays, 1)
  assert.equal(result.weekendDays, 0)
  assert.equal(result.discountPrice, 108000)
  assert.equal(result.price, 240000)
})

test('calculateGroupPrice returns weekend 24h daily price', () => {
  const result = calculateGroupPrice({
    policy,
    searchWindow: {
      startAt: new Date('2026-04-18T01:00:00.000Z'),
      endAt: new Date('2026-04-19T01:00:00.000Z'),
    },
  })

  assert.equal(result.durationBucket, 'days_1_2')
  assert.equal(result.weekdayDays, 0)
  assert.equal(result.weekendDays, 1)
  assert.equal(result.discountPrice, 120000)
})

test('calculateGroupPrice returns hourly fallback for 6h', () => {
  const result = calculateGroupPrice({
    policy,
    searchWindow: {
      startAt: new Date('2026-04-13T01:00:00.000Z'),
      endAt: new Date('2026-04-13T07:00:00.000Z'),
    },
  })

  assert.equal(result.durationBucket, 'hour_6')
  assert.equal(result.discountPrice, 64800)
  assert.equal(result.price, 240000)
})
