'use strict'

const { buildSearchWindow } = require('./helpers/buildSearchWindow')
const { composeReadModel } = require('./transformers/composeReadModel')
const { fetchCandidateCars } = require('./repositories/fetchCandidateCars')
const { fetchBlockingReservations } = require('./repositories/fetchBlockingReservations')
const { fetchPriceRules } = require('./repositories/fetchPriceRules')
const { normalizeSearchState } = require('../partner/buildPartnerUrl')

async function run({
  search,
  supabaseClient,
  options = {},
} = {}) {
  if (!search) {
    throw new Error('search state is required')
  }

  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const normalizedSearch = normalizeSearchState(search)
  const searchWindow = buildSearchWindow(normalizedSearch)

  const candidateCars = await fetchCandidateCars({
    supabaseClient,
    search: normalizedSearch,
    searchWindow,
  })

  const carIds = candidateCars.map((car) => car.id || car.source_car_id).filter(Boolean)

  const [reservations, priceRules] = await Promise.all([
    fetchBlockingReservations({ supabaseClient, carIds, searchWindow }),
    fetchPriceRules({ supabaseClient, carIds }),
  ])

  const readModel = composeReadModel({ cars: candidateCars, reservations, priceRules })

  return {
    search: normalizedSearch,
    company: options.company || null,
    totalCount: readModel.cars.length,
    cars: readModel.cars,
    meta: {
      source: 'db-search',
      stage: 'scaffold',
    },
  }
}

module.exports = {
  dbSearchService: {
    run,
  },
}
