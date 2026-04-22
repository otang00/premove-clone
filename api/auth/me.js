'use strict'

const { createServerClient } = require('../../server/supabase/createServerClient')
const { getAccessTokenFromRequest } = require('../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../server/auth/getUserFromAccessToken')
const { ensureProfileForUser, serializeProfile } = require('../../server/auth/ensureProfileForUser')

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

    const profile = await ensureProfileForUser({ supabaseClient, authUser })

    return res.status(200).json({
      user: {
        id: authUser.id,
        email: authUser.email || null,
      },
      profile: serializeProfile(profile),
    })
  } catch (error) {
    return res.status(500).json({
      error: 'auth_me_failed',
      message: error?.message || 'auth_me_failed',
    })
  }
}
