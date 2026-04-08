const PARTNER_RENTCAR_ID = '35457'
const PARTNER_BASE_URL = `https://partner.premove.co.kr/${PARTNER_RENTCAR_ID}`

const DEFAULT_SEARCH_STATE = {
  deliveryDateTime: '2026-04-02 10:00',
  returnDateTime: '2026-04-03 10:00',
  pickupOption: 'pickup',
  driverAge: 26,
  order: 'lower',
  dongId: null,
  deliveryAddress: '',
  deliveryAddressDetail: '',
}

const PICKUP_OPTIONS = new Set(['pickup', 'delivery'])
const ORDER_OPTIONS = new Set(['lower', 'higher', 'newer'])
const DRIVER_AGE_OPTIONS = new Set([21, 26])

function normalizeDateTime(value, fallback) {
  const nextValue = typeof value === 'string' ? value.trim() : ''
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(nextValue) ? nextValue : fallback
}

function normalizeSearchState(rawState = {}) {
  const pickupOption = PICKUP_OPTIONS.has(rawState.pickupOption)
    ? rawState.pickupOption
    : DEFAULT_SEARCH_STATE.pickupOption

  const driverAge = DRIVER_AGE_OPTIONS.has(Number(rawState.driverAge))
    ? Number(rawState.driverAge)
    : DEFAULT_SEARCH_STATE.driverAge

  const order = ORDER_OPTIONS.has(rawState.order)
    ? rawState.order
    : DEFAULT_SEARCH_STATE.order

  const dongId = rawState.dongId == null || rawState.dongId === ''
    ? null
    : Number.isInteger(Number(rawState.dongId)) && Number(rawState.dongId) > 0
      ? Number(rawState.dongId)
      : null

  const deliveryAddress = typeof rawState.deliveryAddress === 'string'
    ? rawState.deliveryAddress.trim()
    : ''

  return {
    deliveryDateTime: normalizeDateTime(rawState.deliveryDateTime, DEFAULT_SEARCH_STATE.deliveryDateTime),
    returnDateTime: normalizeDateTime(rawState.returnDateTime, DEFAULT_SEARCH_STATE.returnDateTime),
    pickupOption,
    driverAge,
    order,
    dongId: pickupOption === 'delivery' ? dongId : null,
    deliveryAddress: pickupOption === 'delivery' ? deliveryAddress : '',
  }
}

function validateDetailSearch({ carId, searchState }) {
  const normalized = normalizeSearchState(searchState)
  const errors = {}

  if (!carId) {
    errors.carId = 'carId is required'
  }

  const pickupAt = new Date(normalized.deliveryDateTime.replace(' ', 'T'))
  const returnAt = new Date(normalized.returnDateTime.replace(' ', 'T'))

  if (returnAt <= pickupAt) {
    errors.returnDateTime = 'returnDateTime must be after deliveryDateTime'
  }

  if (normalized.pickupOption === 'delivery' && normalized.dongId == null) {
    errors.dongId = 'dongId is required for delivery search'
  }

  if (normalized.pickupOption === 'delivery' && !normalized.deliveryAddressDetail) {
    errors.deliveryAddressDetail = 'deliveryAddressDetail is required for delivery search'
  }

  return {
    normalized,
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

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
