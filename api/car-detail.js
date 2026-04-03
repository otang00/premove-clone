const { buildPartnerDetailUrl, normalizeSearchState, validateDetailSearch } = require('../server/partner/buildPartnerDetailUrl')
const { fetchPartnerCarDetail } = require('../server/partner/fetchPartnerCarDetail')
const { parsePartnerCarDetail } = require('../server/partner/parsePartnerCarDetail')
const { mapPartnerCarDetailDto } = require('../server/partner/mapPartnerCarDetailDto')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const { carId } = req.query || {}
  const search = normalizeSearchState(req.query || {})
  const validation = validateDetailSearch({ carId, searchState: search })

  if (!validation.isValid) {
    return res.status(400).json({
      error: 'invalid_detail_query',
      errors: validation.errors,
      search: validation.normalized,
      carId: carId || null,
    })
  }

  try {
    const partnerUrl = buildPartnerDetailUrl({
      carId,
      searchState: validation.normalized,
    })
    const raw = await fetchPartnerCarDetail(partnerUrl)
    const parsed = parsePartnerCarDetail(raw.body)
    const dto = mapPartnerCarDetailDto({
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
    const message = error && error.message ? error.message : 'external_detail_lookup_failed'
    const statusCode = /partner detail fetch failed/.test(message) || error.code === 'PARTNER_DETAIL_FETCH_TIMEOUT'
      ? 502
      : 500

    return res.status(statusCode).json({
      error: statusCode === 502 ? 'external_detail_lookup_failed' : 'partner_detail_parser_failed',
      message,
    })
  }
}
