# RENTCAR00 pricing policy v1 current

Last updated: 2026-05-01

이 문서는 홈페이지/허브/DB가 따라야 하는 가격 정책 기준을 정리한다.
현재 실코드는 이 문서를 아직 완전히 따르지 않을 수 있으며, 그 차이는 별도 실행 계획 문서에서 다룬다.
중요한 점은 이 문서의 비율·배수·할인 기준값이 고정 규정이 아니라는 것이다.
이 값들은 기준가격(base price)을 기준으로 가격표를 생성하기 위한 운영 파라미터이며, 운영 상황에 따라 조정될 수 있다.
특히 주중/주말 비율과 30일 기준 가격(월차 할인 관련)은 후속 조정 가능 항목으로 본다.

---

## 1. 목적

목표는 4가지다.

1. 기준가격 1개를 중심축으로 가격표를 생성한다.
2. 기준가격에 연결된 운영 파라미터 세트로 주중/주말 24시간 금액과 단기/장기 금액을 파생한다.
3. 일대여는 실제 포함된 과금일 기준으로 주중/주말을 분리 계산한다.
4. 장기(15일/30일)는 IMS monthly source 구조와 맞는 별도 규칙으로 계산한다.

---

## 2. 기준가격과 운영 파라미터

### 2-1. 기준가격

허브 기준가격을 `B` 라고 둔다.

- `B` 는 가격 생성의 기준 축이다.
- 홈페이지 일요금 계산의 24시간 값은 직접 고정 입력값이 아니라, `B` 와 파라미터 세트로부터 파생된다.

### 2-2. 운영 파라미터 세트

아래 값들은 고정 공식이 아니라 조정 가능한 운영 파라미터다.

- `weekday_24h_percent`
- `weekend_24h_percent`
- `k12`
- `k34`
- `k56`
- `k7`
- `month_1_multiplier`
- `half_month_ratio`
- `half_month_daily_ratio`
- `month_1_daily_markup_ratio`

예시 파라미터 세트:
- `weekday_24h_percent = 0.45`
- `weekend_24h_percent = 0.50`

예시 해석:
- `주중24h = round(B × weekday_24h_percent)`
- `주말24h = round(B × weekend_24h_percent)`

위 수치는 현재 운영 기준을 설계하기 위한 시작값일 뿐이며, 확정 불변 공식으로 보지 않는다.

---

## 3. 단기 구간 정책

### 3-1. 버킷

총 대여시간 기준 버킷은 유지한다.

- `<= 1h` → `hour_1`
- `<= 6h` → `hour_6`
- `<= 12h` → `hour_12`
- `< 24h` → `hour_12_plus`
- `<= 48h` → `days_1_2`
- `<= 96h` → `days_3_4`
- `<= 144h` → `days_5_6`
- `> 144h` → `days_7_plus`

### 3-2. 단기 일단가 파생 구조

주중/주말 24시간 금액에서 각 구간 단가를 파생한다.
이때 사용되는 계수는 고정 규정이 아니라 기준가격에 연결된 운영 파라미터다.

계수:
- `k12`
- `k34`
- `k56`
- `k7`

식:
- `주중 1~2일 단가 = round(주중24h × k12)`
- `주중 3~4일 단가 = round(주중24h × k34)`
- `주중 5~6일 단가 = round(주중24h × k56)`
- `주중 7일+ 단가 = round(주중24h × k7)`
- `주말 1~2일 단가 = round(주말24h × k12)`
- `주말 3~4일 단가 = round(주말24h × k34)`
- `주말 5~6일 단가 = round(주말24h × k56)`
- `주말 7일+ 단가 = round(주말24h × k7)`

예시 초기값 초안:
- `k12 = 1.00`
- `k34 = 0.84`
- `k56 = 0.75`
- `k7 = 0.67`

이 값은 차종군/운영 룰에 따라 조정 가능하며, 시스템은 기준가격 기준으로 이 파라미터 세트를 정렬·비교·매핑할 수 있어야 한다.
구조는 공통으로 유지하되, 값 자체는 운영 조정 대상이다.

---

## 4. 일대여 주중/주말 판정 정책

### 4-1. 확정 정책

일대여는 **실제 포함된 과금일 기준으로 주중일수/주말일수를 분리 계산**한다.

채택하지 않는 방식:
- 24시간 블록 시작요일만 보는 방식
- 전체 대여시간 중 주말 시간 비율만 안분하는 방식

### 4-2. 계산 정의

- `billableDays = ceil(totalHours / 24)`
- 과금일은 pickup 시각부터 24시간씩 순차 생성한다.
- 각 과금일의 서울 기준 캘린더 날짜를 판정한다.
- 그 과금일이 토/일에 해당하면 `weekendDays` 로 집계한다.
- 그 외는 `weekdayDays` 로 집계한다.

