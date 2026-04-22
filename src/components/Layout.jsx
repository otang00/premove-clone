import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getMockCompany } from '../services/company'
import { isAdminEmail } from '../utils/adminAccess'

export function Header({ variant = 'default', brandName, showGuestBookingAction = false } = {}) {
  const navigate = useNavigate()
  const company = getMockCompany()
  const { isAuthenticated, profile, user, signOut } = useAuth()
  const canAccessAdmin = isAdminEmail(user?.email || profile?.email)
  const resolvedBrandName = brandName || company.name
  const displayIdentity = profile?.name || user?.email || '회원'
  const isLanding = variant === 'landing'

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className={`header app-header ${isLanding ? 'is-landing' : 'is-default'}`}>
      <div className="container app-header__inner">
        <Link className="app-header__brand" to="/" aria-label={resolvedBrandName}>
          {isLanding ? (
            <img src="/bbang-wordmark.png" alt={resolvedBrandName} className="app-header__wordmark" />
          ) : (
            <>
              <img src="/bbang-logo-square.png" alt="빵빵카 로고" className="app-header__logo" />
              <span className="app-header__title">{resolvedBrandName}</span>
            </>
          )}
        </Link>

        <nav className="app-header__nav" aria-label="주요 메뉴">
          <div className="app-header__menu">
            <Link className="app-header__link" to="/reservations">예약내역</Link>
            {showGuestBookingAction && !isAuthenticated ? (
              <Link className="app-header__button is-soft" to="/guest-bookings">비회원 예약조회</Link>
            ) : null}
          </div>

          <div className="app-header__menu app-header__menu--auth">
            <Link className="app-header__link" to="/faq">FAQ</Link>
          {isAuthenticated ? (
            <>
              {canAccessAdmin ? <Link className="app-header__button is-soft" to="/admin/bookings">예약관리</Link> : null}
              <span className="app-header__identity" title={displayIdentity}>{displayIdentity}</span>
              <button className="app-header__button" type="button" onClick={handleSignOut}>로그아웃</button>
            </>
          ) : (
            <>
              <Link className="app-header__link" to="/login">로그인</Link>
              <Link className="app-header__button" to="/signup">회원가입</Link>
            </>
          )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  const company = getMockCompany()

  return (
    <footer className="footer minimal-footer">
      <div className="container footer-inner centered-footer">
        <div className="footer-links small-links centered-links">
          <Link className="footer-link-button" to="/terms">서비스 이용약관</Link>
          <Link className="footer-link-button" to="/privacy">개인정보 처리방침</Link>
          <Link className="footer-link-button" to="/special-terms">렌터카 이용약관</Link>
        </div>
        <div className="footer-copy compact-copy centered-copy">
          <img src="/bbang-logo-square.png" alt="빵빵카 로고" className="brand-logo footer-logo" />
          <strong>{company.name}</strong>
          <p>대표: {company.representative} | 사업자등록번호: {company.businessNumber}</p>
          <p>주소: {company.address}</p>
          <p className="footer-phone">{company.phone}</p>
        </div>
      </div>
    </footer>
  )
}

export function PageShell({ children }) {
  return (
    <div className="page-shell">
      <Header />
      {children}
      <Footer />
    </div>
  )
}
