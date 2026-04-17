#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

const projectRoot = path.resolve(__dirname, '..')
const sourcePath = path.resolve(projectRoot, 'supabase/reference/delivery-cost-list.json')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function resolveSupabaseUrl() {
  return process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_REF ? `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co` : '')
}

function resolveSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
}

function chunk(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

async function main() {
  loadEnvFile(path.resolve(projectRoot, '.env'))

  const url = resolveSupabaseUrl()
  const key = resolveSupabaseKey()

  if (!url || !key) {
    throw new Error('supabase env missing')
  }

  const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  const rows = Array.isArray(raw.regions)
    ? raw.regions.map((region) => ({
        province_id: Number(region.provinceId),
        province_name: region.province || '',
        city_id: Number(region.cityId),
        city_name: region.city || '',
        dong_id: Number(region.dongId),
        dong_name: region.dong || '',
        full_label: [region.province, region.city, region.dong].filter(Boolean).join(' '),
        round_trip_price: Number(region.roundTrip || 0),
        active: true,
        metadata: { source: 'partner-delivery-cost-list' },
      }))
    : []

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: deleteError } = await supabase.from('delivery_regions').delete().neq('dong_id', -1)
  if (deleteError) {
    throw deleteError
  }

  for (const batch of chunk(rows, 200)) {
    const { error } = await supabase.from('delivery_regions').insert(batch)
    if (error) {
      throw error
    }
  }

  console.log(JSON.stringify({ inserted: rows.length }, null, 2))
}

main().catch((error) => {
  console.error('[sync-delivery-regions] failed')
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})