### 4-3. 최종 일대여 계산식

버킷 결정 후:
- `discountPrice = (weekdayDays × weekdayBucketUnitPrice) + (weekendDays × weekendBucketUnitPrice)`

예시:
- 목 10:00 → 화 10:00, 5일
- 버킷: `days_5_6`
- 집계: 주중 3일, 주말 2일
- 금액: `(weekday_5_6d_price × 3) + (weekend_5_6d_price × 2)`

---

## 5. 시간대여 정책

현재 기준:
- `hour_1`, `hour_6`, `hour_12`, `hour_12_plus` 는 별도 시간요금 규칙을 사용한다.
- 시간대여는 현재 주중/주말 분리 없이 운영 중이다.

후속 검토 항목:
- 시간대여에도 주중/주말 분리 정책을 적용할지 여부
- 이번 1차 개편 범위에는 기본적으로 포함하지 않는다.

---

## 6. 장기(15일/30일) 정책

장기는 IMS monthly source 기준을 따른다.
일요금 source 와 별도다.

필수 source 필드:
- `d15_total_cost`
- `d15_daily_cost`
- `m1_total_cost`
- `m1_daily_cost`
- 필요 시 `*_security_deposit`

### 6-1. 장기 입력 파라미터 기준 초안

장기값도 고정 공식이 아니라 기준가격과 파라미터 세트에서 파생되는 운영값으로 본다.

예시 파라미터 세트:
- `weekday_24h_percent = 0.45`
- `month_1_multiplier = 12`
- `half_month_ratio = 0.8`
- `half_month_daily_ratio = 0.25`
- `month_1_daily_markup_ratio = 1.1 ~ 1.2`

예시 생성식:
- `주중24h = round(B × weekday_24h_percent)`
- `m1_total_cost = round(주중24h × month_1_multiplier)`
- `d15_total_cost = round(m1_total_cost × half_month_ratio)`
- `d15_daily_cost = round(주중24h × half_month_daily_ratio)`
- `m1_daily_cost = round((m1_total_cost / 30) × month_1_daily_markup_ratio)`

운영 해석:
- `d15_daily_cost < m1_daily_cost` 가 자연스럽다.
- `m1_daily_cost` 는 30일 평균 일가보다 다소 높게 두는 방향이 기본이다.
- 특히 `month_1_multiplier` 와 `weekday_24h_percent / weekend_24h_percent` 는 운영 상황에 따라 조정 가능하다.

### 6-2. 계산식

#### 15일 이상 30일 미만
- `min(d15_total_cost + ((days - 15) × d15_daily_cost), m1_total_cost)`

#### 30일 이상
- `months = floor(days / 30)`
- `remain = days % 30`
- `base = months × m1_total_cost`

잔여일:
- `remain = 0` → `0`
- `remain < 15` → `min(remain × m1_daily_cost, d15_total_cost)`
- `remain >= 15` → `min(d15_total_cost + ((remain - 15) × m1_daily_cost), m1_total_cost)`

최종:
- `total = base + remain_cost`

---

## 7. 반올림 규칙

1차 기준:
- 금액 계산은 원단위 반올림
- 퍼센트는 소수점 둘째 자리까지 허용 가능
- 화면 표시는 천단위 구분

후속 검토:
- 실제 운영에서 천원단위 절삭/반올림이 필요한지 별도 확인

---

## 8. DB 저장 원칙

원칙은 2층 구조다.

1. **기준가격/파라미터 저장층**
   - 기준가격과 가격 생성 파라미터 세트를 저장
2. **실사용 금액 저장층**
   - 검색/예약에 직접 쓰는 확정 금액 저장

즉:
- 파라미터 프로필 테이블 = 계산 근거
- `price_policies` 및 monthly source = 실사용 값

추가 원칙:
- 시스템은 기준가격(base price)을 중심축으로 파라미터 세트를 정렬·비교·매핑할 수 있어야 한다.
- 파라미터 세트는 고정 규정 저장소가 아니라 운영 조정 가능한 preset/profile 로 본다.

---

## 9. 현재 실코드와의 차이

현재 실코드 기준 확인 사항:
- `server/search-db/pricing/calculateGroupPrice.js`
- 현재는 24시간 블록 시작요일 기준으로 주중/주말을 나눈다.
- 따라서 이 문서 기준과 불일치한다.

정리:
- 현재 코드 = 시작요일 기준
- 목표 정책 = 실제 포함된 과금일 기준

이 차이는 반드시 후속 코드 수정 대상이다.

---

## 10. 한 줄 결론

**기준가격 1개를 중심축으로 조정 가능한 파라미터 세트를 적용해 가격표를 생성하고, 일대여는 실제 포함된 과금일 기준으로 주중/주말을 분리 계산하며, 장기는 IMS monthly source 기반 15일/30일 패키지 규칙으로 별도 계산한다.**
