import { Link } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { loading, isAuthenticated, isSupabaseClientReady, user } = useAuth()

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>로그인</h1>
              <p className="small-note" style={{ marginTop: 8 }}>
                이메일 + 비밀번호 로그인 UI를 붙이기 전 단계입니다. 현재는 AuthContext, Supabase client, 라우팅 뼈대만 준비된 상태입니다.
              </p>
            </div>

            <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
              <div className="reservation-result-row"><span>상태</span><strong>{loading ? '세션 확인 중' : isAuthenticated ? '로그인됨' : '비로그인'}</strong></div>
              <div className="reservation-result-row"><span>Supabase client</span><strong>{isSupabaseClientReady ? '준비됨' : 'env 키 필요'}</strong></div>
              <div className="reservation-result-row"><span>현재 사용자</span><strong>{user?.email || '-'}</strong></div>
            </div>

            <div className="stack-form stack-form-centered">
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">이메일</label>
                <input id="login-email" className="field-input" placeholder="준비 단계" disabled />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="login-password">비밀번호</label>
                <input id="login-password" className="field-input" type="password" placeholder="준비 단계" disabled />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-dark btn-md" disabled>로그인 준비 중</button>
              <Link className="btn btn-outline btn-md" to="/signup">회원가입</Link>
              <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
            </div>

            <div className="legal-note" style={{ marginTop: 0 }}>
              다음 단계에서 이메일 + 비밀번호 로그인, 비밀번호 재설정, 보호 API를 순서대로 붙입니다.
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
