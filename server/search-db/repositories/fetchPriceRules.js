'use strict'

function isMissingPriceTableError(error) {
  if (!error) return false
  if (error.code === 'PGRST205') {
    return true
  }

  const message = typeof error.message === 'string' ? error.message : ''
  return /car_prices/.test(message) && /not find|does not exist/i.test(message)
}

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

  try {
    const { data, error } = await query
    if (error) {
      if (isMissingPriceTableError(error)) {
        console.warn('[search-db] car_prices table missing, skipping price rules fetch')
        return []
      }
      throw error
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    if (isMissingPriceTableError(error)) {
      console.warn('[search-db] car_prices table missing, skipping price rules fetch')
      return []
    }
    throw error
  }
}

module.exports = {
  fetchPriceRules,
}
