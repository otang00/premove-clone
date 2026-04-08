import {
  DRIVER_AGE_OPTIONS,
  ORDER_OPTIONS,
  PICKUP_OPTIONS,
  getDefaultSearchState,
} from '../constants/search'
import {
  parseDateTimeString,
  sanitizeSearchDateTimes,
} from './reservationSchedule'

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

function normalizePickupOption(value, fallbackState) {
  return PICKUP_OPTIONS.includes(value) ? value : fallbackState.pickupOption
}

function normalizeDriverAge(value, fallbackState) {
  const nextValue = Number(value)
  return DRIVER_AGE_OPTIONS.includes(nextValue) ? nextValue : fallbackState.driverAge
}

function normalizeOrder(value, fallbackState) {
  return ORDER_OPTIONS.includes(value) ? value : fallbackState.order
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
  const fallbackState = getDefaultSearchState()
  const pickupOption = normalizePickupOption(rawState.pickupOption, fallbackState)
  const driverAge = normalizeDriverAge(rawState.driverAge, fallbackState)
  const order = normalizeOrder(rawState.order, fallbackState)
  const dongId = normalizeDongId(rawState.dongId)
  const deliveryAddress = normalizeDeliveryAddress(rawState.deliveryAddress)
  const sanitizedDateTimes = sanitizeSearchDateTimes({
    deliveryDateTime: normalizeDateTime(rawState.deliveryDateTime, fallbackState.deliveryDateTime),
    returnDateTime: normalizeDateTime(rawState.returnDateTime, fallbackState.returnDateTime),
  })

  return {
    deliveryDateTime: sanitizedDateTimes.deliveryDateTime,
    returnDateTime: sanitizedDateTimes.returnDateTime,
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

  if (normalized.pickupOption === 'delivery' && normalized.dongId == null) {
    errors.dongId = '딜리버리 위치를 선택해 주세요.'
  }

  const pickupAt = parseDateTimeString(normalized.deliveryDateTime)
  const returnAt = parseDateTimeString(normalized.returnDateTime)

  if (!pickupAt) {
    errors.deliveryDateTime = 'deliveryDateTime is invalid'
  }

  if (!returnAt) {
    errors.returnDateTime = 'returnDateTime is invalid'
  }

  if (pickupAt && returnAt && returnAt <= pickupAt) {
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
