'use strict'

const fs = require('node:fs')
const path = require('node:path')

const SAMPLE_SEARCHES = [
  { id: 'S01', search: { deliveryDateTime: '2026-04-16 10:00', returnDateTime: '2026-04-17 10:00', pickupOption: 'pickup', driverAge: 26, order: 'lower', dongId: null, deliveryAddress: '' } },
  { id: 'S02', search: { deliveryDateTime: '2026-04-18 09:00', returnDateTime: '2026-04-20 09:00', pickupOption: 'pickup', driverAge: 26, order: 'higher', dongId: null, deliveryAddress: '' } },
  { id: 'S03', search: { deliveryDateTime: '2026-04-19 12:00', returnDateTime: '2026-04-21 12:00', pickupOption: 'pickup', driverAge: 26, order: 'newer', dongId: null, deliveryAddress: '' } },
  { id: 'S04', search: { deliveryDateTime: '2026-04-22 08:00', returnDateTime: '2026-04-27 08:00', pickupOption: 'pickup', driverAge: 26, order: 'lower', dongId: null, deliveryAddress: '' } },
  { id: 'S05', search: { deliveryDateTime: '2026-04-25 14:00', returnDateTime: '2026-05-05 14:00', pickupOption: 'pickup', driverAge: 26, order: 'lower', dongId: null, deliveryAddress: '' } },
  { id: 'S06', search: { deliveryDateTime: '2026-04-23 11:00', returnDateTime: '2026-04-24 11:00', pickupOption: 'pickup', driverAge: 21, order: 'lower', dongId: null, deliveryAddress: '' } },
  { id: 'S07', search: { deliveryDateTime: '2026-04-16 10:00', returnDateTime: '2026-04-17 10:00', pickupOption: 'delivery', driverAge: 26, order: 'lower', dongId: 1111010100, deliveryAddress: '서울 종로구 청운동' } },
  { id: 'S08', search: { deliveryDateTime: '2026-04-16 14:00', returnDateTime: '2026-04-16 20:00', pickupOption: 'delivery', driverAge: 26, order: 'lower', dongId: 1168010300, deliveryAddress: '서울 강남구 삼성동' } },
  { id: 'S09', search: { deliveryDateTime: '2026-04-19 09:00', returnDateTime: '2026-04-21 09:00', pickupOption: 'delivery', driverAge: 26, order: 'higher', dongId: 1159010800, deliveryAddress: '서울 동작구 흑석동' } },
  { id: 'S10', search: { deliveryDateTime: '2026-04-24 15:00', returnDateTime: '2026-05-01 15:00', pickupOption: 'delivery', driverAge: 21, order: 'lower', dongId: 1174010100, deliveryAddress: '경기도 성남시 분당구 분당동' } },
  { id: 'S11', search: { deliveryDateTime: '2026-04-17 18:00', returnDateTime: '2026-04-18 12:00', pickupOption: 'delivery', driverAge: 26, order: 'newer', dongId: 1120011400, deliveryAddress: '서울 성북구 정릉동' } },
  { id: 'S12', search: { deliveryDateTime: '2026-04-20 13:00', returnDateTime: '2026-04-21 13:00', pickupOption: 'delivery', driverAge: 21, order: 'higher', dongId: 1154510800, deliveryAddress: '서울 금천구 가산동' } },
]

function buildKey(params = {}) {
  return [
    params.deliveryDateTime,
    params.returnDateTime,
    params.pickupOption,
    params.driverAge,
    params.order,
    params.dongId == null ? '' : String(params.dongId),
    params.deliveryAddress || '',
  ].join('|')
}

const samplesByKey = new Map()
for (const sample of SAMPLE_SEARCHES) {
  samplesByKey.set(buildKey(sample.search), sample)
}

function parseLine(line) {
  if (!line || !line.trim()) return null
  try {
    return JSON.parse(line)
  } catch (error) {
    console.error('[analyze] failed to parse line', error.message)
    return null
  }
}

function summarizeEntry(entry) {
  const key = buildKey(entry.search_params || {})
  const sample = samplesByKey.get(key)
  return {
    id: sample ? sample.id : 'UNKNOWN',
    searchKey: key,
    partnerCount: entry.partner?.totalCount ?? null,
    dbCount: entry.db?.totalCount ?? null,
    resultDelta: entry.diff?.resultCountDelta ?? null,
    missingCount: entry.diff?.missingInDb?.length || 0,
    extraCount: entry.diff?.extraInDb?.length || 0,
    orderIssues: entry.diff?.orderVariance?.length || 0,
    priceIssues: entry.diff?.priceDiffs?.length || 0,
  }
}

function collectStats(entries) {
  const perSample = {}

  for (const entry of entries) {
    if (!entry) continue
    const summary = summarizeEntry(entry)
    perSample[summary.id] = summary
  }

  const stats = {
    totalEntries: entries.length,
    missingOnly: 0,
    zeroDbCount: 0,
    zeroPartnerCount: 0,
    noOverlap: 0,
  }

  for (const summary of Object.values(perSample)) {
    if (!summary) continue
    if ((summary.dbCount || 0) === 0) {
      stats.zeroDbCount += 1
    }
    if ((summary.partnerCount || 0) === 0) {
      stats.zeroPartnerCount += 1
    }
    if (summary.missingCount > 0 && summary.extraCount === 0) {
      stats.missingOnly += 1
    }
    if (summary.missingCount > 0 && summary.extraCount > 0) {
      stats.noOverlap += 1
    }
  }

  return { perSample, stats }
}

function main() {
  const logPath = process.argv[2] || path.resolve(__dirname, '..', 'supabase/.temp/shadow-log.phase4a.jsonl')
  const file = fs.readFileSync(logPath, 'utf8')
  const lines = file.split('\n')
  const entries = lines.map(parseLine).filter(Boolean)
  const { perSample, stats } = collectStats(entries)

  console.log(JSON.stringify({ perSample, stats }, null, 2))
}

main()
