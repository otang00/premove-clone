import { Navigate, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CarsPage from './pages/CarsPage'
import PlaceholderPage from './pages/PlaceholderPage'
import LegalPage from './pages/LegalPage'
import GuestBookingsPage from './pages/GuestBookingsPage'
import ReservationCompletePage from './pages/ReservationCompletePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MemberReservationsPage from './pages/MemberReservationsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />
      <Route path="/cars" element={<CarsPage />} />
      <Route path="/cars/:carId" element={<LandingPage />} />
      <Route path="/reservations" element={<MemberReservationsPage />} />
      <Route path="/guest-bookings" element={<GuestBookingsPage />} />
      <Route path="/reservation-complete" element={<ReservationCompletePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/faq" element={<PlaceholderPage title="FAQ" />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
      <Route path="/special-terms" element={<LegalPage kind="special" />} />
    </Routes>
  )
}
