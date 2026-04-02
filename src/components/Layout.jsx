import { Link } from 'react-router-dom'
import { company } from '../data/mock'

export function Header() {
  return (
    <header className="header">
      <div className="container header-inner slim header-three-col">
        <Link className="logo logo-image" to="/" aria-label={company.name}>
          <img src="/bbang-logo-square.png" alt="빵빵카 로고" className="brand-logo header-logo" />
        </Link>
        <Link className="header-title" to="/">{company.name}</Link>
        <nav className="nav small header-nav-right">
          <Link to="/reservations">예약내역</Link>
          <Link to="/faq">FAQ</Link>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="footer minimal-footer">
      <div className="container footer-inner centered-footer">
        <div className="footer-links small-links centered-links">
          <Link className="footer-link-button" to="/terms">서비스 이용약관</Link>
          <Link className="footer-link-button" to="/privacy">개인정보 처리방침</Link>
          <Link className="footer-link-button" to="/special-terms">렌터카 이용 특약사항</Link>
        </div>
        <div className="footer-copy compact-copy centered-copy">
          <img src="/bbang-logo-square.png" alt="빵빵카 로고" className="brand-logo footer-logo" />
          <strong>{company.name}</strong>
          <p>대표: 오태진 | 사업자등록번호: 114-86-25134</p>
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
