import { Link } from 'react-router-dom'

const HEADER_ACTIONS = [
  { to: '/login', label: '로그인', className: 'landing-header-link' },
  { to: '/signup', label: '회원가입', className: 'landing-header-link' },
  { to: '/guest-bookings', label: '비회원 예약조회', className: 'landing-header-button' },
]

export default function BrandHeader({ brandName }) {
  return (
    <header className="landing-header">
      <div className="container landing-header-inner simple-brand-header with-actions">
        <Link className="landing-brand-name styled-brand" to="/" aria-label={brandName}>
          <img src="/bbang-wordmark.png" alt={brandName} className="landing-brand-wordmark" />
        </Link>
        <nav className="landing-header-actions" aria-label="회원 및 예약 조회">
          {HEADER_ACTIONS.map((action) => (
            <Link key={action.to} className={action.className} to={action.to}>
              {action.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
