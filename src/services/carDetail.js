import { buildSearchQuery } from '../utils/searchQuery'

import { calculateReservationPricing, formatReservationPricing } from './pricing'

function formatYearLabel(minModelYear, maxModelYear) {
  const min = Number(minModelYear)
  const max = Number(maxModelYear)

  if (!min && !max) return '-'
  if (min && max && min !== max) return `${String(min).slice(-2)}~${String(max).slice(-2)}년식`
  return `${String(max || min).slice(-2)}년식`
}

function formatFuelType(value) {
  const map = {
    lpg: 'LPG',
    gasoline: '가솔린',
    diesel: '디젤',
    hybrid: '하이브리드',
    ev: '전기',
  }

  return map[value] || value || '-'
}

function toDetailViewModel(payload) {
  return {
    search: payload.search,
    company: payload.company,
    car: {
      id: String(payload.car.carId),
      name: payload.car.name,
      displayName: payload.car.displayName,
      image: payload.car.imageUrl,
      yearLabel: formatYearLabel(payload.car.minModelYear, payload.car.maxModelYear),
      fuelType: formatFuelType(payload.car.fuelType),
      seats: `${payload.car.capacity}인승`,
      features: payload.car.options || [],
      rentAge: payload.car.rentAge,
      drivingYears: payload.car.drivingYears,
    },
    pricing: {
      originCost: payload.pricing.originCost,
      ...formatReservationPricing(
        calculateReservationPricing({
          pricing: payload.pricing,
          pickupOption: payload.search.pickupOption,
        }),
      ),
    },
    insurance: payload.insurance,
    meta: payload.meta,
  }
}

export async function fetchCarDetail(carId, searchState) {
  const query = buildSearchQuery(searchState)
  const response = await fetch(`/api/car-detail?carId=${encodeURIComponent(carId)}&${query}`)
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.message || payload.error || '상세 조회에 실패했습니다.')
  }

  return toDetailViewModel(payload)
}
