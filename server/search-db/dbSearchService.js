'use strict'

const { buildSearchWindow } = require('./helpers/buildSearchWindow')
const { composeReadModel } = require('./transformers/composeReadModel')
const { mapDeliveryRegionsToCompany } = require('./transformers/mapDeliveryRegionsToCompany')
const { fetchCandidateCars } = require('./repositories/fetchCandidateCars')
const { fetchBlockingReservations } = require('./repositories/fetchBlockingReservations')
const { fetchPriceRules } = require('./repositories/fetchPriceRules')
const { fetchDeliveryRegions } = require('./repositories/fetchDeliveryRegions')
const { normalizeSearchState } = require('../search/searchState')

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
  const fetchDelivery = repositories.fetchDeliveryRegions || fetchDeliveryRegions

  const [deliveryRegions, deliveryRegionRows, candidateCars] = await Promise.all([
    fetchDelivery({ supabaseClient }),
    normalizedSearch.pickupOption === 'delivery' && normalizedSearch.dongId != null
      ? fetchDelivery({ supabaseClient, dongId: normalizedSearch.dongId })
      : Promise.resolve([]),
    fetchCars({
      supabaseClient,
      search: normalizedSearch,
      searchWindow,
    }),
  ])

  const deliveryRegion = deliveryRegionRows[0] || null

  if (normalizedSearch.pickupOption === 'delivery' && !deliveryRegion) {
    return {
      search: normalizedSearch,
      company: {
        ...(options.company || {}),
        deliveryCostList: mapDeliveryRegionsToCompany(deliveryRegions),
      },
      totalCount: 0,
      cars: [],
      meta: {
        source: 'db-search',
        stage: options.stage || 'scaffold',
      },
    }
  }

  const carIds = candidateCars.map((car) => car.id || car.source_car_id).filter(Boolean)
  const sourceGroupIds = candidateCars.map((car) => car.source_group_id).filter((value) => value != null)

  const [reservations, priceRules] = await Promise.all([
    fetchReservations({ supabaseClient, carIds, searchWindow }),
    fetchPrices({ supabaseClient, carIds, sourceGroupIds, searchWindow }),
  ])

  const readModel = composeReadModel({
    cars: candidateCars,
    reservations,
    priceRules,
    deliveryRegion,
    searchWindow,
    search: normalizedSearch,
  })

  return {
    search: normalizedSearch,
    company: {
      ...(options.company || {}),
      deliveryCostList: mapDeliveryRegionsToCompany(deliveryRegions),
    },
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
