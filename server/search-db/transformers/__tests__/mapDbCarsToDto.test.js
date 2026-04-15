'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { mapDbCarsToDto } = require('../mapDbCarsToDto')

test('mapDbCarsToDto maps basic fields', () => {
  const cars = [
    { id: 'car_a', name: '아반떼', seats: 5, model_year: 2024, rent_age: 26 },
  ]

  const priceRules = [
    { car_id: 'car_a', base_price: 89000, discount_price: 79000, delivery_price: 10000 },
  ]

  const dto = mapDbCarsToDto({ cars, priceRules })
  assert.equal(dto[0].price, 89000)
  assert.equal(dto[0].discountPrice, 79000)
  assert.equal(dto[0].deliveryPrice, 10000)
})
