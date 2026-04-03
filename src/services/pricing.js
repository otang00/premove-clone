function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`
}

export function calculateReservationPricing({ pricing, pickupOption }) {
  const rentalCost = Number(pricing?.rentalCost || 0)
  const insurancePrice = Number(pricing?.insurancePrice || 0)
  const deliveryOneWay = Number(pricing?.delivery?.oneWay || 0)
  const deliveryRoundTrip = Number(pricing?.delivery?.roundTrip || 0)
  const deliveryPrice = pickupOption === 'delivery' ? deliveryRoundTrip : 0
  const finalPrice = rentalCost + insurancePrice + deliveryPrice

  return {
    rentalCost,
    insurancePrice,
    deliveryOneWay,
    deliveryRoundTrip,
    deliveryPrice,
    finalPrice,
  }
}

export function formatReservationPricing(calculatedPricing) {
  return {
    rentalCost: formatMoney(calculatedPricing.rentalCost),
    insurancePrice: formatMoney(calculatedPricing.insurancePrice),
    deliveryOneWay: formatMoney(calculatedPricing.deliveryOneWay),
    deliveryRoundTrip: formatMoney(calculatedPricing.deliveryRoundTrip),
    deliveryPrice: formatMoney(calculatedPricing.deliveryPrice),
    finalPrice: formatMoney(calculatedPricing.finalPrice),
    raw: calculatedPricing,
  }
}
