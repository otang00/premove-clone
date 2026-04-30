# RENTCAR00 pricing execution plan v1 current

Last updated: 2026-05-01

이 문서는 사장님 승인 기준으로 가격 정책을 실코드/DB에 반영하기 위한 실행 계획이다.
범위는 정책 문서, DB 추가, 서버 계산기 교체, 허브 입력 구조 정리, 검증, 배포 전 체크까지 포함한다.
중요한 전제는 비율·배수·할인값이 고정 공식이 아니라 기준가격(base price) 기반 가격 생성 파라미터라는 점이다.
따라서 이번 설계의 초점은 고정 규칙과 가변 파라미터를 분리하고, 기준가격 기준으로 파라미터 세트를 정렬·비교·매핑 가능하게 만드는 데 있다.

---

## 1. 목적

이번 작업의 목적은 아래 5개다.

1. 홈페이지 가격 계산을 현재 시작요일 기준에서 실제 포함 과금일 기준으로 바꾼다.
2. 기준가격 1개에서 주중/주말 24시간 및 단기/장기 금액을 파생하는 구조를 도입한다.
3. 비율·배수·할인값을 고정 공식이 아니라 조정 가능한 운영 파라미터로 관리한다.
4. 15일/30일 장기 계산을 IMS monthly source 와 맞는 구조로 정리한다.
5. 기준가격/파라미터 저장 구조와 실사용 금액 저장 구조를 분리한다.

---

## 2. 현재 기준점

### 2-1. 서버 계산 로직

핵심 파일:
- `server/search-db/pricing/calculateGroupPrice.js`
- `server/search-db/pricing/buildAppliedGroupPricing.js`
- `server/search-db/repositories/fetchGroupPricePolicies.js`

현재 사실:
- 버킷은 총 대여시간 기준이다.
- `billableDays = ceil(totalHours / 24)`
- 주중/주말 판정은 `startAt + 24h*n` 시점이 토/일인지로 계산한다.
- 즉 실제 포함 과금일 기준이 아니다.

### 2-2. 가격 정책 저장 구조

기존 daily 정책 저장:
- `price_policies`
- `price_policy_groups`
- `v_active_group_price_policies`

기존 허브 저장:
- `pricing_hub_periods`
- `pricing_hub_rates`
- `pricing_hub_overrides`
- `v_pricing_hub_policy_editor`

확인된 monthly source 문서:
- `docs/present/2026-05-01_RENTCAR00_PRICING_HUB_MONTHLY_SOURCE_CURRENT.md`

---

## 3. 설계 원칙

### 3-1. 계산 원칙
- 버킷 분류는 유지
- 일대여 주중/주말 판정만 교체
- 시간대여는 1차 범위에서 기존 유지
- 장기는 daily policy fallback 이 아니라 monthly source / monthly 파라미터 기준으로 분리

### 3-2. 저장 원칙
- 기존 `price_policies` 는 실사용 금액 저장소로 유지
- 신규 테이블은 고정 공식 저장소가 아니라 **기준가격 + 가격 생성 파라미터 프로필 저장소**로 추가
- 조회 경로는 필요 시 파라미터로 재계산 가능하되, 1차는 기존 실사용 필드와 호환 우선
- 시스템은 기준가격 기준으로 파라미터 프로필을 정렬·비교·매핑할 수 있어야 함

### 3-3. 전환 원칙
- 단번 교체보다 shadow 비교 후 전환
- 대표 그룹 샘플 검증 후 적용
- 예약 snapshot 과 화면 표시값 일치 우선

---

## 4. DB 변경 계획

### 4-1. 신규 테이블

#### A. `pricing_formula_profiles`
목적:
- 허브 기준가격 기반 가격 생성 파라미터 프로필 저장

