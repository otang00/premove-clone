'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { getAccessTokenFromRequest } = require('../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../server/auth/getUserFromAccessToken')
const { assertAdminUser } = require('../../server/auth/adminAccess')
const { serializeBookingOrder } = require('../../server/booking-core/guestBookingUtils')
const { createBookingConfirmToken } = require('../../server/security/bookingConfirmToken')

const TAB_STATUS_MAP = {
  pending: ['confirmation_pending'],
  active: ['confirmation_pending', 'confirmed_pending_sync', 'confirmed', 'in_use'],
  cancelled: ['cancelled'],
}

function normalizeTab(value) {
  const normalized = String(value || 'pending').trim().toLowerCase()
  return TAB_STATUS_MAP[normalized] ? normalized : 'pending'
}

function normalizeQueryField(value) {
  const normalized = String(value || 'carNumber').trim()
  return ['carNumber', 'reservationNumber', 'customerName'].includes(normalized)
    ? normalized
    : 'carNumber'
}

function normalizePage(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

function readSearchValue(item, field) {
  if (field === 'reservationNumber') return String(item.publicReservationCode || '')
  if (field === 'customerName') return String(item.customerName || '')
  if (field === 'carNumber') return String(item.pricingSnapshot?.carNumber || '')
  return ''
}

function matchesSearch(item, field, query) {
  const target = readSearchValue(item, field).trim().toLowerCase()
  const normalizedQuery = String(query || '').trim().toLowerCase()
  if (!normalizedQuery) return true
  if (!target) return false

  if (field === 'reservationNumber') {
    return target === normalizedQuery
  }

  return target.includes(normalizedQuery)
}

function createDetailPath(item) {
  if (!item?.id || !item?.publicReservationCode) return ''
  const { token } = createBookingConfirmToken({
    bookingOrderId: item.id,
    reservationCode: item.publicReservationCode,
  })
  return `/admin/booking-confirm?token=${encodeURIComponent(token)}`
}

function toAdminBookingItem(order, fallbackCarNumberById = new Map()) {
  const item = serializeBookingOrder(order)
  const fallbackCarNumber = fallbackCarNumberById.get(Number(order?.car_id)) || ''
  return {
    id: item.id,
    reservationNumber: item.publicReservationCode,
    carNumber: item.pricingSnapshot?.carNumber || fallbackCarNumber,
    carName: item.pricingSnapshot?.carName || '',
    customerName: item.customerName || '',
    pickupAt: item.pickupAt || null,
    returnAt: item.returnAt || null,
    bookingStatus: item.bookingStatus || '',
    paymentStatus: item.paymentStatus || '',
    quotedTotalAmount: item.quotedTotalAmount ?? 0,
    createdAt: item.createdAt || null,
    canConfirm: String(item.bookingStatus || '') === 'confirmation_pending',
    detailPath: createDetailPath(item),
  }
}

async function fetchFallbackCarNumbers({ supabaseClient, rows } = {}) {
  const missingCarIds = (Array.isArray(rows) ? rows : [])
    .filter((row) => !(row?.pricing_snapshot?.carNumber) && row?.car_id)
    .map((row) => Number(row.car_id))
    .filter(Number.isFinite)

  const uniqueCarIds = [...new Set(missingCarIds)]
  if (uniqueCarIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabaseClient
    .from('cars')
    .select('id, car_number')
    .in('id', uniqueCarIds)

  if (error) {
    throw error
  }

  return new Map((Array.isArray(data) ? data : []).map((row) => [Number(row.id), String(row.car_number || '')]))
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const supabaseClient = createServerClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  const accessToken = getAccessTokenFromRequest(req)
  if (!accessToken) {
    return res.status(401).json({ error: 'missing_access_token', message: '로그인이 필요합니다.' })
  }

  try {
    const authUser = await getUserFromAccessToken({ supabaseClient, accessToken })
    if (!authUser) {
      return res.status(401).json({ error: 'invalid_access_token', message: '로그인이 필요합니다.' })
    }

    const access = assertAdminUser(authUser)
    if (!access.ok) {
      return res.status(access.status).json({ error: access.code, message: access.message })
    }

    const tab = normalizeTab(req.query?.tab)
    const q = String(req.query?.q || '').trim()
    const qField = normalizeQueryField(req.query?.qField)
    const page = normalizePage(req.query?.page, 1)
    const pageSize = Math.min(normalizePage(req.query?.pageSize, 20), 100)

    const statuses = TAB_STATUS_MAP[tab]
    const { data, error } = await supabaseClient
      .from('booking_orders')
      .select('*')
      .in('booking_status', statuses)
      .order('pickup_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const fallbackCarNumberById = await fetchFallbackCarNumbers({ supabaseClient, rows: data })

    const items = (Array.isArray(data) ? data : [])
      .map((row) => toAdminBookingItem(row, fallbackCarNumberById))
      .filter((item) => matchesSearch({
        publicReservationCode: item.reservationNumber,
        customerName: item.customerName,
        pricingSnapshot: {
          carNumber: item.carNumber,
        },
      }, qField, q))

    const start = (page - 1) * pageSize
    const pagedItems = items.slice(start, start + pageSize)

    return res.status(200).json({
      items: pagedItems,
      page,
      pageSize,
      total: items.length,
      filters: {
        tab,
        q,
        qField,
      },
    })
  } catch (error) {
    return res.status(500).json({
      error: 'admin_bookings_failed',
      message: error?.message || 'admin_bookings_failed',
    })
  }
}
