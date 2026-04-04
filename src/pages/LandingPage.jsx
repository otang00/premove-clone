import { Footer } from '../components/Layout'
import BrandHeader from '../components/BrandHeader'
import ContactInfoStrip from '../components/ContactInfoStrip'
import HeroShowcase from '../components/HeroShowcase'
import ReservationEntrySection from '../components/ReservationEntrySection'
import TopNoticeBar from '../components/TopNoticeBar'
import { landingContactItems, landingHero, landingNotice } from '../data/landing'

export default function LandingPage() {
  return (
    <div className="page-shell landing-shell">
      <TopNoticeBar {...landingNotice} />
      <BrandHeader brandName="빵빵카(주)" />

      <main className="landing-page">
        <HeroShowcase {...landingHero} />
        <ReservationEntrySection />
        <ContactInfoStrip items={landingContactItems} />
      </main>

      <Footer />
    </div>
  )
}
