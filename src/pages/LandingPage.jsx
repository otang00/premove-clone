import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Footer } from '../components/Layout'
import BrandHeader from '../components/BrandHeader'
import CarDetailSection from '../components/CarDetailSection'
import ContactInfoStrip from '../components/ContactInfoStrip'
import HeroShowcase from '../components/HeroShowcase'
import ReservationEntrySection from '../components/ReservationEntrySection'
import SearchResultsSection from '../components/SearchResultsSection'
import TopNoticeBar from '../components/TopNoticeBar'
import { landingContactItems, landingHero, landingNotice } from '../data/landing'

export default function LandingPage() {
  const location = useLocation()
  const { carId } = useParams()
  const hasSearchQuery = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.has('deliveryDateTime') && params.has('returnDateTime')
  }, [location.search])
  const isDetailMode = Boolean(carId)

  return (
    <div className="page-shell landing-shell">
      <TopNoticeBar {...landingNotice} />
      <BrandHeader brandName="빵빵카(주)" />

      <main className="landing-page">
        <HeroShowcase {...landingHero} />
        {isDetailMode ? <CarDetailSection /> : <ReservationEntrySection />}
        {!isDetailMode && hasSearchQuery && <SearchResultsSection />}
        <ContactInfoStrip items={landingContactItems} />
      </main>

      <Footer />
    </div>
  )
}
