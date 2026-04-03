import { cars as mockCars } from '../data/mock'

function sortCars(cars, order) {
  const nextCars = [...cars]

  if (order === 'higher') {
    return nextCars.sort((a, b) => parsePrice(b.dayPrice) - parsePrice(a.dayPrice))
  }

  if (order === 'newer') {
    return nextCars.sort((a, b) => parseYearLabel(b.yearLabel) - parseYearLabel(a.yearLabel))
  }

  return nextCars.sort((a, b) => parsePrice(a.dayPrice) - parsePrice(b.dayPrice))
}

function parsePrice(priceText) {
  return Number(String(priceText || '').replace(/[^\d]/g, '')) || 0
}

function parseYearLabel(yearLabel) {
  const matches = String(yearLabel || '').match(/\d+/g)
  if (!matches?.length) return 0
  return Math.max(...matches.map((value) => Number(value)))
}

function applyAgeFilter(cars, driverAge) {
  if (Number(driverAge) === 26) {
    return cars.filter((car) => car.ageLabel.includes('26'))
  }

  return cars
}

export function getMockCars(searchState) {
  const filteredCars = applyAgeFilter(mockCars, searchState.driverAge)
  const sortedCars = sortCars(filteredCars, searchState.order)

  return {
    cars: sortedCars,
    totalCount: sortedCars.length,
  }
}

export function getMockCarById(carId) {
  return mockCars.find((car) => car.id === String(carId)) || null
}
