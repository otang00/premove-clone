'use strict'

const { createServerPrivilegedClient, createServerPublicClient } = require('../../server/supabase/createServerClient')
const { getAccessTokenFromRequest } = require('../../server/auth/getAccessTokenFromRequest')
const { getUserFromAccessToken } = require('../../server/auth/getUserFromAccessToken')
const { ensureProfileForUser, serializeProfile } = require('../../server/auth/ensureProfileForUser')
const { sendSolapiMessage } = require('../../server/sms/sendSolapiMessage')
const {
  OTP_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  VERIFIED_TOKEN_TTL_SECONDS,
  generateOtpCode,
  generateVerificationToken,
  getPhoneLast4,
  hashOtpValue,
  isSolapiConfigured,
  isValidMobilePhone,
  normalizePhoneNumber,
} = require('../../server/auth/phoneOtp')

function getBody(req) {
  return typeof req.body === 'object' && req.body !== null ? req.body : {}
}

function getRoute(req) {
  const slug = req.query?.slug
  if (Array.isArray(slug)) return slug.join('/')
  return String(slug || '').trim()
}

function getPasswordChecks(password, email) {
  return {
    length: password.length >= 8,
    english: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    noSpace: !/\s/.test(password),
    notEmail: email ? password !== email : true,
  }
}

