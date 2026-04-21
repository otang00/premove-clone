const STORAGE_KEY = 'bbangcar-guest-reservations-v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readReservations() {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeReservations(reservations) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations))
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

function normalizeReservationNumber(value) {
  return String(value || '').trim().toUpperCase()
}

function createReservationNumber() {
  const now = new Date()
  const y = String(now.getFullYear()).slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `BB${y}${m}${d}${random}`
}

export function createGuestReservation({ car, pricing, searchState, deliveryAddressDetail, reservationForm, paymentMethod }) {
  const reservations = readReservations()
  const reservationNumber = createReservationNumber()

  const reservation = {
    reservationNumber,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    customerName: String(reservationForm.customerName || '').trim(),
    customerPhone: normalizePhone(reservationForm.customerPhone),
    customerBirth: String(reservationForm.customerBirth || '').trim(),
    paymentMethod,
    car: {
      id: String(car.id || ''),
      name: car.name || '',
      image: car.image || '',
      yearLabel: car.yearLabel || '',
      fuelType: car.fuelType || '',
      seats: car.seats || '',
    },
    schedule: {
      deliveryDateTime: searchState.deliveryDateTime,
      returnDateTime: searchState.returnDateTime,
      pickupOption: searchState.pickupOption,
      deliveryAddress: searchState.deliveryAddress || '',
      deliveryAddressDetail: deliveryAddressDetail || '',
    },
    pricing: {
      finalPrice: pricing.finalPrice,
    },
  }

  writeReservations([reservation, ...reservations])
  return reservation
}

export function getGuestReservation(reservationNumber) {
  const normalizedReservationNumber = normalizeReservationNumber(reservationNumber)
  return readReservations().find((item) => item.reservationNumber === normalizedReservationNumber) || null
}

export function findGuestReservation({ reservationNumber, customerPhone }) {
  const normalizedReservationNumber = normalizeReservationNumber(reservationNumber)
  const normalizedPhone = normalizePhone(customerPhone)

  return readReservations().find((item) => (
    item.reservationNumber === normalizedReservationNumber
    && normalizePhone(item.customerPhone) === normalizedPhone
  )) || null
}

export function cancelGuestReservation({ reservationNumber, customerPhone }) {
  const normalizedReservationNumber = normalizeReservationNumber(reservationNumber)
  const normalizedPhone = normalizePhone(customerPhone)
  const reservations = readReservations()

  const nextReservations = reservations.map((item) => {
    if (item.reservationNumber !== normalizedReservationNumber) return item
    if (normalizePhone(item.customerPhone) !== normalizedPhone) return item
    if (item.status === 'cancelled') return item

    return {
      ...item,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    }
  })

  writeReservations(nextReservations)
  return nextReservations.find((item) => (
    item.reservationNumber === normalizedReservationNumber
    && normalizePhone(item.customerPhone) === normalizedPhone
  )) || null
}
