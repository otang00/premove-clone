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
    async fetchDeliveryRegions() {
      return []
    },
  }

  const result = await dbSearchService.run({ search, repositories })

  assert.equal(result.totalCount, 1)
  assert.equal(result.cars[0].carId, 'car_b')
  assert.equal(result.cars[0].price, 90000)
})

test('dbSearchService applies group policy pricing when available', async () => {
  const search = {
    deliveryDateTime: '2026-04-16 10:00',
    returnDateTime: '2026-04-17 10:00',
    pickupOption: 'pickup',
    driverAge: 26,
    order: 'lower',
  }

  const repositories = {
    async fetchCandidateCars() {
      return [
        { id: 'car_a', source_group_id: 23069, name: '차A', seats: 5, model_year: 2024, rent_age: 26 },
      ]
    },
    async fetchBlockingReservations() {
      return []
    },
    async fetchPriceRules() {
      return [
        {
          ims_group_id: 23069,
          price_policy_id: 'policy_1',
          policy_name: '아반떼',
          base_daily_price: 160000,
          weekday_1_2d_price: 56000,
          weekday_3_4d_price: 52000,
          weekday_5_6d_price: 50000,
          weekday_7d_plus_price: 48000,
          weekend_1_2d_price: 80000,
          weekend_3_4d_price: 76000,
          weekend_5_6d_price: 72000,
          weekend_7d_plus_price: 70000,
          hour_1_price: 5300,
          hour_6_price: 0,
          hour_12_price: 0,
        },
      ]
    },
    async fetchDeliveryRegions() {
      return []
    },
  }

  const result = await dbSearchService.run({ search, repositories })
  assert.equal(result.totalCount, 1)
  assert.equal(result.cars[0].price, 160000)
  assert.equal(result.cars[0].discountPrice, 56000)
})

test('dbSearchService applies higher and newer ordering', async () => {
  const baseSearch = {
    deliveryDateTime: '2026-04-15 10:00',
    returnDateTime: '2026-04-16 10:00',
    pickupOption: 'pickup',
    driverAge: 26,
  }

  const repositories = {
    async fetchCandidateCars() {
      return [
        { id: 'car_a', source_group_id: 101, name: '차A', seats: 5, model_year: 2022, rent_age: 26 },
        { id: 'car_b', source_group_id: 102, name: '차B', seats: 5, model_year: 2025, rent_age: 26 },
        { id: 'car_c', source_group_id: 103, name: '차C', seats: 5, model_year: 2024, rent_age: 26 },
      ]
    },
    async fetchBlockingReservations() {
      return []
    },
    async fetchPriceRules() {
      return [
        { car_id: 'car_a', base_price: 100000, discount_price: 90000 },
        { car_id: 'car_b', base_price: 130000, discount_price: 120000 },
        { car_id: 'car_c', base_price: 110000, discount_price: 80000 },
      ]
    },
    async fetchDeliveryRegions() {
      return []
    },
  }

  const higherResult = await dbSearchService.run({ search: { ...baseSearch, order: 'higher' }, repositories })
  assert.deepEqual(higherResult.cars.map((car) => car.carId), [102, 101, 103])

  const newerResult = await dbSearchService.run({ search: { ...baseSearch, order: 'newer' }, repositories })
  assert.deepEqual(newerResult.cars.map((car) => car.carId), [102, 103, 101])
})

test('dbSearchService applies delivery region price for valid dong', async () => {
  const search = {
    deliveryDateTime: '2026-04-15 10:00',
    returnDateTime: '2026-04-16 10:00',
    pickupOption: 'delivery',
    driverAge: 26,
    dongId: 1123010600,
    order: 'lower',
  }

  const repositories = {
    async fetchCandidateCars() {
      return [
        { id: 'car_a', source_group_id: 101, name: '차A', seats: 5, model_year: 2024, rent_age: 26 },
      ]
    },
    async fetchBlockingReservations() {
      return []
    },
    async fetchPriceRules() {
      return [
        { car_id: 'car_a', base_price: 100000, discount_price: 90000 },
      ]
    },
    async fetchDeliveryRegions({ dongId } = {}) {
      const rows = [
        {
          province_id: 11,
          province_name: '서울',
          city_id: 11230,
          city_name: '동대문구',
          dong_id: 1123010600,
          dong_name: '용두동',
          round_trip_price: 30000,
          full_label: '서울 동대문구 용두동',
        },
      ]
      return dongId != null ? rows.filter((row) => row.dong_id === Number(dongId)) : rows
    },
  }

  const result = await dbSearchService.run({ search, repositories })

  assert.equal(result.totalCount, 1)
  assert.equal(result.cars[0].deliveryPrice, 30000)
  assert.equal(result.company.deliveryCostList.length, 1)
})

test('dbSearchService returns zero cars when delivery dong is not allowed', async () => {
  const search = {
    deliveryDateTime: '2026-04-15 10:00',
    returnDateTime: '2026-04-16 10:00',
    pickupOption: 'delivery',
    driverAge: 26,
    dongId: 9999999999,
    order: 'lower',
  }

  const repositories = {
    async fetchCandidateCars() {
      return [
        { id: 'car_a', source_group_id: 101, name: '차A', seats: 5, model_year: 2024, rent_age: 26 },
      ]
    },
    async fetchBlockingReservations() {
      return []
    },
    async fetchPriceRules() {
      return [
        { car_id: 'car_a', base_price: 100000, discount_price: 90000 },
      ]
    },
    async fetchDeliveryRegions({ dongId } = {}) {
      const rows = [
        {
          province_id: 11,
          province_name: '서울',
          city_id: 11230,
          city_name: '동대문구',
          dong_id: 1123010600,
          dong_name: '용두동',
          round_trip_price: 30000,
          full_label: '서울 동대문구 용두동',
        },
      ]
      return dongId != null ? rows.filter((row) => row.dong_id === Number(dongId)) : rows
    },
  }

  const result = await dbSearchService.run({ search, repositories })

  assert.equal(result.totalCount, 0)
  assert.deepEqual(result.cars, [])
})
