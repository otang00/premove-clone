'use strict'

async function ensureProfileForUser({ supabaseClient, authUser } = {}) {
  if (!supabaseClient) {
    throw new Error('supabase client is required')
  }

  if (!authUser?.id) {
    throw new Error('auth user is required')
  }

  const payload = {
    id: authUser.id,
    email: authUser.email || null,
    name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
    phone: authUser.phone || null,
    marketing_agree: false,
  }

  const { data, error } = await supabaseClient
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

function serializeProfile(profile = {}) {
  return {
    id: profile.id || null,
    email: profile.email || null,
    name: profile.name || null,
    phone: profile.phone || null,
    marketingAgree: Boolean(profile.marketing_agree),
    createdAt: profile.created_at || null,
    updatedAt: profile.updated_at || null,
  }
}

module.exports = {
  ensureProfileForUser,
  serializeProfile,
}
