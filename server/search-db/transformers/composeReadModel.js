'use strict'

function indexPriceRules(priceRules = []) {
  return priceRules.reduce((acc, rule) => {
    acc[rule.car_id] = rule
    return acc
  }, {})
}

function composeReadModel({ cars = [], reservations = [], priceRules = [] } = {}) {
  const priceMap = indexPriceRules(priceRules)

  const nextCars = cars.map((car) => {
    const priceRule = priceMap[car.id] || priceMap[car.source_car_id]
    return {
      ...car,
      priceRule,
    }
  })

  return {
    cars: nextCars,
    reservations,
  }
}

module.exports = {
  composeReadModel,
}
