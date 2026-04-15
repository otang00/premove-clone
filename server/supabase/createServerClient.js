'use strict'

const { createClient } = require('@supabase/supabase-js')

function resolveSupabaseUrl(env = process.env) {
  if (env.SUPABASE_URL) {
    return env.SUPABASE_URL.trim()
  }

  if (env.SUPABASE_PROJECT_REF) {
    const ref = env.SUPABASE_PROJECT_REF.trim()
    if (ref) {
      return `https://${ref}.supabase.co`
    }
  }

  return ''
}

function resolveSupabaseKey(env = process.env) {
  const candidates = [
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.SUPABASE_SERVICE_KEY,
    env.SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_ANON_KEY,
  ]

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim()
    }
  }

  return ''
}

function createServerClient(options = {}) {
  const url = (options.url || resolveSupabaseUrl()).trim()
  const key = (options.key || resolveSupabaseKey()).trim()

  if (!url || !key) {
    return null
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': 'premove-shadow-search',
        ...(options.headers || {}),
      },
    },
  })
}

module.exports = {
  createServerClient,
  resolveSupabaseUrl,
  resolveSupabaseKey,
}
