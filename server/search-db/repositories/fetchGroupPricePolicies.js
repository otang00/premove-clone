'use strict'

function overlapsWindow(rule = {}, searchWindow = {}) {
  if (!searchWindow.startAt || !searchWindow.endAt) {
    return true
  }

  const effectiveFrom = rule.effective_from ? new Date(rule.effective_from) : null
  const effectiveTo = rule.effective_to ? new Date(rule.effective_to) : null

  if (effectiveFrom && searchWindow.endAt < effectiveFrom) {
    return false
  }

  if (effectiveTo && searchWindow.startAt > effectiveTo) {
    return false
  }

  return true
}

async function fetchGroupPricePolicies({ supabaseClient, sourceGroupIds = [], searchWindow } = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  const ids = [...new Set(sourceGroupIds.map((value) => Number(value)).filter(Number.isFinite))]
  if (ids.length === 0) {
    return []
  }

  const { data, error } = await supabaseClient
    .from('v_active_group_price_policies')
    .select('*')
    .in('ims_group_id', ids)

  if (error) {
    throw error
  }

  return (Array.isArray(data) ? data : []).filter((row) => overlapsWindow(row, searchWindow))
}

module.exports = {
  fetchGroupPricePolicies,
}
