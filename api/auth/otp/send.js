'use strict'

const { createServerPrivilegedClient } = require('../../../server/supabase/createServerClient')
const { sendSolapiMessage } = require('../../../server/sms/sendSolapiMessage')
const {
  OTP_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  generateOtpCode,
  getPhoneLast4,
  hashOtpValue,
  isSolapiConfigured,
  isValidMobilePhone,
  normalizePhoneNumber,
} = require('../../../server/auth/phoneOtp')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (!isSolapiConfigured()) {
    return res.status(503).json({
      error: 'otp_provider_unavailable',
      message: '문자 인증 설정이 아직 준비되지 않았습니다.',
    })
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {}
  const purpose = String(payload.purpose || 'signup').trim() || 'signup'
  const phone = normalizePhoneNumber(payload.phone)

  if (purpose !== 'signup') {
    return res.status(400).json({ error: 'invalid_purpose', message: '지원하지 않는 인증 목적입니다.' })
  }

  if (!isValidMobilePhone(phone)) {
    return res.status(400).json({ error: 'invalid_phone', message: '휴대폰 번호를 확인해 주세요.' })
  }

  const supabaseClient = createServerPrivilegedClient()
  if (!supabaseClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable' })
  }

  const nowIso = new Date().toISOString()
  const { data: latest, error: latestError } = await supabaseClient
    .from('phone_verifications')
    .select('id, cooldown_until, verified_at')
    .eq('phone', phone)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    return res.status(500).json({ error: 'otp_lookup_failed', message: '인증 상태 확인에 실패했습니다.' })
  }

  if (latest?.cooldown_until && latest.cooldown_until > nowIso) {
    const cooldownSeconds = Math.max(1, Math.ceil((new Date(latest.cooldown_until).getTime() - Date.now()) / 1000))
    return res.status(429).json({
      error: 'otp_cooldown',
      message: `인증번호는 ${cooldownSeconds}초 후 다시 요청할 수 있습니다.`,
      cooldownSeconds,
    })
  }

  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString()
  const cooldownUntil = new Date(Date.now() + OTP_COOLDOWN_SECONDS * 1000).toISOString()

  try {
    const smsResult = await sendSolapiMessage({
      to: phone,
      text: `[00렌트카] 인증번호는 ${code} 입니다. 3분 내에 입력해 주세요.`,
    })

    const { data, error } = await supabaseClient
      .from('phone_verifications')
      .insert({
        phone,
        phone_last4: getPhoneLast4(phone),
        purpose,
        otp_code_hash: hashOtpValue(`${purpose}:${phone}:${code}`),
        status: 'pending',
        attempt_count: 0,
        max_attempts: OTP_MAX_ATTEMPTS,
        cooldown_until: cooldownUntil,
        expires_at: expiresAt,
        requested_at: nowIso,
        message_id: smsResult.messageId,
      })
      .select('id, expires_at, cooldown_until')
      .single()

    if (error) {
      return res.status(500).json({ error: 'otp_save_failed', message: '인증번호 저장에 실패했습니다.' })
    }

    return res.status(200).json({
      verificationId: data.id,
      expiresInSeconds: OTP_TTL_SECONDS,
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
      message: '인증번호를 발송했습니다.',
    })
  } catch (error) {
    return res.status(500).json({
      error: 'otp_send_failed',
      message: error?.message || '인증번호 발송에 실패했습니다.',
    })
  }
}
