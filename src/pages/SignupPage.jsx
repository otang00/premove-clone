import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

function resolveRedirectTo(search) {
  const params = new URLSearchParams(search)
  const redirectTo = params.get('redirectTo') || '/reservations'
  return redirectTo.startsWith('/') ? redirectTo : '/reservations'
}

function getErrorMessage(error) {
  if (!error) return '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.'
  if (error.message?.includes('User already registered')) return '이미 가입된 이메일입니다. 로그인으로 진행해주세요.'
  if (error.message?.includes('Password should be at least')) return '비밀번호는 최소 6자 이상이어야 합니다.'
  return error.message || '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.'
}

function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function formatBirthDate(value) {
  return value.replace(/\D/g, '').slice(0, 8)
}

function getPasswordChecks(password, email) {
  return {
    length: password.length >= 8,
    english: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    noSpace: !/\s/.test(password),
    notEmail: email.trim() ? password !== email.trim() : true,
  }
}

function SectionTitle({ title, description }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      {description ? <p className="small-note" style={{ margin: 0 }}>{description}</p> : null}
    </div>
  )
}

function FieldNote({ children, color = '#6b7280' }) {
  return <p className="field-note" style={{ color, marginTop: 6 }}>{children}</p>
}

export default function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, isAuthenticated, isSupabaseClientReady } = useAuth()
  const redirectTo = useMemo(() => resolveRedirectTo(location.search), [location.search])

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressMain, setAddressMain] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [agreeAll, setAgreeAll] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeRental, setAgreeRental] = useState(false)
  const [agreeAge, setAgreeAge] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [otpMessage, setOtpMessage] = useState('OTP 연동 전 단계입니다. 현재는 UI 자리만 먼저 구성했습니다.')
  const [addressMessage, setAddressMessage] = useState('주소 검색 연동 전 단계입니다. 현재는 입력 영역과 버튼 자리만 먼저 구성했습니다.')

  const passwordChecks = useMemo(() => getPasswordChecks(password, email), [password, email])
  const isPasswordConfirmed = passwordConfirm.length > 0 && password === passwordConfirm
  const requiredTermsAgreed = agreeTerms && agreePrivacy && agreeRental && agreeAge
  const canSubmitCurrentSignup = email.trim() && password && passwordConfirm && password === passwordConfirm && isSupabaseClientReady && !submitting && !loading

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [loading, isAuthenticated, navigate, redirectTo])

  useEffect(() => {
    const nextAll = agreeTerms && agreePrivacy && agreeRental && agreeAge && agreeMarketing
    if (agreeAll !== nextAll) {
      setAgreeAll(nextAll)
    }
  }, [agreeAge, agreeAll, agreeMarketing, agreePrivacy, agreeRental, agreeTerms])

  function handleToggleAllTerms(nextChecked) {
    setAgreeAll(nextChecked)
    setAgreeTerms(nextChecked)
    setAgreePrivacy(nextChecked)
    setAgreeRental(nextChecked)
    setAgreeAge(nextChecked)
    setAgreeMarketing(nextChecked)
  }

  function handleOtpRequest() {
    setOtpMessage('OTP 발송 기능은 다음 단계에서 연결됩니다. 현재는 버튼 위치와 상태 문구만 검토합니다.')
  }

  function handleOtpVerify() {
    setOtpMessage('OTP 확인 기능은 아직 연결되지 않았습니다. 다음 단계에서 API와 연결합니다.')
  }

  function handleFindAddress() {
    setAddressMessage('주소 검색 기능은 다음 단계에서 연결됩니다. 현재는 우편번호/기본주소/상세주소 UI 검토용입니다.')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!supabase || !isSupabaseClientReady) {
      setErrorMessage('Supabase 설정이 준비되지 않았습니다.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (error) {
      setErrorMessage(getErrorMessage(error))
      setSubmitting(false)
      return
    }

    if (data.session) {
      navigate(redirectTo, { replace: true })
      return
    }

    setSuccessMessage('기존 이메일 회원가입은 동작합니다. 아래 추가 회원정보/OTP/주소 영역은 현재 UI 초안 단계입니다.')
    setSubmitting(false)
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 20 }}>
            <div>
              <h1 style={{ margin: 0 }}>회원가입</h1>
              <p className="small-note" style={{ marginTop: 8 }}>
                현재는 기존 이메일 회원가입을 유지하면서, 실서비스형 회원가입 폼 UI 초안을 먼저 확장한 상태입니다.
              </p>
            </div>

            <form className="stack-form stack-form-centered" onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 20 }}>
                <section style={{ display: 'grid', gap: 16 }}>
                  <SectionTitle title="기본정보" description="회원 기본정보 입력 영역입니다. 현재는 폼 구조와 입력 흐름을 먼저 확인합니다." />

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-name">이름</label>
                    <input
                      id="signup-name"
                      className="field-input"
                      type="text"
                      placeholder="홍길동"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-birth-date">생년월일</label>
                    <input
                      id="signup-birth-date"
                      className="field-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="19900101"
                      value={birthDate}
                      onChange={(event) => setBirthDate(formatBirthDate(event.target.value))}
                      disabled={submitting}
                    />
                    <FieldNote>숫자 8자리 입력 기준으로 UI를 먼저 잡습니다.</FieldNote>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-email">이메일</label>
                    <input
                      id="signup-email"
                      className="field-input"
                      type="email"
                      autoComplete="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={submitting || !isSupabaseClientReady}
                      required
                    />
                  </div>
                </section>

                <section style={{ display: 'grid', gap: 16 }}>
                  <SectionTitle title="비밀번호" description="기존 이메일 회원가입 로직은 유지하고, 폼 상호작용을 같이 점검합니다." />

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-password">비밀번호</label>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                        <input
                          id="signup-password"
                          className="field-input"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="영문, 숫자를 포함해 8자 이상"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          disabled={submitting || !isSupabaseClientReady}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="btn btn-outline btn-md"
                          onClick={() => setShowPassword((prev) => !prev)}
                          disabled={submitting || !isSupabaseClientReady}
                        >
                          {showPassword ? '숨기기' : '보기'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gap: 4 }}>
                        <FieldNote color={passwordChecks.length ? '#166534' : '#6b7280'}>{passwordChecks.length ? '✓' : '○'} 8자 이상</FieldNote>
                        <FieldNote color={passwordChecks.english ? '#166534' : '#6b7280'}>{passwordChecks.english ? '✓' : '○'} 영문 포함</FieldNote>
                        <FieldNote color={passwordChecks.number ? '#166534' : '#6b7280'}>{passwordChecks.number ? '✓' : '○'} 숫자 포함</FieldNote>
                        <FieldNote color={passwordChecks.noSpace ? '#166534' : '#be123c'}>{passwordChecks.noSpace ? '✓' : '○'} 공백 없음</FieldNote>
                        <FieldNote color={passwordChecks.notEmail ? '#166534' : '#be123c'}>{passwordChecks.notEmail ? '✓' : '○'} 이메일과 동일하지 않음</FieldNote>
                      </div>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-password-confirm">비밀번호 확인</label>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                        <input
                          id="signup-password-confirm"
                          className="field-input"
                          type={showPasswordConfirm ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="비밀번호 다시 입력"
                          value={passwordConfirm}
                          onChange={(event) => setPasswordConfirm(event.target.value)}
                          disabled={submitting || !isSupabaseClientReady}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="btn btn-outline btn-md"
                          onClick={() => setShowPasswordConfirm((prev) => !prev)}
                          disabled={submitting || !isSupabaseClientReady}
                        >
                          {showPasswordConfirm ? '숨기기' : '보기'}
                        </button>
                      </div>
                      {passwordConfirm ? (
                        <FieldNote color={isPasswordConfirmed ? '#166534' : '#be123c'}>
                          {isPasswordConfirmed ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
                        </FieldNote>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section style={{ display: 'grid', gap: 16 }}>
                  <SectionTitle title="연락처 인증" description="OTP 연동 전이라 현재는 입력 영역과 상태 문구만 먼저 구성했습니다." />

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-phone">휴대폰 번호</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                      <input
                        id="signup-phone"
                        className="field-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="010-0000-0000"
                        value={phone}
                        onChange={(event) => setPhone(formatPhoneNumber(event.target.value))}
                        disabled={submitting}
                      />
                      <button type="button" className="btn btn-outline btn-md" onClick={handleOtpRequest} disabled={submitting}>
                        인증번호 받기
                      </button>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-otp">인증번호</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                      <input
                        id="signup-otp"
                        className="field-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="6자리 숫자 입력"
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={submitting}
                      />
                      <button type="button" className="btn btn-outline btn-md" onClick={handleOtpVerify} disabled={submitting}>
                        확인
                      </button>
                    </div>
                    <FieldNote>남은 시간 03:00</FieldNote>
                    <FieldNote>{otpMessage}</FieldNote>
                  </div>
                </section>

                <section style={{ display: 'grid', gap: 16 }}>
                  <SectionTitle title="주소" description="주소 검색 연동 전이라 현재는 입력 구조와 배치만 먼저 검토합니다." />

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-postal-code">우편번호</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                      <input
                        id="signup-postal-code"
                        className="field-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="우편번호"
                        value={postalCode}
                        onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 5))}
                        disabled={submitting}
                      />
                      <button type="button" className="btn btn-outline btn-md" onClick={handleFindAddress} disabled={submitting}>
                        우편번호 찾기
                      </button>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-address-main">기본주소</label>
                    <input
                      id="signup-address-main"
                      className="field-input"
                      type="text"
                      placeholder="기본주소"
                      value={addressMain}
                      onChange={(event) => setAddressMain(event.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="signup-address-detail">상세주소</label>
                    <input
                      id="signup-address-detail"
                      className="field-input"
                      type="text"
                      placeholder="상세주소"
                      value={addressDetail}
                      onChange={(event) => setAddressDetail(event.target.value)}
                      disabled={submitting}
                    />
                    <FieldNote>{addressMessage}</FieldNote>
                  </div>
                </section>

                <section style={{ display: 'grid', gap: 16 }}>
                  <SectionTitle title="약관 동의" description="필수/선택 구조와 전체 동의 동작을 먼저 확인합니다." />

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={agreeAll}
                      onChange={(event) => handleToggleAllTerms(event.target.checked)}
                      disabled={submitting}
                    />
                    전체 동의
                  </label>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} disabled={submitting} />
                      [필수] 서비스 이용약관 동의
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={agreePrivacy} onChange={(event) => setAgreePrivacy(event.target.checked)} disabled={submitting} />
                      [필수] 개인정보 수집 및 이용 동의
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={agreeRental} onChange={(event) => setAgreeRental(event.target.checked)} disabled={submitting} />
                      [필수] 렌터카 예약 및 대여 조건 동의
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={agreeAge} onChange={(event) => setAgreeAge(event.target.checked)} disabled={submitting} />
                      [필수] 만 26세 이상 및 운전면허 보유 확인
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={agreeMarketing} onChange={(event) => setAgreeMarketing(event.target.checked)} disabled={submitting} />
                      [선택] 마케팅 정보 수신 동의
                    </label>
                  </div>

                  <FieldNote color={requiredTermsAgreed ? '#166534' : '#6b7280'}>
                    {requiredTermsAgreed ? '필수 약관 동의가 완료되었습니다.' : '현재는 필수 약관 체크 UI만 먼저 확인합니다.'}
                  </FieldNote>
                </section>
              </div>

              {errorMessage ? <p className="field-note" style={{ color: '#be123c' }}>{errorMessage}</p> : null}
              {successMessage ? <p className="field-note" style={{ color: '#166534' }}>{successMessage}</p> : null}

              <button className="btn btn-dark btn-md btn-block" type="submit" disabled={!canSubmitCurrentSignup}>
                {submitting ? '회원가입 중...' : '회원가입'}
              </button>

              <FieldNote>
                현재 제출은 기존 이메일 회원가입 기준으로만 동작합니다. 추가 회원정보/OTP/주소 저장 연결은 다음 단계에서 붙입니다.
              </FieldNote>
            </form>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="btn btn-outline btn-md" to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}>로그인</Link>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
