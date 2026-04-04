import { Navigate, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CarsPage from './pages/CarsPage'
import CarDetailPage from './pages/CarDetailPage'
import PlaceholderPage from './pages/PlaceholderPage'
import LegalPage from './pages/LegalPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />
      <Route path="/cars" element={<CarsPage />} />
      <Route path="/cars/:carId" element={<CarDetailPage />} />
      <Route path="/reservations" element={<PlaceholderPage title="예약내역" />} />
      <Route path="/faq" element={<PlaceholderPage title="FAQ" />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
      <Route path="/special-terms" element={<LegalPage kind="special" />} />
    </Routes>
  )
}
