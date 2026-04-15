'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { dbSearchService } = require('../dbSearchService')

test('dbSearchService filters unavailable cars and maps price', async () => {
  const search = {
    deliveryDateTime: '2026-04-15 10:00',
    returnDateTime: '2026-04-16 10:00',
    pickupOption: 'pickup',
    driverAge: 26,
    order: 'lower',
  }

  const repositories = {
    async fetchCandidateCars() {
      return [
        { id: 'car_a', name: '차A', seats: 5, model_year: 2024, rent_age: 26 },
        { id: 'car_b', name: '차B', seats: 5, model_year: 2024, rent_age: 26 },
      ]
    },
    async fetchBlockingReservations() {
      return [
        { car_id: 'car_a', start_at: '2026-04-15T00:00:00Z', end_at: '2026-04-17T00:00:00Z' },
      ]
    },
    async fetchPriceRules() {
      return [
        { car_id: 'car_b', base_price: 90000, discount_price: 80000, delivery_price: 10000 },
      ]
    },
  }

  const result = await dbSearchService.run({ search, repositories })

  assert.equal(result.totalCount, 1)
  assert.equal(result.cars[0].carId, 'car_b')
  assert.equal(result.cars[0].price, 90000)
})
