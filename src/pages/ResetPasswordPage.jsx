import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

function resolveRedirectTo(searchParams) {
  const redirectTo = searchParams.get('redirectTo') || '/login'
  return redirectTo.startsWith('/') ? redirectTo : '/login'
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, isSupabaseClientReady } = useAuth()
  const redirectTo = useMemo(() => resolveRedirectTo(searchParams), [searchParams])
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (!supabase || !isSupabaseClientReady) {
      setErrorMessage('Supabase 설정이 준비되지 않았습니다.')
      return
    }

    if (!session) {
      setErrorMessage('재설정 세션이 없습니다. 메일의 링크로 다시 접속해주세요.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMessage(error.message || '비밀번호 변경에 실패했습니다.')
      setSubmitting(false)
      return
    }

    setSuccessMessage('비밀번호가 변경되었습니다. 다시 로그인해주세요.')
    setSubmitting(false)
    window.setTimeout(() => {
      navigate(redirectTo, { replace: true })
    }, 1200)
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>새 비밀번호 설정</h1>
              <p className="small-note" style={{ marginTop: 8 }}>
                메일의 재설정 링크로 들어온 뒤 새 비밀번호를 저장합니다.
              </p>
            </div>

            <form className="stack-form stack-form-centered" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label" htmlFor="reset-password">새 비밀번호</label>
                <input
                  id="reset-password"
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
                <label className="field-label" htmlFor="reset-password-confirm">새 비밀번호 확인</label>
                <input
                  id="reset-password-confirm"
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

              <button className="btn btn-dark btn-md btn-block" type="submit" disabled={submitting || !isSupabaseClientReady}>
                {submitting ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="btn btn-outline btn-md" to="/login">로그인으로</Link>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
