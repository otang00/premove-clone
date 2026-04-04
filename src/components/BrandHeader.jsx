import { Link } from 'react-router-dom'

export default function BrandHeader({ brandName }) {
  return (
    <header className="landing-header">
      <div className="container landing-header-inner centered-header simple-brand-header">
        <Link className="landing-brand-name styled-brand" to="/" aria-label={brandName}>
          <img src="/bbang-wordmark.png" alt={brandName} className="landing-brand-wordmark" />
        </Link>
      </div>
    </header>
  )
}
