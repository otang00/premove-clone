const { buildPartnerUrl, normalizeSearchState, validateSearchState } = require('../server/partner/buildPartnerUrl')
const { fetchPartnerSearch } = require('../server/partner/fetchPartnerSearch')
const { parsePartnerSearch } = require('../server/partner/parsePartnerSearch')
const { mapPartnerSearchDto } = require('../server/partner/mapPartnerDto')

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

  try {
    const partnerUrl = buildPartnerUrl(validation.normalized)
    const raw = await fetchPartnerSearch(partnerUrl)
    const parsed = parsePartnerSearch(raw.body)
    const dto = mapPartnerSearchDto({
      search: validation.normalized,
      parsed,
    })

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({
      ...dto,
      meta: {
        source: 'partner-url-fetch',
      },
    })
  } catch (error) {
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
