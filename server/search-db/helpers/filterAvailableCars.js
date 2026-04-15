'use strict'

const { isRangeOverlapping } = require('./overlap')

function buildReservationIndex(reservations = []) {
  return reservations.reduce((acc, reservation) => {
    const carId = reservation.car_id || reservation.carId || reservation.source_car_id
    if (!carId) return acc
    if (!acc[carId]) {
      acc[carId] = []
    }
    acc[carId].push(reservation)
    return acc
  }, {})
}

function reservationToRange(reservation) {
  return {
    startAt: reservation.start_at || reservation.startAt,
    endAt: reservation.end_at || reservation.endAt,
  }
}

function isCarAvailable({ car, reservations, searchWindow, overlapOptions }) {
  if (!reservations || reservations.length === 0) {
    return true
  }

  return reservations.every((reservation) =>
    !isRangeOverlapping(reservationToRange(reservation), searchWindow, overlapOptions),
  )
}

function filterAvailableCars({ cars = [], reservations = [], searchWindow, overlapOptions } = {}) {
  if (!searchWindow) {
    throw new Error('search window is required to filter cars')
  }

  const reservationIndex = buildReservationIndex(reservations)

  return cars.filter((car) => {
    const carId = car.id || car.source_car_id
    const carReservations = reservationIndex[carId] || []
    return isCarAvailable({
      car,
      reservations: carReservations,
      searchWindow,
      overlapOptions,
    })
  })
}

module.exports = {
  buildReservationIndex,
  filterAvailableCars,
}
