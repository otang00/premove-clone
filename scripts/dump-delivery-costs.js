'use strict'

const fs = require('node:fs')
const path = require('node:path')

const handler = require('../api/search-cars')

function createRequest(query) {
  return {
    method: 'GET',
    query,
  }
}

function createResponse() {
  const headers = {}
  let statusCode = 200
  let resolver

  return {
    setHeader(key, value) {
      headers[key] = value
    },
    status(code) {
      statusCode = code
      return this
    },
    json(payload) {
      if (resolver) {
        resolver({ statusCode, headers, payload })
      }
    },
    onResolve(resolve) {
      resolver = resolve
    },
  }
}

async function run() {
  const req = createRequest({
    deliveryDateTime: '2026-04-16 10:00',
    returnDateTime: '2026-04-17 10:00',
    pickupOption: 'pickup',
    driverAge: 26,
    order: 'lower',
  })
  const res = createResponse()
  const resultPromise = new Promise((resolve, reject) => {
    res.onResolve(resolve)
    setTimeout(() => reject(new Error('partner response timeout')), 60000)
  })

  await handler(req, res)
  const result = await resultPromise

  const deliveryCostList = result.payload?.company?.deliveryCostList || []
  const flattened = []

  for (const province of deliveryCostList) {
    for (const city of province.cities || []) {
      for (const dong of city.dongs || []) {
        flattened.push({
          provinceId: province.id,
          province: province.name,
          cityId: city.id,
          city: city.name,
          dongId: dong.id,
          dong: dong.name,
          roundTrip: dong.roundTrip,
        })
      }
    }
  }

  const outputPath = path.resolve(__dirname, '..', 'supabase/.temp/delivery-cost-list.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), total: flattened.length, regions: flattened }, null, 2),
  )

  console.log(`[delivery-costs] saved ${flattened.length} rows to ${outputPath}`)
}

if (require.main === module) {
  run().catch((error) => {
    console.error('[delivery-costs] failed', error)
    process.exit(1)
  })
}
