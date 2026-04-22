'use strict'

const DEFAULT_ADMIN_EMAILS = ['otang00@naver.com']

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function getAdminEmailSet() {
  const values = [
    process.env.ADMIN_EMAILS,
    process.env.ADMIN_EMAIL,
    process.env.BOOKING_EMAIL_TO,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value || '').split(','))
    .map(normalizeEmail)
    .filter(Boolean)

  const emails = values.length > 0 ? values : DEFAULT_ADMIN_EMAILS
  return new Set(emails)
}

function isAdminEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  return getAdminEmailSet().has(normalized)
}

function assertAdminUser(authUser) {
  if (!authUser?.email || !isAdminEmail(authUser.email)) {
    return {
      ok: false,
      status: 403,
      code: 'admin_access_denied',
      message: '관리자만 접근할 수 있습니다.',
    }
  }

  return { ok: true }
}

module.exports = {
  DEFAULT_ADMIN_EMAILS,
  isAdminEmail,
  assertAdminUser,
}
