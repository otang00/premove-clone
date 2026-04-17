const { normalizeSearchState, validateDetailSearch } = require('../search/searchState')

const PARTNER_RENTCAR_ID = '35457'
const PARTNER_BASE_URL = `https://partner.premove.co.kr/${PARTNER_RENTCAR_ID}`

function buildPartnerDetailUrl({ carId, searchState }) {
  const normalized = normalizeSearchState(searchState)
  const url = new URL(`${PARTNER_BASE_URL}/cars/${carId}`)

  url.searchParams.set('deliveryDateTime', normalized.deliveryDateTime)
  url.searchParams.set('returnDateTime', normalized.returnDateTime)
  url.searchParams.set('pickupOption', normalized.pickupOption)
  url.searchParams.set('driverAge', String(normalized.driverAge))
  url.searchParams.set('order', normalized.order)

  if (normalized.pickupOption === 'delivery') {
    if (normalized.dongId != null) {
      url.searchParams.set('dongId', String(normalized.dongId))
    }

    if (normalized.deliveryAddress) {
      url.searchParams.set('deliveryAddress', normalized.deliveryAddress)
    }
  }

  return url.toString()
}

module.exports = {
  PARTNER_BASE_URL,
  PARTNER_RENTCAR_ID,
  normalizeSearchState,
  validateDetailSearch,
  buildPartnerDetailUrl,
}
