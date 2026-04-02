import { Link } from 'react-router-dom'

export default function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>준비 중입니다.</p>
      <Link to="/">메인으로</Link>
    </div>
  )
}
