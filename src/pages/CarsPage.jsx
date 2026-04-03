import { Navigate, useLocation } from 'react-router-dom'

export default function CarsPage() {
  const location = useLocation()
  return <Navigate to={`/${location.search || ''}`} replace />
}