주요 컬럼:
- `id uuid pk`
- `profile_name text`
- `base_source_type text`  -- 예: `hub_base_price`
- `base_price integer` 또는 `base_price_min/base_price_max integer`
- `sort_order integer`
- `weekday_24h_percent numeric(5,2)`
- `weekend_24h_percent numeric(5,2)`
- `bucket_1_2_ratio numeric(8,4)`
- `bucket_3_4_ratio numeric(8,4)`
- `bucket_5_6_ratio numeric(8,4)`
- `bucket_7_plus_ratio numeric(8,4)`
- `month_1_multiplier numeric(8,4)`
- `half_month_ratio numeric(8,4)`
- `half_month_daily_ratio numeric(8,4)`
- `month_1_daily_markup_ratio numeric(8,4)`
- `rounding_mode text default 'round_krw'`
- `active boolean`
- `effective_from timestamptz`
- `effective_to timestamptz`
- `metadata jsonb`
- `created_at / updated_at`

설명:
- 이 테이블은 고정 가격 공식 저장소가 아니다.
- 기준가격을 중심으로 가격표를 생성하기 위한 조정 가능한 파라미터 프로필 저장소다.
- 운영자는 필요 시 주중/주말 비율과 월차 관련 파라미터를 수정할 수 있어야 한다.

#### B. `price_policy_formula_bindings`
목적:
- 어떤 정책이 어떤 파라미터 프로필을 쓰는지 연결

주요 컬럼:
- `id uuid pk`
- `price_policy_id uuid fk -> price_policies.id`
- `pricing_formula_profile_id uuid fk -> pricing_formula_profiles.id`
- `priority integer default 100`
- `active boolean`
- `metadata jsonb`
- `created_at / updated_at`

#### C. `pricing_monthly_formula_snapshots`
목적:
- 장기 계산용 산출 결과와 source 기준을 기록

주요 컬럼:
- `id uuid pk`
- `price_policy_id uuid fk`
- `pricing_formula_profile_id uuid fk`
- `weekday_24h integer`
- `weekend_24h integer`
- `d15_total_cost integer`
- `d15_daily_cost integer`
- `m1_total_cost integer`
- `m1_daily_cost integer`
- `source_type text`  -- `formula` / `ims_monthly_api` / `manual`
- `active boolean`
- `effective_from / effective_to`
- `metadata jsonb`
- `created_at / updated_at`

### 4-2. 인덱스/제약
- active + 기간 검색 인덱스
- 기준가격 또는 기준가격 band 정렬 인덱스
- 정책당 동시 active 충돌 방지 규칙 검토
- 금액 컬럼 음수 방지 check
- effective window check

### 4-3. 기존 테이블 유지 이유
- 현재 검색/예약 경로가 `price_policies` 기반
- 바로 새 구조만 보도록 바꾸면 영향 범위 큼
- 1차는 신규 구조 추가 후 점진 전환이 안전

---

## 5. 서버 코드 변경 계획

### 5-1. 신규 모듈

#### `server/search-db/pricing/classifyChargeDays.js`
역할:
- 실제 포함된 과금일 기준 주중/주말 집계

입력:
- `startAt`
- `endAt`
- `timezone = 'Asia/Seoul'`

출력 예시:
- `billableDays`
- `weekdayDays`
- `weekendDays`
- `chargeDays[]`
  - `index`
  - `startAt`
  - `endAt`
  - `seoulDate`
  - `dayType`

#### `server/search-db/pricing/derivePolicyAmounts.js`
역할:
- 허브 기준값과 파라미터 프로필로 단기/장기 금액 산출

출력:
- `weekday_1_2d_price`
- `weekday_3_4d_price`
- `weekday_5_6d_price`
- `weekday_7d_plus_price`
- `weekend_1_2d_price`
- `weekend_3_4d_price`
- `weekend_5_6d_price`
- `weekend_7d_plus_price`
- `d15_total_cost`
- `d15_daily_cost`
- `m1_total_cost`
- `m1_daily_cost`

### 5-2. 기존 계산기 수정

대상:
- `server/search-db/pricing/calculateGroupPrice.js`

