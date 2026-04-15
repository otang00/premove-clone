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
  repositories = {},
} = {}) {
  if (!search) {
    throw new Error('search state is required')
  }

  if (!supabaseClient && !repositories.fetchCandidateCars) {
    throw new Error('supabase client is required')
  }

  const normalizedSearch = normalizeSearchState(search)
  const searchWindow = buildSearchWindow(normalizedSearch)

  const fetchCars = repositories.fetchCandidateCars || fetchCandidateCars
  const fetchReservations = repositories.fetchBlockingReservations || fetchBlockingReservations
  const fetchPrices = repositories.fetchPriceRules || fetchPriceRules

  const candidateCars = await fetchCars({
    supabaseClient,
    search: normalizedSearch,
    searchWindow,
  })

  const carIds = candidateCars.map((car) => car.id || car.source_car_id).filter(Boolean)

  const [reservations, priceRules] = await Promise.all([
    fetchReservations({ supabaseClient, carIds, searchWindow }),
    fetchPrices({ supabaseClient, carIds }),
  ])

  const readModel = composeReadModel({
    cars: candidateCars,
    reservations,
    priceRules,
    searchWindow,
  })

  return {
    search: normalizedSearch,
    company: options.company || null,
    totalCount: readModel.dtoCars.length,
    cars: readModel.dtoCars,
    meta: {
      source: 'db-search',
      stage: options.stage || 'scaffold',
    },
  }
}

module.exports = {
  dbSearchService: {
    run,
  },
}
