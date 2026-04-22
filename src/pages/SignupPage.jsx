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

export default function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, isAuthenticated, isSupabaseClientReady } = useAuth()
  const redirectTo = useMemo(() => resolveRedirectTo(location.search), [location.search])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [loading, isAuthenticated, navigate, redirectTo])

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

    setSuccessMessage('회원가입 요청이 완료되었습니다. 이메일 인증이 필요한 설정이면 메일함을 확인해주세요.')
    setSubmitting(false)
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>회원가입</h1>
              <p className="small-note" style={{ marginTop: 8 }}>
                이메일과 비밀번호로 계정을 생성합니다. 완료 후 예약내역으로 이동하거나 이메일 인증을 안내합니다.
              </p>
            </div>

            <form className="stack-form stack-form-centered" onSubmit={handleSubmit}>
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
              <div className="field-group">
                <label className="field-label" htmlFor="signup-password">비밀번호</label>
                <input
                  id="signup-password"
                  className="field-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호 6자 이상"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting || !isSupabaseClientReady}
                  required
                  minLength={6}
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="signup-password-confirm">비밀번호 확인</label>
                <input
                  id="signup-password-confirm"
                  className="field-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호 다시 입력"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  disabled={submitting || !isSupabaseClientReady}
                  required
                  minLength={6}
                />
              </div>

              {errorMessage ? <p className="field-note" style={{ color: '#be123c' }}>{errorMessage}</p> : null}
              {successMessage ? <p className="field-note" style={{ color: '#166534' }}>{successMessage}</p> : null}

              <button className="btn btn-dark btn-md btn-block" type="submit" disabled={submitting || loading || !isSupabaseClientReady}>
                {submitting ? '회원가입 중...' : '회원가입'}
              </button>
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
