const { buildPartnerUrl, normalizeSearchState, validateSearchState } = require('../server/partner/buildPartnerUrl')
const { fetchPartnerSearch } = require('../server/partner/fetchPartnerSearch')
const { parsePartnerSearch } = require('../server/partner/parsePartnerSearch')
const { mapPartnerSearchDto } = require('../server/partner/mapPartnerDto')
const { createServerClient } = require('../server/supabase/createServerClient')
const { dbSearchService } = require('../server/search-db/dbSearchService')
const { recordShadowDiff } = require('../server/search-db/recorders/recordShadowDiff')

const DB_PREVIEW_COMPANY = {
  companyId: 35457,
  companyName: '빵빵카(주)',
  companyTel: '025920079',
  fullGarageAddress: '서울 서초구 신반포로23길 78-9 (수푸레하우스) 1층',
}

function isShadowEnabled() {
  return /^true$/i.test(process.env.SEARCH_SHADOW_ENABLED || '')
}

function shouldUseDbPreview(req) {
  const source = (req.query?.source || req.query?.preview || '').toString().toLowerCase()
  return source === 'db'
}

async function runDbPreviewSearch(search) {
  const supabaseClient = createServerClient()
  if (!supabaseClient) {
    throw new Error('supabase_client_unavailable')
  }

  const company = {
    ...DB_PREVIEW_COMPANY,
    companyName: process.env.SEARCH_COMPANY_NAME || DB_PREVIEW_COMPANY.companyName,
  }

  return dbSearchService.run({
    search,
    supabaseClient,
    options: {
      stage: 'db-preview',
      company,
    },
  })
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

    return { enabled: true, status: 'fulfilled', result, supabaseClient }
  } catch (error) {
    return { enabled: true, status: 'rejected', error }
  }
}

function getShadowLogPath() {
  return (process.env.SEARCH_SHADOW_LOG_PATH || '').trim()
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

async function handleShadowLogging({ dto, shadowResult, normalizedSearch }) {
  if (!shadowResult || shadowResult.status !== 'fulfilled') {
    return { logged: false, reason: 'shadow_unavailable' }
  }

  try {
    return await recordShadowDiff({
      partnerDto: dto,
      dbDto: shadowResult.result,
      normalizedSearch,
      supabaseClient: shadowResult.supabaseClient,
      filePath: getShadowLogPath(),
    })
  } catch (error) {
    return { logged: false, error }
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

  if (shouldUseDbPreview(req)) {
    try {
      const dbResult = await runDbPreviewSearch(validation.normalized)
      return res.status(200).json({
        ...dbResult,
        company: dbResult.company || DB_PREVIEW_COMPANY,
        meta: {
          source: 'db-search-preview',
        },
      })
    } catch (error) {
      const message = error && error.message ? error.message : 'db_search_failed'
      return res.status(500).json({
        error: 'db_search_failed',
        message,
      })
    }
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

    const loggingOutcome = await handleShadowLogging({
      dto,
      shadowResult,
      normalizedSearch: validation.normalized,
    })

    if (meta.shadow) {
      meta.shadow.logged = Boolean(loggingOutcome.logged)
      if (!loggingOutcome.logged && loggingOutcome.error) {
        meta.shadow.warning = 'shadow_log_failed'
      }
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
