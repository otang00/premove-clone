'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { createServerClient, resolveSupabaseUrl, resolveSupabaseKey } = require('../createServerClient')

test('resolveSupabaseUrl prefers explicit url', () => {
  const env = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PROJECT_REF: 'ignored',
  }
  assert.equal(resolveSupabaseUrl(env), 'https://example.supabase.co')
})

test('resolveSupabaseKey falls back through candidates', () => {
  const env = {
    SUPABASE_SERVICE_ROLE_KEY: '',
    SUPABASE_SERVICE_KEY: 'service-key',
  }
  assert.equal(resolveSupabaseKey(env), 'service-key')
})

test('createServerClient returns null when config missing', () => {
  assert.equal(createServerClient({ url: '', key: '' }), null)
})
