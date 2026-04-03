export const DEFAULT_DELIVERY_FORM = {
  selectedDongId: null,
  selectedDongLabel: '',
  deliveryAddressDetail: '',
  deliveryMemo: '',
}

export function normalizeDeliveryForm(form = {}) {
  return {
    selectedDongId: form.selectedDongId == null || form.selectedDongId === ''
      ? null
      : Number(form.selectedDongId),
    selectedDongLabel: String(form.selectedDongLabel || '').trim(),
    deliveryAddressDetail: String(form.deliveryAddressDetail || '').trim(),
    deliveryMemo: String(form.deliveryMemo || '').trim(),
  }
}

export function validateDeliveryForm(form = {}, pickupOption = 'pickup') {
  const normalized = normalizeDeliveryForm(form)
  const errors = {}

  if (pickupOption !== 'delivery') {
    return {
      normalized,
      errors,
      isValid: true,
    }
  }

  if (!normalized.selectedDongId) {
    errors.selectedDongId = '딜리버리 위치를 선택해 주세요.'
  }

  if (!normalized.deliveryAddressDetail) {
    errors.deliveryAddressDetail = '상세 주소를 입력해 주세요.'
  }

  return {
    normalized,
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
