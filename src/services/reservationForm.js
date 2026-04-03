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
    customerName: String(form.customerName || '').trim(),
    customerPhone: normalizePhone(form.customerPhone),
    customerBirth: normalizeBirth(form.customerBirth),
  }
}

export function validateReservationForm(form = {}) {
  const normalized = normalizeReservationForm(form)
  const errors = {}

  if (!normalized.customerName) {
    errors.customerName = '이름을 입력해 주세요.'
  }

  if (!/^\d{10,11}$/.test(normalized.customerPhone)) {
    errors.customerPhone = '휴대폰번호를 확인해 주세요.'
  }

  if (!/^\d{8}$/.test(normalized.customerBirth)) {
    errors.customerBirth = '생년월일 8자리를 입력해 주세요.'
  }

  return {
    normalized,
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
