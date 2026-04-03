import {
  DEFAULT_SEARCH_STATE,
  DRIVER_AGE_OPTIONS,
  ORDER_OPTIONS,
  PICKUP_OPTIONS,
} from '../constants/search'

function toSearchParams(searchStringOrParams) {
  if (searchStringOrParams instanceof URLSearchParams) {
    return searchStringOrParams
  }

  if (typeof searchStringOrParams === 'string') {
    const raw = searchStringOrParams.startsWith('?')
      ? searchStringOrParams.slice(1)
      : searchStringOrParams

    return new URLSearchParams(raw)
  }

  return new URLSearchParams(searchStringOrParams || '')
}

function normalizeDateTime(value, fallback) {
  const nextValue = typeof value === 'string' ? value.trim() : ''
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(nextValue) ? nextValue : fallback
}

function normalizePickupOption(value) {
  return PICKUP_OPTIONS.includes(value) ? value : DEFAULT_SEARCH_STATE.pickupOption
}

function normalizeDriverAge(value) {
  const nextValue = Number(value)
  return DRIVER_AGE_OPTIONS.includes(nextValue) ? nextValue : DEFAULT_SEARCH_STATE.driverAge
}

function normalizeOrder(value) {
  return ORDER_OPTIONS.includes(value) ? value : DEFAULT_SEARCH_STATE.order
}

function normalizeDongId(value) {
  if (value == null || value === '') return null

  const nextValue = Number(value)
  return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : null
}

function normalizeDeliveryAddress(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeSearchState(rawState = {}) {
  const pickupOption = normalizePickupOption(rawState.pickupOption)
  const deliveryDateTime = normalizeDateTime(
    rawState.deliveryDateTime,
    DEFAULT_SEARCH_STATE.deliveryDateTime,
  )
  const returnDateTime = normalizeDateTime(
    rawState.returnDateTime,
    DEFAULT_SEARCH_STATE.returnDateTime,
  )
  const driverAge = normalizeDriverAge(rawState.driverAge)
  const order = normalizeOrder(rawState.order)
  const dongId = normalizeDongId(rawState.dongId)
  const deliveryAddress = normalizeDeliveryAddress(rawState.deliveryAddress)

  return {
    deliveryDateTime,
    returnDateTime,
    pickupOption,
    driverAge,
    order,
    dongId: pickupOption === 'delivery' ? dongId : null,
    deliveryAddress: pickupOption === 'delivery' ? deliveryAddress : '',
  }
}

export function validateSearchState(searchState) {
  const normalized = normalizeSearchState(searchState)
  const errors = {}

  if (!normalized.deliveryDateTime) {
    errors.deliveryDateTime = 'deliveryDateTime is required'
  }

  if (!normalized.returnDateTime) {
    errors.returnDateTime = 'returnDateTime is required'
  }

  if (!PICKUP_OPTIONS.includes(normalized.pickupOption)) {
    errors.pickupOption = 'pickupOption is invalid'
  }

  if (!ORDER_OPTIONS.includes(normalized.order)) {
    errors.order = 'order is invalid'
  }

  if (!DRIVER_AGE_OPTIONS.includes(normalized.driverAge)) {
    errors.driverAge = 'driverAge is invalid'
  }

  const pickupAt = new Date(normalized.deliveryDateTime.replace(' ', 'T'))
  const returnAt = new Date(normalized.returnDateTime.replace(' ', 'T'))

  if (!Number.isNaN(pickupAt.getTime()) && !Number.isNaN(returnAt.getTime()) && returnAt <= pickupAt) {
    errors.returnDateTime = 'returnDateTime must be after deliveryDateTime'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized,
  }
}

export function parseSearchQuery(searchStringOrParams) {
  const params = toSearchParams(searchStringOrParams)

  return normalizeSearchState({
    deliveryDateTime: params.get('deliveryDateTime'),
    returnDateTime: params.get('returnDateTime'),
    pickupOption: params.get('pickupOption'),
    driverAge: params.get('driverAge'),
    order: params.get('order'),
    dongId: params.get('dongId'),
    deliveryAddress: params.get('deliveryAddress'),
  })
}

export function buildSearchQuery(searchState) {
  const normalized = normalizeSearchState(searchState)
  const params = new URLSearchParams()

  params.set('deliveryDateTime', normalized.deliveryDateTime)
  params.set('returnDateTime', normalized.returnDateTime)
  params.set('pickupOption', normalized.pickupOption)
  params.set('driverAge', String(normalized.driverAge))
  params.set('order', normalized.order)

  if (normalized.pickupOption === 'delivery') {
    if (normalized.dongId != null) {
      params.set('dongId', String(normalized.dongId))
    }

    if (normalized.deliveryAddress) {
      params.set('deliveryAddress', normalized.deliveryAddress)
    }
  }

  return params.toString()
}

export function toDateTimeInputValue(dateTime) {
  return typeof dateTime === 'string' ? dateTime.replace(' ', 'T') : ''
}

export function fromDateTimeInputValue(value) {
  return typeof value === 'string' ? value.replace('T', ' ') : ''
}
