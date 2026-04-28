import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getMockCompany } from '../services/company'
import { isAdminUser } from '../utils/adminAccess'
import { landingNotice } from '../data/landing'

export function Header({ brandName, showGuestBookingAction = true } = {}) {
  const navigate = useNavigate()
  const company = getMockCompany()
  const { isAuthenticated, signOut, user, profile } = useAuth()
  const resolvedBrandName = brandName || company.name
  const isAdmin = isAuthenticated && (isAdminUser(user) || isAdminUser(profile))

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className="header app-header">
      <div className="container app-header__inner">
        <Link className="app-header__brand" to="/" aria-label={resolvedBrandName}>
          <img src="/bbang-wordmark.png" alt={resolvedBrandName} className="app-header__wordmark" />
        </Link>

        <nav className="app-header__nav" aria-label="주요 메뉴">
          <div className="app-header__menu app-header__menu--auth">
          {isAuthenticated ? (
            <>
              <Link className="app-header__button is-soft" to={isAdmin ? '/admin/bookings' : '/reservations'}>
                {isAdmin ? '관리자 예약목록' : '예약목록'}
              </Link>
              <button className="app-header__button" type="button" onClick={handleSignOut}>로그아웃</button>
            </>
          ) : (
            <>
              <Link className="app-header__button is-soft" to="/login">로그인</Link>
              {showGuestBookingAction ? (
                <Link className="app-header__button" to="/guest-bookings">비회원 예약조회</Link>
              ) : null}
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
  const supportItems = [
    { label: '전화상담', value: landingNotice.phone },
    { label: '카카오톡', value: landingNotice.kakaoId },
    { label: '운영시간', value: '평일 09:00 - 18:00' },
    { label: '점심시간', value: '12:00 - 13:00' },
  ]

  return (
    <footer className="footer minimal-footer">
      <div className="container footer-inner centered-footer">
        <div className="footer-links small-links centered-links">
          <Link className="footer-link-button" to="/terms">서비스 이용약관</Link>
          <Link className="footer-link-button" to="/privacy">개인정보 처리방침</Link>
          <Link className="footer-link-button" to="/special-terms">렌터카 이용약관</Link>
        </div>
        <div className="footer-copy compact-copy centered-copy footer-company-block">
          <img src="/bbang-logo-square.png" alt="빵빵카 로고" className="brand-logo footer-logo" />
          <strong>{company.name}</strong>
          <p>대표: {company.representative} | 사업자등록번호: {company.businessNumber}</p>
          <p>주소: {company.address}</p>
          <p className="footer-phone">{company.phone}</p>
        </div>
        <div className="footer-support-block panel-sub">
          <div className="footer-support-block__header">
            <strong>문의 안내</strong>
            <p>상담과 방문 전 확인이 필요한 정보를 정리했습니다.</p>
          </div>
          <div className="footer-support-grid">
            {supportItems.map((item) => (
              <div key={item.label} className="footer-support-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="footer-support-address">
            <span>방문 주소</span>
            <strong>{company.address}</strong>
          </div>
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
