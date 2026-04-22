const DEFAULT_ADMIN_EMAILS = ['otang00@naver.com']

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function getAdminEmailSet() {
  const raw = import.meta.env.VITE_ADMIN_EMAILS || import.meta.env.VITE_ADMIN_EMAIL || ''
  const values = String(raw || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)

  const emails = values.length > 0 ? values : DEFAULT_ADMIN_EMAILS
  return new Set(emails)
}

export function isAdminEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  return getAdminEmailSet().has(normalized)
}
