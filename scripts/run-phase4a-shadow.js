'use strict'

const path = require('node:path')

const handler = require('../api/search-cars')

const SAMPLE_SEARCHES = [
  {
    id: 'S01',
    query: {
      deliveryDateTime: '2026-04-16 10:00',
      returnDateTime: '2026-04-17 10:00',
      pickupOption: 'pickup',
      driverAge: 26,
      order: 'lower',
    },
  },
  {
    id: 'S02',
    query: {
      deliveryDateTime: '2026-04-18 09:00',
      returnDateTime: '2026-04-20 09:00',
      pickupOption: 'pickup',
      driverAge: 26,
      order: 'higher',
    },
  },
  {
    id: 'S03',
    query: {
      deliveryDateTime: '2026-04-19 12:00',
      returnDateTime: '2026-04-21 12:00',
      pickupOption: 'pickup',
      driverAge: 26,
      order: 'newer',
    },
  },
  {
    id: 'S04',
    query: {
      deliveryDateTime: '2026-04-22 08:00',
      returnDateTime: '2026-04-27 08:00',
      pickupOption: 'pickup',
      driverAge: 26,
      order: 'lower',
    },
  },
  {
    id: 'S05',
    query: {
      deliveryDateTime: '2026-04-25 14:00',
      returnDateTime: '2026-05-05 14:00',
      pickupOption: 'pickup',
      driverAge: 26,
      order: 'lower',
    },
  },
  {
    id: 'S06',
    query: {
      deliveryDateTime: '2026-04-23 11:00',
      returnDateTime: '2026-04-24 11:00',
      pickupOption: 'pickup',
      driverAge: 21,
      order: 'lower',
    },
  },
  {
    id: 'S07',
    query: {
      deliveryDateTime: '2026-04-16 10:00',
      returnDateTime: '2026-04-17 10:00',
      pickupOption: 'delivery',
      driverAge: 26,
      order: 'lower',
      dongId: 1111010100,
      deliveryAddress: '서울 종로구 청운동',
    },
  },
  {
    id: 'S08',
    query: {
      deliveryDateTime: '2026-04-16 14:00',
      returnDateTime: '2026-04-16 20:00',
      pickupOption: 'delivery',
      driverAge: 26,
      order: 'lower',
      dongId: 1168010300,
      deliveryAddress: '서울 강남구 삼성동',
    },
  },
  {
    id: 'S09',
    query: {
      deliveryDateTime: '2026-04-19 09:00',
      returnDateTime: '2026-04-21 09:00',
      pickupOption: 'delivery',
      driverAge: 26,
      order: 'higher',
      dongId: 1159010800,
      deliveryAddress: '서울 동작구 흑석동',
    },
  },
  {
    id: 'S10',
    query: {
      deliveryDateTime: '2026-04-24 15:00',
      returnDateTime: '2026-05-01 15:00',
      pickupOption: 'delivery',
      driverAge: 21,
      order: 'lower',
      dongId: 1174010100,
      deliveryAddress: '경기도 성남시 분당구 분당동',
    },
  },
  {
    id: 'S11',
    query: {
      deliveryDateTime: '2026-04-17 18:00',
      returnDateTime: '2026-04-18 12:00',
      pickupOption: 'delivery',
      driverAge: 26,
      order: 'newer',
      dongId: 1120011400,
      deliveryAddress: '서울 성북구 정릉동',
    },
  },
  {
    id: 'S12',
    query: {
      deliveryDateTime: '2026-04-20 13:00',
      returnDateTime: '2026-04-21 13:00',
      pickupOption: 'delivery',
      driverAge: 21,
      order: 'higher',
      dongId: 1154510800,
      deliveryAddress: '서울 금천구 가산동',
    },
  },
]

const DEFAULT_LOG_PATH = path.resolve(__dirname, '..', 'supabase/.temp/shadow-log.phase4a.jsonl')

function ensureEnvDefaults() {
  if (!process.env.SEARCH_SHADOW_ENABLED) {
    process.env.SEARCH_SHADOW_ENABLED = 'true'
  }
  if (!process.env.SEARCH_SHADOW_LOG_PATH) {
    process.env.SEARCH_SHADOW_LOG_PATH = DEFAULT_LOG_PATH
  }
}

function createRequest(query) {
  return {
    method: 'GET',
    query,
  }
}

function createResponse() {
  const headers = {}
  let statusCode = 200

  return {
    setHeader(key, value) {
      headers[key] = value
    },
    status(code) {
      statusCode = code
      return this
    },
    json(payload) {
      this._resolve({ statusCode, headers, payload })
    },
    onResolve(resolve, reject) {
      this._resolve = resolve
      this._reject = reject
    },
  }
}

async function runSingleSample(sample) {
  const req = createRequest(sample.query)
  const res = createResponse()

  const resultPromise = new Promise((resolve, reject) => {
    res.onResolve(resolve, reject)
  })

  try {
    await handler(req, res)
    return { id: sample.id, ...await resultPromise }
  } catch (error) {
    return { id: sample.id, error }
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runAll() {
  ensureEnvDefaults()
  const summary = []

  for (const sample of SAMPLE_SEARCHES) {
    const result = await runSingleSample(sample)
    if (result.error) {
      console.error(`[shadow] ${sample.id} failed`, result.error)
    } else {
      const shadowMeta = result.payload?.meta?.shadow
      console.log(`[shadow] ${sample.id} status=${result.statusCode} shadow=${shadowMeta ? shadowMeta.status : 'off'}`)
      summary.push({
        id: result.id,
        statusCode: result.statusCode,
        shadow: shadowMeta,
        totalCount: result.payload?.totalCount || null,
        search: result.payload?.search || null,
      })
    }
    await delay(750)
  }

  return summary
}

runAll()
  .then((summary) => {
    console.log('\n=== Summary ===')
    for (const item of summary) {
      console.log(`${item.id}: status=${item.statusCode}, shadow=${item.shadow ? item.shadow.status : 'off'}, total=${item.totalCount}`)
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('[shadow] run failed', error)
    process.exit(1)
  })
