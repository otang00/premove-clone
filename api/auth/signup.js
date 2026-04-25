'use strict'

const { createServerPrivilegedClient, createServerPublicClient } = require('../../server/supabase/createServerClient')
const { hashOtpValue, isValidMobilePhone, normalizePhoneNumber } = require('../../server/auth/phoneOtp')

function getPasswordChecks(password, email) {
  return {
    length: password.length >= 8,
    english: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    noSpace: !/\s/.test(password),
    notEmail: email ? password !== email : true,
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {}
  const name = String(payload.name || '').trim()
  const birthDate = String(payload.birthDate || '').replace(/\D/g, '').slice(0, 8)
  const email = String(payload.email || '').trim().toLowerCase()
  const password = String(payload.password || '')
  const passwordConfirm = String(payload.passwordConfirm || '')
  const phone = normalizePhoneNumber(payload.phone)
  const postalCode = String(payload.postalCode || '').replace(/\D/g, '').slice(0, 5)
  const addressMain = String(payload.addressMain || '').trim()
  const addressDetail = String(payload.addressDetail || '').trim()
  const redirectTo = String(payload.redirectTo || '/reservations').trim()
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

  const { data, error } = await publicClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo.startsWith('/')
        ? `${req.headers.origin || `https://${req.headers.host}`}${redirectTo}`
        : `${req.headers.origin || `https://${req.headers.host}`}/login`,
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
