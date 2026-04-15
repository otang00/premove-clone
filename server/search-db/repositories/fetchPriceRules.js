'use strict'

async function fetchPriceRules({ supabaseClient, carIds } = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  if (!Array.isArray(carIds) || carIds.length === 0) {
    return []
  }

  const query = supabaseClient
    .from('car_prices')
    .select('*')
    .in('car_id', carIds)

  const { data, error } = await query
  if (error) {
    throw error
  }

  return Array.isArray(data) ? data : []
}

module.exports = {
  fetchPriceRules,
}
