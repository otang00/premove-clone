'use strict'

const fs = require('fs')
const path = require('path')

function buildPriceSeed(logPath, outputPath) {
  if (!fs.existsSync(logPath)) {
    throw new Error(`shadow log not found: ${logPath}`)
  }

  const content = fs.readFileSync(logPath, 'utf8')
  const lines = content.split(/\n+/)

  const priceMap = new Map()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let entry
    try {
      entry = JSON.parse(trimmed)
    } catch (error) {
      console.warn('skip malformed line')
      continue
    }

    const searchHash = entry.search_hash || null
    const recordedAt = entry.execution_meta?.recordedAt || null
    const pickupOption = entry.search_params?.pickupOption || null
    const searchMeta = {
      source: 'shadow',
    }
    if (searchHash) searchMeta.searchHash = searchHash
    if (pickupOption) searchMeta.pickupOption = pickupOption
    if (recordedAt) searchMeta.recordedAt = recordedAt

    const partnerCars = entry.partner?.cars || []
    for (const car of partnerCars) {
      if (!car || typeof car.carId === 'undefined') continue
      const carIdNum = Number(car.carId)
      if (!Number.isFinite(carIdNum)) continue
      if (priceMap.has(carIdNum)) continue

      priceMap.set(carIdNum, {
        carId: carIdNum,
        basePrice: Number(car.price) || 0,
        discountPrice: Number(car.discountPrice) || 0,
        deliveryPrice: Number(car.deliveryPrice) || 0,
        metadata: searchMeta,
      })
    }
  }

  if (!priceMap.size) {
    throw new Error('no partner cars found in shadow log')
  }

  const sorted = Array.from(priceMap.values()).sort((a, b) => a.carId - b.carId)

  const sqlLines = []
  sqlLines.push('truncate table public.car_prices;')
  sqlLines.push('insert into public.car_prices (car_id, base_price, discount_price, delivery_price, metadata)')
  sqlLines.push('select c.id, v.base_price, v.discount_price, v.delivery_price, v.metadata')
  sqlLines.push('from (')
  sqlLines.push('    values')

  const valueRows = sorted.map(({ carId, basePrice, discountPrice, deliveryPrice, metadata }) => {
    const metaJson = JSON.stringify(metadata).replace(/'/g, "''")
    return `    (${carId}, ${basePrice}, ${discountPrice}, ${deliveryPrice}, '${metaJson}'::jsonb)`
  })

  sqlLines.push(valueRows.join(',\n'))
  sqlLines.push(') as v(source_group_id, base_price, discount_price, delivery_price, metadata)')
  sqlLines.push('join public.cars c on c.source_group_id = v.source_group_id;')
  sqlLines.push('')

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, sqlLines.join('\n'))

  console.log(`Generated ${outputPath} with ${sorted.length} cars from ${logPath}`)
}

if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '..')
  const logPath = process.argv[2] || path.join(projectRoot, 'supabase/.temp/shadow-log.phase4a.jsonl')
  const outputPath = process.argv[3] || path.join(projectRoot, 'supabase/.temp/car_prices_from_shadow.sql')

  try {
    buildPriceSeed(logPath, outputPath)
  } catch (error) {
    console.error('[build-car-price-seed] failed:', error.message)
    process.exit(1)
  }
}

module.exports = { buildPriceSeed }
