import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function BrandHeader({ brandName }) {
  const navigate = useNavigate()
  const { isAuthenticated, profile, user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className="landing-header">
      <div className="container landing-header-inner simple-brand-header with-actions">
        <Link className="landing-brand-name styled-brand" to="/" aria-label={brandName}>
          <img src="/bbang-wordmark.png" alt={brandName} className="landing-brand-wordmark" />
        </Link>
        <nav className="landing-header-actions" aria-label="회원 및 예약 조회">
          {isAuthenticated ? (
            <>
              <span className="landing-header-link" style={{ color: '#17212b' }}>{profile?.name || user?.email || '회원'}</span>
              <Link className="landing-header-link" to="/reservations">예약내역</Link>
              <button className="landing-header-button" type="button" onClick={handleSignOut}>로그아웃</button>
            </>
          ) : (
            <>
              <Link className="landing-header-link" to="/login">로그인</Link>
              <Link className="landing-header-link" to="/signup">회원가입</Link>
              <Link className="landing-header-button" to="/guest-bookings">비회원 예약조회</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
