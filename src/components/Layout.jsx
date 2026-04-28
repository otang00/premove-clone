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

  return (
    <footer className="footer minimal-footer">
      <div className="container footer-inner footer-cafe24-like">
        <div className="footer-links small-links footer-policy-links">
          <Link className="footer-link-button" to="/terms">서비스 이용약관</Link>
          <Link className="footer-link-button" to="/privacy">개인정보 처리방침</Link>
          <Link className="footer-link-button" to="/special-terms">렌터카 이용약관</Link>
        </div>
        <div className="footer-copy compact-copy footer-company-block">
          <div className="footer-company-main">
            <section className="footer-company-left">
              <img src="/bbang-logo-square.png" alt="빵빵카 로고" className="brand-logo footer-logo" />

              <div className="footer-text-group footer-info-group">
                <strong className="footer-section-title">쇼핑몰 기본정보</strong>
                <div className="footer-info-list">
                  <p><span className="footer-label">상호명</span><span>{company.name}</span></p>
                  <p><span className="footer-label">대표자명</span><span>{company.representative}</span></p>
                  <p><span className="footer-label">사업장 주소</span><span>{company.address}</span></p>
                  <p><span className="footer-label">사업자등록번호</span><span>{company.businessNumber}</span></p>
                </div>
              </div>
            </section>

            <section className="footer-company-right">
              <div className="footer-text-group">
                <strong className="footer-section-title">고객센터 정보</strong>
                <p><strong>회사 대표전화</strong> {company.phone}</p>
                <p><strong>상담/주문전화</strong> {landingNotice.phone}</p>
                <p><strong>상담/주문 이메일</strong> rentcar00@daum.net</p>
                <p><strong>카카오톡</strong> {landingNotice.kakaoId}</p>
                <p><strong>CS운영시간</strong> 평일 오전 9시 - 오후 6시</p>
                <p>점심시간 오후 12시 - 오후 1시</p>
                <p>공휴일 휴무</p>
              </div>

              <div className="footer-text-group">
                <strong className="footer-section-title">결제 정보</strong>
                <p><strong>무통장 계좌정보</strong></p>
                <p>하나은행 360-890004-02504 빵빵카(주)</p>
              </div>

              <div className="footer-text-group">
                <strong className="footer-section-title">SNS</strong>
                <p><a href="https://instagram.com/00rentcar" target="_blank" rel="noreferrer">instagram</a></p>
                <p><a href="https://pf.kakao.com/_SZcVn/chat" target="_blank" rel="noreferrer">kakao</a></p>
              </div>
            </section>
          </div>

          <div className="footer-copyright">Copyright © 빵빵카(주). All Rights Reserved.</div>
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
