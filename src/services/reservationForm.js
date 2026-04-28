import {
  normalizePersonName,
  validateBirthDate,
  validateMobilePhoneNumber,
  validatePersonName,
} from '../utils/identityValidation'

export const DEFAULT_RESERVATION_FORM = {
  customerName: '',
  customerPhone: '',
  customerBirth: '',
}

export function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '').slice(0, 11)
}

export function normalizeBirth(value) {
  return String(value || '').replace(/[^\d]/g, '').slice(0, 8)
}

export function normalizeReservationForm(form = {}) {
  return {
    customerName: normalizePersonName(form.customerName),
    customerPhone: normalizePhone(form.customerPhone),
    customerBirth: normalizeBirth(form.customerBirth),
  }
}

export function validateReservationForm(form = {}) {
  const normalized = normalizeReservationForm(form)
  const errors = {}

  if (!normalized.customerName) {
    errors.customerName = '이름을 입력해 주세요.'
  } else {
    const nameValidation = validatePersonName(normalized.customerName)
    if (!nameValidation.isValid) {
      errors.customerName = nameValidation.message
    }
  }

  const phoneValidation = validateMobilePhoneNumber(normalized.customerPhone)
  if (!phoneValidation.isValid) {
    errors.customerPhone = phoneValidation.message
  }

  const birthValidation = validateBirthDate(normalized.customerBirth)
  if (!birthValidation.isValid) {
    errors.customerBirth = birthValidation.message
  }

  return {
    normalized,
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
