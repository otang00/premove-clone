'use strict'

const crypto = require('crypto')

const TOKEN_VERSION = 1
const SECRET_ENV_NAMES = ['BOOKING_CONFIRM_TOKEN_SECRET', 'DETAIL_TOKEN_SECRET', 'APP_SECRET']

function getTokenSecret() {
  for (const key of SECRET_ENV_NAMES) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  throw new Error('booking_confirm_token_secret_missing')
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const input = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padding = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(`${input}${padding}`, 'base64').toString('utf8')
}

function signPayload(payloadJson, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadJson)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function timingSafeEqualString(left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function createBookingConfirmToken({ bookingOrderId, reservationCode, secret } = {}) {
  if (typeof bookingOrderId !== 'string' || !bookingOrderId.trim()) {
    throw new Error('invalid_booking_confirm_token_booking_order_id')
  }

  if (typeof reservationCode !== 'string' || !reservationCode.trim()) {
    throw new Error('invalid_booking_confirm_token_reservation_code')
  }

  const payload = {
    v: TOKEN_VERSION,
    boid: bookingOrderId.trim(),
    rc: reservationCode.trim().toUpperCase(),
  }

  const payloadJson = JSON.stringify(payload)
  const encodedPayload = toBase64Url(payloadJson)
  const signature = signPayload(payloadJson, secret || getTokenSecret())

  return {
    token: `${encodedPayload}.${signature}`,
    payload,
  }
}

function verifyBookingConfirmToken({ token, secret } = {}) {
  const resolvedSecret = secret || getTokenSecret()

  if (typeof token !== 'string' || !token.trim()) {
    return { isValid: false, reason: 'missing_token' }
  }

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    return { isValid: false, reason: 'malformed_token' }
  }

  let payloadJson
  let payload

  try {
    payloadJson = fromBase64Url(encodedPayload)
    payload = JSON.parse(payloadJson)
  } catch (error) {
    return { isValid: false, reason: 'malformed_token' }
  }

  const expectedSignature = signPayload(payloadJson, resolvedSecret)
  if (!timingSafeEqualString(signature, expectedSignature)) {
    return { isValid: false, reason: 'invalid_signature', payload }
  }

  if (Number(payload.v) !== TOKEN_VERSION) {
    return { isValid: false, reason: 'invalid_version', payload }
  }

  if (typeof payload.boid !== 'string' || !payload.boid.trim()) {
    return { isValid: false, reason: 'invalid_booking_order_id', payload }
  }

  if (typeof payload.rc !== 'string' || !payload.rc.trim()) {
    return { isValid: false, reason: 'invalid_reservation_code', payload }
  }

  return {
    isValid: true,
    reason: null,
    payload,
  }
}

module.exports = {
  TOKEN_VERSION,
  createBookingConfirmToken,
  verifyBookingConfirmToken,
}