async function handleAuthMe(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const supabaseClient = createServerPrivilegedClient()
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

async function handleOtpSend(req, res) {
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

  const payload = getBody(req)
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
      .select('id')
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

async function handleOtpVerify(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = getBody(req)
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
    return res.status(400).json({
      error: 'otp_already_verified',
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

async function handleSignup(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = getBody(req)
  const name = String(payload.name || '').trim()
  const birthDate = String(payload.birthDate || '').replace(/\D/g, '').slice(0, 8)
  const email = String(payload.email || '').trim().toLowerCase()
  const password = String(payload.password || '')
  const passwordConfirm = String(payload.passwordConfirm || '')
  const phone = normalizePhoneNumber(payload.phone)
  const postalCode = String(payload.postalCode || '').replace(/\D/g, '').slice(0, 5)
  const addressMain = String(payload.addressMain || '').trim()
  const addressDetail = String(payload.addressDetail || '').trim()
  const redirectTo = String(payload.redirectTo || '/login').trim()
  const phoneVerificationId = String(payload.phoneVerificationId || '').trim()
  const phoneVerificationToken = String(payload.phoneVerificationToken || '').trim()
  const agreeTerms = Boolean(payload.agreeTerms)
  const agreePrivacy = Boolean(payload.agreePrivacy)
  const agreeRental = Boolean(payload.agreeRental)
  const agreeAge = Boolean(payload.agreeAge)
  const agreeMarketing = Boolean(payload.agreeMarketing)

  if (name.length < 2) {
    return res.status(400).json({ error: 'invalid_name', message: '이름을 2자 이상 입력해 주세요.' })
  }

  if (!/^\d{8}$/.test(birthDate)) {
    return res.status(400).json({ error: 'invalid_birth_date', message: '생년월일 8자리를 입력해 주세요.' })
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'invalid_email', message: '이메일을 확인해 주세요.' })
  }

  const passwordChecks = getPasswordChecks(password, email)
  if (password !== passwordConfirm) {
    return res.status(400).json({ error: 'password_mismatch', message: '비밀번호 확인이 일치하지 않습니다.' })
  }
  if (!Object.values(passwordChecks).every(Boolean)) {
    return res.status(400).json({ error: 'invalid_password', message: '비밀번호 조건을 확인해 주세요.' })
  }

  if (!isValidMobilePhone(phone)) {
    return res.status(400).json({ error: 'invalid_phone', message: '휴대폰 번호를 확인해 주세요.' })
  }

  if (!/^\d{5}$/.test(postalCode) || !addressMain || !addressDetail) {
    return res.status(400).json({ error: 'invalid_address', message: '주소를 모두 입력해 주세요.' })
  }

  if (!(agreeTerms && agreePrivacy && agreeRental && agreeAge)) {
    return res.status(400).json({ error: 'terms_required', message: '필수 약관 동의가 필요합니다.' })
  }

  if (!phoneVerificationId || !phoneVerificationToken) {
    return res.status(400).json({ error: 'phone_verification_required', message: '휴대폰 인증을 완료해 주세요.' })
  }

  const publicClient = createServerPublicClient()
  const privilegedClient = createServerPrivilegedClient()
  if (!publicClient || !privilegedClient) {
    return res.status(500).json({ error: 'supabase_client_unavailable', message: '가입 설정이 준비되지 않았습니다.' })
  }

  const { data: verification, error: verificationError } = await privilegedClient
    .from('phone_verifications')
    .select('*')
    .eq('id', phoneVerificationId)
    .maybeSingle()

  if (verificationError) {
    return res.status(500).json({ error: 'phone_verification_lookup_failed', message: '휴대폰 인증 상태 확인에 실패했습니다.' })
  }

  const tokenHash = hashOtpValue(`verify:${phoneVerificationToken}`)
  const nowIso = new Date().toISOString()
  if (!verification
    || verification.phone !== phone
    || verification.purpose !== 'signup'
    || verification.status !== 'verified'
    || !verification.verified_at
    || verification.consumed_at
    || verification.verification_token_hash !== tokenHash
    || (verification.expires_at && verification.expires_at < nowIso)) {
    return res.status(400).json({ error: 'phone_verification_invalid', message: '휴대폰 인증을 다시 진행해 주세요.' })
  }

  const { data: existingProfile, error: existingProfileError } = await privilegedClient
    .from('profiles')
    .select('id, email, profile_status')
    .eq('phone', phone)
    .limit(1)
    .maybeSingle()

  if (existingProfileError) {
    return res.status(500).json({ error: 'profile_lookup_failed', message: '기존 회원 확인에 실패했습니다.' })
  }

  if (existingProfile && existingProfile.email !== email) {
    return res.status(409).json({ error: 'phone_already_registered', message: '이미 가입에 사용된 휴대폰 번호입니다.' })
  }

  const origin = req.headers.origin || `https://${req.headers.host}`
  const emailRedirectTo = redirectTo.startsWith('http')
    ? redirectTo
    : redirectTo.startsWith('/')
      ? `${origin}${redirectTo}`
      : `${origin}/login`

  const { data, error } = await publicClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        name,
        birth_date: birthDate,
        phone,
        postal_code: postalCode,
        address_main: addressMain,
        address_detail: addressDetail,
        marketing_agree: agreeMarketing,
        phone_verified: true,
        phone_verified_at: verification.verified_at,
      },
    },
  })

  if (error) {
    return res.status(400).json({ error: 'signup_failed', message: error.message || '회원가입에 실패했습니다.' })
  }

  const userId = data?.user?.id
  if (!userId) {
    return res.status(500).json({ error: 'signup_user_missing', message: '가입 사용자 정보를 확인할 수 없습니다.' })
  }

  const { error: profileUpsertError } = await privilegedClient
    .from('profiles')
    .upsert({
      id: userId,
      email,
      name,
      birth_date: birthDate,
      phone,
      phone_verified: true,
      phone_verified_at: verification.verified_at,
      postal_code: postalCode,
      address_main: addressMain,
      address_detail: addressDetail,
      marketing_agree: agreeMarketing,
      profile_status: 'pending_email_verification',
    }, { onConflict: 'id' })

  if (profileUpsertError) {
    return res.status(500).json({ error: 'profile_upsert_failed', message: '회원 프로필 저장에 실패했습니다.' })
  }

  const { error: consumeError } = await privilegedClient
    .from('phone_verifications')
    .update({
      status: 'consumed',
      consumed_at: nowIso,
    })
    .eq('id', verification.id)

  if (consumeError) {
    return res.status(500).json({ error: 'phone_verification_consume_failed', message: '인증 상태 마무리에 실패했습니다.' })
  }

  return res.status(200).json({
    requiresEmailVerification: !data.session,
    message: data.session
      ? '회원가입이 완료되었습니다.'
      : '회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.',
  })
}

module.exports = async function handler(req, res) {
  const route = getRoute(req)

  if (route === 'me') {
    return handleAuthMe(req, res)
  }

  if (route === 'signup') {
    return handleSignup(req, res)
  }

  if (route === 'otp/send') {
    return handleOtpSend(req, res)
  }

  if (route === 'otp/verify') {
    return handleOtpVerify(req, res)
  }

  return res.status(404).json({ error: 'not_found' })
}
