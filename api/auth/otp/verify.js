'use strict'

const { createServerPrivilegedClient } = require('../../../server/supabase/createServerClient')
const {
  OTP_MAX_ATTEMPTS,
  VERIFIED_TOKEN_TTL_SECONDS,
  generateVerificationToken,
  hashOtpValue,
  isValidMobilePhone,
  normalizePhoneNumber,
} = require('../../../server/auth/phoneOtp')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {}
  const verificationId = String(payload.verificationId || '').trim()
  const purpose = String(payload.purpose || 'signup').trim() || 'signup'
  const phone = normalizePhoneNumber(payload.phone)
  const code = String(payload.code || '').replace(/\D/g, '').slice(0, 6)

  if (!verificationId) {
    return res.status(400).json({ error: 'missing_verification_id', message: '인증 요청을 먼저 진행해 주세요.' })
  }

  if (purpose !== 'signup') {
    return res.status(400).json({ error: 'invalid_purpose', message: '지원하지 않는 인증 목적입니다.' })
  }

  if (!isValidMobilePhone(phone)) {
    return res.status(400).json({ error: 'invalid_phone', message: '휴대폰 번호를 확인해 주세요.' })
  }

  if (code.length !== 6) {
    return res.status(400).json({ error: 'invalid_code', message: '인증번호 6자리를 입력해 주세요.' })
  }

  const supabaseClient = createServerPrivilegedClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  const { data: verification, error } = await supabaseClient
    .from('phone_verifications')
    .select('*')
    .eq('id', verificationId)
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: 'otp_lookup_failed', message: '인증 상태 확인에 실패했습니다.' })
  }

  if (!verification || verification.phone !== phone || verification.purpose !== purpose) {
    return res.status(404).json({ error: 'otp_not_found', message: '유효한 인증 요청을 찾을 수 없습니다.' })
  }

  if (verification.verified_at) {
    return res.status(200).json({
      verificationId: verification.id,
      verificationToken: null,
      message: '이미 인증 완료된 번호입니다. 다시 인증번호를 요청해 주세요.',
    })
  }

  if (verification.expires_at && verification.expires_at < new Date().toISOString()) {
    await supabaseClient
      .from('phone_verifications')
      .update({ status: 'expired' })
      .eq('id', verification.id)

    return res.status(400).json({ error: 'otp_expired', message: '인증번호가 만료되었습니다. 다시 요청해 주세요.' })
  }

  if (verification.attempt_count >= (verification.max_attempts || OTP_MAX_ATTEMPTS)) {
    await supabaseClient
      .from('phone_verifications')
      .update({ status: 'blocked' })
      .eq('id', verification.id)

    return res.status(429).json({ error: 'otp_blocked', message: '인증 시도 횟수를 초과했습니다. 다시 요청해 주세요.' })
  }

  const expectedHash = hashOtpValue(`${purpose}:${phone}:${code}`)
  if (verification.otp_code_hash !== expectedHash) {
    const nextAttempts = Number(verification.attempt_count || 0) + 1
    const nextStatus = nextAttempts >= (verification.max_attempts || OTP_MAX_ATTEMPTS) ? 'blocked' : 'pending'

    await supabaseClient
      .from('phone_verifications')
      .update({
        attempt_count: nextAttempts,
        status: nextStatus,
      })
      .eq('id', verification.id)

    return res.status(nextStatus === 'blocked' ? 429 : 400).json({
      error: nextStatus === 'blocked' ? 'otp_blocked' : 'otp_mismatch',
      message: nextStatus === 'blocked'
        ? '인증 시도 횟수를 초과했습니다. 다시 요청해 주세요.'
        : '인증번호가 일치하지 않습니다.',
    })
  }

  const verificationToken = generateVerificationToken()
  const verifiedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + VERIFIED_TOKEN_TTL_SECONDS * 1000).toISOString()

  const { error: updateError } = await supabaseClient
    .from('phone_verifications')
    .update({
      status: 'verified',
      verified_at: verifiedAt,
      expires_at: expiresAt,
      verification_token_hash: hashOtpValue(`verify:${verificationToken}`),
    })
    .eq('id', verification.id)

  if (updateError) {
    return res.status(500).json({ error: 'otp_verify_failed', message: '인증 완료 처리에 실패했습니다.' })
  }

  return res.status(200).json({
    verificationId: verification.id,
    verificationToken,
    message: '휴대폰 인증이 완료되었습니다.',
  })
}