변경 내용:
1. 버킷 계산은 유지
2. 일대여일 때 `calculateDailyPrice()` 내부 로직 교체
3. 시작요일 기준 `isWeekendInSeoul(addHours(startAt, index * 24))` 방식 제거
4. `classifyChargeDays()` 결과로 `weekdayDays`, `weekendDays` 집계
5. 반환값에 `calculationTrace` 또는 `chargeDays` 포함 가능하도록 확장

### 5-3. 적용 경로 확인

연결 경로:
- `buildAppliedGroupPricing.js`
- `mapDbCarsToDto.js`
- 검색결과 가격 노출
- 상세페이지 예약 금액
- 예약 snapshot (`quotedTotalAmount`, `pricing_snapshot`)

---

## 6. 허브/관리자 변경 계획

### 6-1. 허브 입력값
직접 입력:
- 기준가격 `B`
- 주중 24h %
- 주말 24h %
- `k12`, `k34`, `k56`, `k7`
- `month_1_multiplier`
- `half_month_ratio`
- `half_month_daily_ratio`
- `month_1_daily_markup_ratio`

설명:
- 위 값들은 고정 공식 입력이 아니라 가격 생성용 운영 파라미터다.
- 특히 주중/주말 %와 월차 관련 값은 운영자가 후속 조정할 수 있어야 한다.

### 6-2. 허브 산출값
자동 계산:
- `weekday24h`
- `weekend24h`
- 단기 구간 주중/주말 단가
- `d15_total_cost`
- `d15_daily_cost`
- `m1_total_cost`
- `m1_daily_cost`

### 6-3. 허브 UI 변경 포인트
대상 파일:
- `api/admin/pricing-hub.js`
- `src/pages/AdminPricingHubPage.jsx`

해야 할 일:
1. 파라미터 프로필 조회/저장 추가
2. 미리보기 표에 1~30일 샘플 표시
3. 주말 포함 시나리오 검증 패널 추가
4. monthly source 와 파라미터 산출값 차이 표시

---

## 7. 페이즈 계획

### Phase 0. 정책 잠금
목적:
- 계산 원칙 확정

해야 할 일:
- 정책 문서 확정
- 주중/주말 판정 정의 확정
- 반올림 규칙 확정
- 장기 입력값 파라미터 초안 확정

종료 조건:
- 문서 기준 모호점 0개

### Phase 1. DB 추가
목적:
- 기준가격/파라미터 저장 구조 추가

해야 할 일:
- migration 작성
- 테이블/인덱스/제약 생성
- rollback 경로 준비

종료 조건:
- 신규 스키마 적용 가능
- 기존 조회 경로 영향 없음

### Phase 2. 계산 모듈 작성
목적:
- 과금일 분류기와 파라미터 기반 산출기 작성

해야 할 일:
- `classifyChargeDays.js`
- `derivePolicyAmounts.js`
- 단위 테스트 작성

종료 조건:
- 샘플 케이스 테스트 통과

### Phase 3. 서버 계산기 교체
목적:
- 홈페이지 가격 계산을 새 정책에 맞춤

해야 할 일:
- `calculateGroupPrice.js` 교체
- `buildAppliedGroupPricing.js` 연결 검증
- breakdown 반환값 정리

종료 조건:
- 주말 포함 샘플 오판정 제거

### Phase 4. 허브 연동
목적:
- 허브에서 기준가격/파라미터 저장 및 미리보기 지원

해야 할 일:
- API/페이지 수정
- profile/binding 저장
- preview 표 추가

종료 조건:
- 허브에서 파라미터 저장과 산출 검증 가능

### Phase 5. 장기 source 정리
목적:
- monthly source 와 파라미터 산출 관계 정리

해야 할 일:
- source 우선순위 결정
- formula snapshot 저장
  - 테이블명은 유지하되 의미는 파라미터 산출 snapshot 으로 해석
- IMS monthly API 와 비교 검증

종료 조건:
- 장기 계산 입력값 기준 확정

