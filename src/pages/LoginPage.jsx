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
  if (!error) return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
  if (error.message?.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (error.message?.includes('Email not confirmed')) return '이메일 인증이 아직 완료되지 않았습니다.'
  return error.message || '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, isAuthenticated, isSupabaseClientReady, user } = useAuth()
  const redirectTo = useMemo(() => resolveRedirectTo(location.search), [location.search])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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

    setSubmitting(true)
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setErrorMessage(getErrorMessage(error))
      setSubmitting(false)
      return
    }

    navigate(redirectTo, { replace: true })
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>로그인</h1>
              <p className="small-note" style={{ marginTop: 8 }}>
                이메일과 비밀번호로 로그인합니다. 로그인 후에는 예약내역 페이지로 이동합니다.
              </p>
            </div>

            <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
              <div className="reservation-result-row"><span>상태</span><strong>{loading ? '세션 확인 중' : isAuthenticated ? '로그인됨' : '비로그인'}</strong></div>
              <div className="reservation-result-row"><span>Supabase client</span><strong>{isSupabaseClientReady ? '준비됨' : 'env 키 필요'}</strong></div>
              <div className="reservation-result-row"><span>현재 사용자</span><strong>{user?.email || '-'}</strong></div>
            </div>

            <form className="stack-form stack-form-centered" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">이메일</label>
                <input
                  id="login-email"
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
                <label className="field-label" htmlFor="login-password">비밀번호</label>
                <input
                  id="login-password"
                  className="field-input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting || !isSupabaseClientReady}
                  required
                />
              </div>

              {errorMessage ? <p className="field-note" style={{ color: '#be123c' }}>{errorMessage}</p> : null}

              <button className="btn btn-dark btn-md btn-block" type="submit" disabled={submitting || loading || !isSupabaseClientReady}>
                {submitting ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="btn btn-outline btn-md" to={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}>회원가입</Link>
              <Link className="btn btn-outline btn-md" to={`/forgot-password?redirectTo=${encodeURIComponent(redirectTo)}`}>비밀번호 재설정</Link>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
