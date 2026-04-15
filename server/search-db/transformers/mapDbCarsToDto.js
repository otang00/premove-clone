'use strict'

function buildPriceIndex(priceRules = []) {
  return priceRules.reduce((acc, rule) => {
    const carId = rule.car_id || rule.carId || rule.source_car_id
    if (!carId) return acc
    acc[carId] = rule
    return acc
  }, {})
}

function mapOptions(car) {
  if (!car) return []
  if (Array.isArray(car.options)) return car.options
  if (car.options_json && Array.isArray(car.options_json.names)) {
    return car.options_json.names
  }
  return []
}

function mapDbCarsToDto({ cars = [], priceRules = [] } = {}) {
  const priceIndex = buildPriceIndex(priceRules)
  const seenPartnerIds = new Set()
  const dtoCars = []

  for (const car of cars) {
    if (!car) continue
    const carId = car.id || car.car_id || car.source_car_id
    if (!carId) continue

    const priceRule = priceIndex[carId]
    if (!priceRule) {
      continue
    }

    const partnerCarId = car.source_group_id || car.source_car_id || car.id
    if (seenPartnerIds.has(partnerCarId)) {
      continue
    }

    seenPartnerIds.add(partnerCarId)

    const basePrice = Number(priceRule.base_price || 0)
    const discountPrice = Number(priceRule.discount_price || priceRule.base_price || 0)

    dtoCars.push({
      carId: partnerCarId,
      name: car.display_name || car.name || '',
      capacity: Number(car.seats || 0),
      imageUrl: car.image_url || '',
      oilType: car.fuel_type || '',
      minModelYear: car.model_year || 0,
      maxModelYear: car.model_year || 0,
      insuranceAge: car.rent_age || 0,
      options: mapOptions(car),
      price: basePrice,
      discountPrice,
      deliveryPrice: Number(priceRule.delivery_price || 0),
    })
  }

  return dtoCars
}

module.exports = {
  mapDbCarsToDto,
}
