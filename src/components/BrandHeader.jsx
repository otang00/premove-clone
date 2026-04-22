import { Header } from './Layout'

export default function BrandHeader({ brandName }) {
  return <Header variant="landing" brandName={brandName} showGuestBookingAction />
}