### Phase 6. shadow 검증
목적:
- 운영 전 diff 확인

해야 할 일:
- 대표 그룹/일정 샘플 수집
- old vs new 계산 diff 표 작성
- 예외 케이스 수정

종료 조건:
- 승인된 차이만 남음

### Phase 7. 전환
목적:
- 실서비스 반영 준비

해야 할 일:
- 최종 코드 반영
- 회귀 테스트
- 배포 체크리스트 실행

종료 조건:
- 화면/예약/snapshot 일치

---

## 8. 검증 시나리오

### 필수 일대여
- 평일 24h
- 주말 24h
- 금 22:00 → 토 22:00
- 토 10:00 → 일 10:00
- 목 10:00 → 화 10:00
- 금 10:00 → 월 10:00
- 일 10:00 → 월 10:00

### 필수 장기
- 14일
- 15일
- 20일
- 26일
- 30일
- 31일
- 44일
- 50일

### 확인 항목
- `durationBucket`
- `billableDays`
- `weekdayDays`
- `weekendDays`
- `discountPrice`
- `price`
- `deliveryPrice`
- `quotedTotalAmount`
- `pricing_snapshot`

---

## 9. 수정 대상 파일 초안

### DB
- 신규 migration 1~2개

### 서버
- `server/search-db/pricing/calculateGroupPrice.js`
- `server/search-db/pricing/buildAppliedGroupPricing.js`
- `server/search-db/repositories/fetchGroupPricePolicies.js`
- 신규 `server/search-db/pricing/classifyChargeDays.js`
- 신규 `server/search-db/pricing/derivePolicyAmounts.js`

### 테스트
- `server/search-db/pricing/__tests__/calculateGroupPrice.test.js`
- 신규 `classifyChargeDays.test.js`
- 신규 `derivePolicyAmounts.test.js`

### 관리자
- `api/admin/pricing-hub.js`
- `src/pages/AdminPricingHubPage.jsx`

---

## 10. 리스크

1. “실제 포함된 과금일” 정의를 모호하게 두면 재분쟁 발생 가능
2. 장기 계산을 검색 흐름에 한 번에 넣으면 영향 범위 큼
3. 기존 `price_policies` 금액과 파라미터 산출값 차이가 날 수 있음
4. monthly source 와 파라미터 산출 source 우선순위 충돌 가능
5. 예약 snapshot 과 화면 표기 불일치 위험
6. 기준가격 축과 파라미터 프로필 정렬 기준을 모호하게 두면 운영 관리가 다시 꼬일 수 있음

---

## 11. 실코드 반영 전 체크리스트

### 정책 체크
- [ ] 기준값 `B` 정의 확정
- [ ] 주중 45%, 주말 50% 확정
- [ ] 장기 12배 / 80% / 0.25 / 1.1~1.2 규칙 확정

### DB 체크
- [ ] 신규 테이블 이름 확정
- [ ] FK/인덱스/active rule 확정
- [ ] rollback SQL 준비

### 서버 체크
- [ ] `calculateGroupPrice.js` 교체 범위 확정
- [ ] 주말 판정 helper 테스트 작성
- [ ] 예약 snapshot 영향 경로 확인

### 허브 체크
- [ ] 직접 입력값 vs 자동 산출값 구분 확정
- [ ] preview 표 정의
- [ ] 저장 순서(profile -> binding -> preview) 확정

### 운영 체크
- [ ] 샘플 그룹 3개 이상 비교
- [ ] old/new diff 승인
- [ ] 배포 전 회귀 테스트 통과

---

## 12. 한 줄 결론

**1차는 기준가격 기반 가변 파라미터 체계를 먼저 잠그고, DB/계산기를 그 구조에 맞춰 분리한 뒤, 실제 포함 과금일 기준 계산기로 홈페이지를 교체하며, 장기와 허브는 source 분리 원칙을 유지한 채 단계적으로 연결하는 것이 가장 안전하다.**
