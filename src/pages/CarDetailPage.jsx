import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import SearchBox from '../components/SearchBox'
import { parseSearchQuery, validateSearchState } from '../utils/searchQuery'
import { getMockCarById } from '../services/cars'
import { getMockCompany } from '../services/company'

function formatDisplay(dateText) {
  const [datePart = '', timePart = ''] = dateText.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = '00', minute = '00'] = timePart.split(':')
  const d = new Date(year, (month || 1) - 1, day || 1)
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] || ''
  return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}(${week}) ${hour}:${minute}`
}

function ContextErrorState({ title, message }) {
  return (
    <article className="detail-card compact-card">
      <h2>{title}</h2>
      <p className="muted small-note">{message}</p>
      <Link to="/" className="outline" style={{ display: 'inline-block', marginTop: 12 }}>메인으로 돌아가기</Link>
    </article>
  )
}

export default function CarDetailPage() {
  const { carId } = useParams()
  const location = useLocation()
  const company = useMemo(() => getMockCompany(), [])
  const searchState = useMemo(() => parseSearchQuery(location.search), [location.search])
  const validation = useMemo(() => validateSearchState(searchState), [searchState])
  const car = useMemo(() => getMockCarById(carId), [carId])
  const hasSearchContext = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.has('deliveryDateTime') && params.has('returnDateTime')
  }, [location.search])

  return (
    <PageShell>
      <main className="section-bg detail-page tighter-page">
        <div className="container detail-layout">
          <SearchBox compact />

          {!hasSearchContext && (
            <ContextErrorState
              title="검색 조건 확인 필요"
              message="상세 페이지는 검색 조건과 함께 진입해야 합니다. 메인에서 다시 검색해 주세요."
            />
          )}

          {hasSearchContext && !validation.isValid && (
            <ContextErrorState
              title="검색 조건 오류"
              message="대여/반납 시간 또는 검색 상태가 올바르지 않습니다. 메인에서 다시 검색해 주세요."
            />
          )}

          {hasSearchContext && validation.isValid && !car && (
            <ContextErrorState
              title="차량을 찾을 수 없습니다"
              message="잘못된 차량 경로이거나 더 이상 표시할 수 없는 차량입니다."
            />
          )}

          {hasSearchContext && validation.isValid && car && (
            <div className="detail-columns compact-detail">
              <section className="detail-main">
                <article className="detail-card summary-card compact-summary">
                  <div className="summary-image-wrap">
                    <img src={car.image} alt={car.name} />
                  </div>
                  <div>
                    <h1>{car.name}</h1>
                    <div className="meta-row"><span>{car.yearLabel}</span><span>{car.fuelType}</span><span>{car.seats}</span></div>
                    <div className="date-strip">
                      <span>{formatDisplay(searchState.deliveryDateTime)}</span>
                      <strong>1일</strong>
                      <span>{formatDisplay(searchState.returnDateTime)}</span>
                    </div>
                    <p className="feature-line">{car.features.join(', ')}</p>
                  </div>
                </article>

                <div className="tab-row slim-tab-row">
                  <button className="active">예약 정보</button>
                  <button>보험/유의사항</button>
                  <button>업체 정보</button>
                </div>

                <article className="detail-card compact-card">
                  <h2>보험 정보</h2>
                  <div className="info-grid three compact-info-grid info-stat-grid">
                    <div><span>보험 안내</span><strong>{car.insurance.type}</strong><small>+ {car.insurance.price}</small></div>
                    <div><span>보상한도</span><strong>{car.insurance.coverage}</strong><small>대인/대물 기준</small></div>
                    <div><span>자차 면책금</span><strong>{car.insurance.deductible}</strong><small>사고 시 고객 부담금</small></div>
                  </div>
                </article>

                <article className="detail-card compact-card">
                  <h2>운전자 정보</h2>
                  <div className="form-grid compact-form-grid">
                    <input placeholder="이름" />
                    <input placeholder="생년월일" />
                    <input placeholder="휴대폰번호" />
                    <button className="outline block">인증번호</button>
                  </div>
                  <p className="muted small-note">만 {searchState.driverAge}세 이상 / 면허 취득 1년 경과. 현장에서 면허 진위를 확인합니다.</p>
                </article>

                <article className="detail-card compact-card">
                  <h2>차량 대여 방법</h2>
                  <div className="info-grid two selectable compact-info-grid">
                    <button className={`select-card ${searchState.pickupOption === 'pickup' ? 'active' : ''}`}>
                      <strong>업체 직접 방문 (무료)</strong>
                      <span>업체로 방문하여 차량을 대여/반납할 수 있어요.</span>
                    </button>
                    <button className={`select-card ${searchState.pickupOption === 'delivery' ? 'active' : ''}`}>
                      <strong>딜리버리 (유료)</strong>
                      <span>원하는 위치에서 차량을 대여/반납할 수 있어요.</span>
                    </button>
                  </div>
                </article>

                <article className="detail-card compact-card">
                  <h2>업체 정보</h2>
                  <div className="store-box">
                    <strong>{company.name}</strong>
                    <p>{company.address}</p>
                    <p className="muted small-note">업체 직접 방문 또는 딜리버리 방식으로 차량을 인수/반납할 수 있습니다.</p>
                    <div className="map-box">지도 영역 Placeholder</div>
                  </div>
                </article>

                <article className="detail-card compact-card">
                  <h2>결제 수단</h2>
                  <div className="info-grid three selectable compact-info-grid">
                    <button className="select-card active"><strong>신용/체크카드</strong></button>
                    <button className="select-card"><strong>카카오페이</strong></button>
                    <button className="select-card"><strong>일반결제</strong></button>
                  </div>
                </article>

                <article className="detail-card compact-card">
                  <h2>이용 약관 동의</h2>
                  <div className="terms-list compact-terms">
                    <div><span>서비스 이용약관</span><button className="outline">보기</button></div>
                    <div><span>렌터카 이용 특약사항</span><button className="outline">보기</button></div>
                    <div><span>개인정보 수집 및 이용 동의</span><button className="outline">보기</button></div>
                    <div><span>개인정보 제3자 제공 동의</span><button className="outline">보기</button></div>
                  </div>
                  <div className="legal-note">
                    아이엠에스모빌리티 주식회사는 통신판매중개자로서 거래 당사자가 아니며, 상품/거래조건 관련 책임은 각 판매자에게 있습니다.
                  </div>
                  <label className="agree-row"><input type="checkbox" defaultChecked /> 위 내용을 모두 확인하였으며, 결제에 동의합니다.</label>
                </article>
              </section>

              <aside className="detail-side detail-card sticky-side compact-side">
                <h2>결제 정보</h2>
                <div className="price-lines compact-price-lines">
                  <div><span>대여료</span><strong>{car.dayPrice}</strong></div>
                  <div><span>보험 (일반자차 포함)</span><strong>{car.insurance.price}</strong></div>
                  <div className="total"><span>총 결제 금액</span><strong>{car.dayPrice}</strong></div>
                </div>
                <button className="pay-button">{car.dayPrice} 바로 결제하기</button>
              </aside>
            </div>
          )}
        </div>
      </main>
    </PageShell>
  )
}
