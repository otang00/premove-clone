const { buildPartnerUrl, normalizeSearchState, validateSearchState } = require('../server/partner/buildPartnerUrl')
const { fetchPartnerSearch } = require('../server/partner/fetchPartnerSearch')
const { parsePartnerSearch } = require('../server/partner/parsePartnerSearch')
const { mapPartnerSearchDto } = require('../server/partner/mapPartnerDto')
const { createServerClient } = require('../server/supabase/createServerClient')
const { dbSearchService } = require('../server/search-db/dbSearchService')

function isShadowEnabled() {
  return /^true$/i.test(process.env.SEARCH_SHADOW_ENABLED || '')
}

async function runShadowSearch(search) {
  if (!isShadowEnabled()) {
    return { enabled: false }
  }

  const supabaseClient = createServerClient()
  if (!supabaseClient) {
    return { enabled: false, reason: 'supabase_client_unavailable' }
  }

  try {
    const result = await dbSearchService.run({
      search,
      supabaseClient,
      options: { stage: 'shadow' },
    })

    return { enabled: true, status: 'fulfilled', result }
  } catch (error) {
    return { enabled: true, status: 'rejected', error }
  }
}

function buildShadowMeta(shadowResult) {
  if (!shadowResult) {
    return null
  }

  if (!shadowResult.enabled) {
    if (shadowResult.reason) {
      return { status: 'disabled', reason: shadowResult.reason }
    }
    return null
  }

  if (shadowResult.status === 'fulfilled') {
    return {
      status: 'ok',
      totalCount: shadowResult.result.totalCount,
    }
  }

  return {
    status: 'error',
    error: shadowResult.error && shadowResult.error.message ? shadowResult.error.message : 'db_search_failed',
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const search = normalizeSearchState(req.query || {})
  const validation = validateSearchState(search)

  if (!validation.isValid) {
    return res.status(400).json({
      error: 'invalid_search_query',
      errors: validation.errors,
      search: validation.normalized,
    })
  }

  const shadowPromise = runShadowSearch(validation.normalized)

  try {
    const partnerUrl = buildPartnerUrl(validation.normalized)
    const raw = await fetchPartnerSearch(partnerUrl)
    const parsed = parsePartnerSearch(raw.body)
    const dto = mapPartnerSearchDto({
      search: validation.normalized,
      parsed,
    })

    const shadowResult = await shadowPromise
    const shadowMeta = buildShadowMeta(shadowResult)

    const meta = {
      source: 'partner-url-fetch',
    }

    if (shadowMeta) {
      meta.shadow = shadowMeta
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({
      ...dto,
      meta,
    })
  } catch (error) {
    shadowPromise.catch(() => null)

    const message = error && error.message ? error.message : 'external_lookup_failed'
    const statusCode = /partner fetch failed/.test(message) || error.code === 'PARTNER_FETCH_TIMEOUT'
      ? 502
      : 500

    return res.status(statusCode).json({
      error: statusCode === 502 ? 'external_lookup_failed' : 'partner_parser_failed',
      message,
    })
  }
}
