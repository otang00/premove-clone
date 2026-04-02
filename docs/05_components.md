# 05. 컴포넌트 설계

## 공통
- `Header`
- `Footer`
- `PageWrapper`
- `SectionCard`
- `PrimaryButton`
- `SecondaryButton`
- `TabNav`

## 메인 예약 페이지
- `MainHero`
- `MainReservationBox`
- `PickupDeliveryToggle`
- `LocationField`
- `ScheduleField`
- `DriverAgeSelector`
- `SearchSubmitButton`
- `TrustSection`

## 차량 목록 페이지
- `HeroBanner`
- `SearchFilterBox`
- `SortBar`
- `CarList`
- `CarCard`

## 차량 상세 페이지
- `CarSummaryCard`
- `ReservationTabs`
- `InsuranceCard`
- `DriverInfoForm`
- `RentalMethodSelector`
- `StoreInfoCard`
- `MapPlaceholder`
- `PaymentMethodSelector`
- `TermsAgreementSection`
- `PriceSummarySidebar`

## 설계 원칙
- 메인 예약 박스와 목록 상단 검색 박스는 같은 입력 구조를 공유한다
- 페이지는 조립만 하고 로직은 최소화
- 상태는 더미 상수 또는 local state만 사용
- 재사용 가능한 카드/버튼/필드부터 먼저 만든다
