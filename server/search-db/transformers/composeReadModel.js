'use strict'

const { filterAvailableCars } = require('../helpers/filterAvailableCars')
const { mapDbCarsToDto } = require('./mapDbCarsToDto')

function composeReadModel({ cars = [], reservations = [], priceRules = [], searchWindow } = {}) {
  if (!searchWindow) {
    throw new Error('search window is required')
  }

  const availableCars = filterAvailableCars({ cars, reservations, searchWindow })
  const dtoCars = mapDbCarsToDto({ cars: availableCars, priceRules })

  return {
    cars: availableCars,
    reservations,
    dtoCars,
  }
}

module.exports = {
  composeReadModel,
}
