import { Footer } from '../components/Layout'
import BrandHeader from '../components/BrandHeader'
import CarDetailSection from '../components/CarDetailSection'
import TopNoticeBar from '../components/TopNoticeBar'
import { landingNotice } from '../data/landing'

export default function CarDetailPage() {
  return (
    <div className="page-shell landing-shell">
      <TopNoticeBar {...landingNotice} />
      <BrandHeader brandName="빵빵카(주)" />
      <CarDetailSection />
      <Footer />
    </div>
  )
}
