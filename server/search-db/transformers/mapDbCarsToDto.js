'use strict'

const { calculateGroupPrice } = require('../pricing/calculateGroupPrice')

function buildPriceIndex(priceRules = []) {
  return priceRules.reduce((acc, rule) => {
    const carId = rule.car_id || rule.carId || rule.source_car_id
    if (!carId) return acc
    acc[String(carId)] = rule
    return acc
  }, {})
}

function buildGroupPolicyIndex(priceRules = []) {
  return priceRules.reduce((acc, rule) => {
    const groupId = rule.ims_group_id || rule.source_group_id
    if (groupId == null) return acc
    acc[String(groupId)] = rule
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

function mapDbCarsToDto({ cars = [], priceRules = [], deliveryRegion = null, search = {}, searchWindow } = {}) {
  const priceIndex = buildPriceIndex(priceRules)
  const groupPolicyIndex = buildGroupPolicyIndex(priceRules)
  const seenPartnerIds = new Set()
  const dtoCars = []
  const isDelivery = search.pickupOption === 'delivery'
  const deliveryPrice = isDelivery
    ? Number(deliveryRegion?.round_trip_price || deliveryRegion?.roundTripPrice || 0)
    : 0

  for (const car of cars) {
    if (!car) continue
    const carId = car.id || car.car_id || car.source_car_id
    if (!carId) continue

    const groupPriceRule = groupPolicyIndex[String(car.source_group_id)]
    const priceRule = groupPriceRule || priceIndex[String(carId)]
    if (!priceRule) {
      continue
    }

    const partnerCarId = car.source_group_id || car.source_car_id || car.id
    if (seenPartnerIds.has(partnerCarId)) {
      continue
    }

    seenPartnerIds.add(partnerCarId)

    const computedPrice = groupPriceRule && searchWindow
      ? calculateGroupPrice({
          policy: groupPriceRule,
          searchWindow,
          deliveryPrice,
        })
      : null

    const basePrice = Number(computedPrice?.price || priceRule.base_price || 0)
    const discountPrice = Number(computedPrice?.discountPrice || priceRule.discount_price || priceRule.base_price || 0)
    const finalDeliveryPrice = Number(computedPrice?.deliveryPrice || deliveryPrice || 0)

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
      deliveryPrice: finalDeliveryPrice,
    })
  }

  return dtoCars
}

module.exports = {
  mapDbCarsToDto,
}
