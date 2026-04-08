import { Footer } from '../components/Layout'
import BrandHeader from '../components/BrandHeader'
import CarDetailSection from '../components/CarDetailSection'
import ContactInfoStrip from '../components/ContactInfoStrip'
import TopNoticeBar from '../components/TopNoticeBar'
import { landingContactItems, landingNotice } from '../data/landing'

export default function CarDetailPage() {
  return (
    <div className="page-shell landing-shell">
      <TopNoticeBar {...landingNotice} />
      <BrandHeader brandName="빵빵카(주)" />

      <main className="landing-page">
        <CarDetailSection />
        <ContactInfoStrip items={landingContactItems} />
      </main>

      <Footer />
    </div>
  )
}
