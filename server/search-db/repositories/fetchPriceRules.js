'use strict'

const { fetchGroupPricePolicies } = require('./fetchGroupPricePolicies')

function isMissingRelationError(error, relationName) {
  if (!error) return false
  if (error.code === 'PGRST205') {
    return true
  }

  const message = typeof error.message === 'string' ? error.message : ''
  return new RegExp(relationName).test(message) && /not find|does not exist/i.test(message)
}

async function fetchLegacyCarPrices({ supabaseClient, carIds } = {}) {
  if (!Array.isArray(carIds) || carIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseClient
    .from('car_prices')
    .select('*')
    .in('car_id', carIds)

  if (error) {
    if (isMissingRelationError(error, 'car_prices')) {
      console.warn('[search-db] car_prices table missing, skipping legacy price rules fetch')
      return []
    }
    throw error
  }

  return Array.isArray(data) ? data : []
}

async function fetchPriceRules({ supabaseClient, carIds = [], sourceGroupIds = [], searchWindow } = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  try {
    const groupPolicies = await fetchGroupPricePolicies({ supabaseClient, sourceGroupIds, searchWindow })
    if (groupPolicies.length > 0) {
      return groupPolicies
    }
  } catch (error) {
    if (!isMissingRelationError(error, 'v_active_group_price_policies')) {
      throw error
    }
    console.warn('[search-db] group pricing view missing, falling back to legacy car_prices')
  }

  return fetchLegacyCarPrices({ supabaseClient, carIds })
}

module.exports = {
  fetchPriceRules,
}
