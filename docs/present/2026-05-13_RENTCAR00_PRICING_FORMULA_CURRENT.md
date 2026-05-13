# 2026-05-13 RENTCAR00 PRICING FORMULA CURRENT

## 문서 상태
- 상태: active current
- 목적: 메인 플랫폼 검색가격 계산식의 최종 결정안을 프로젝트 구조 기준으로 잠근다.

연결 문서:
- 장기 허브 정책: `docs/policies/RENTCAR00_PRICING_HUB.md`
- 현재 active 작업 요약: `docs/present/2026-05-13_RENTCAR00_CURRENT.md`

## 기준 경로
### 실제 계산 코드
- `server/search-db/pricing/calculateGroupPrice.js`
- `server/search-db/repositories/fetchGroupPricePolicies.js`

### 관리자 가격 입력/편집
- `api/admin/pricing-hub.js`
- `src/pages/AdminPricingHubPage.jsx`
- `src/services/pricing.js`

### 데이터 소스
- `v_active_group_price_policies`
- `price_policies`
- `pricing_hub_periods`
- `pricing_hub_rates`

## 현재 구조 판단
1. 실검색 가격 계산은 현재 `calculateGroupPrice.js` 가 담당한다.
2. 현재 구현은 `hour_1 / hour_6 / hour_12 / days_1_2 / days_3_4 / days_5_6 / days_7_plus` 버킷 중심이다.
3. 이번 문서는 이 legacy 구조를 대체하는 최종 구현이 아니라, **이후 계산식 반영 시 따라야 할 공식 기준**을 잠근다.
4. 특히 `7일 미만`은 단일 버킷 고정가가 아니라 **일자별 주중/주말 합산 + 추가시간 cap** 규칙으로 본다.

## 고정 기준값
### 단기 버킷 가중치
- `1h = 0.12`
- `1~2일 = 1.00`
- `3~4일 = 0.90`
- `5~6일 = 0.85`

### 앵커
- `7일 anchor = 5.50`
- `14일 anchor = 8.00`
- `30일 anchor = 12.00`

### 구간 일증가값
- `7+ daily = 0.50`
- `14+ daily = 0.35`

## 입력값
- `base24h`: 기준 24시간 금액
- `weekdayRate`: 주중 적용 비율
- `weekendRate`: 주말 적용 비율
- `startAt`: 대여 시작 시각
- `endAt`: 대여 종료 시각

## 파생 기준값
- `weekdayDaily = base24h * weekdayRate`
- `weekendDaily = base24h * weekendRate`
- `hourlyBase = base24h * 0.12`

주의
- `7일 미만`은 시작일 기준이 아니라 **대여 구간에 포함된 실제 각 날짜의 요일을 순회**해서 계산한다.
- 즉 스케줄 전체 확인형이다.

## 7일 미만 계산식
### 1. 일수 / 시간 분리
- `days = floor(totalHours / 24)`
- `hours = ceil(totalHours - (days * 24))`

### 2. 일수 버킷 선택
- `days <= 2` -> `bucketWeight = 1.00`
- `days <= 4` -> `bucketWeight = 0.90`
- `days <= 6` -> `bucketWeight = 0.85`

### 3. 일수 금액
대여 기간에 포함된 각 일자를 순회해서 계산한다.

- 평일이면 `weekdayDaily * bucketWeight`
- 주말이면 `weekendDaily * bucketWeight`

식:
- `dayTotal = sum(eachDayRate * bucketWeight)`

### 4. 추가시간 금액
- `timeTotal = hours * hourlyBase`

### 5. 다음 1일 cap
추가시간 합산 금액이 다음 1일 금액보다 커지면 다음 1일 금액으로 전환한다.

식:
- `price(days + h시간) = min(price(days) + timeTotal, price(days + 1))`

예:
- `3일 + 5시간 = min(3일 금액 + 5 * hourlyBase, 4일 금액)`

## 7~14일 계산식
7일 이상부터는 요일별 합산이 아니라 `base24h` 기준 앵커/증분형으로 계산한다.

- `anchor7 = base24h * 5.50`
- `anchor14 = base24h * 8.00`
- `price(d) = min(anchor14, anchor7 + (d - 7) * base24h * 0.50)`
- 적용 범위: `7 <= d <= 14`

## 15~30일 계산식
- `anchor14 = base24h * 8.00`
- `anchor30 = base24h * 12.00`
- `price(d) = min(anchor30, anchor14 + (d - 14) * base24h * 0.35)`
- 적용 범위: `15 <= d <= 30`

## 구현 관점 메모
1. 현재 `calculateGroupPrice.js` 는 `7일 미만`을 이미 `days_1_2 / days_3_4 / days_5_6` 버킷 금액 합산으로 처리 중이다.
2. 그러나 이번 기준은 **관리자 입력값 기준으로 24h / 주중% / 주말% / 7일 / 14일 / 30일을 사용해 재계산**하는 방향이다.
3. 따라서 실제 코드 반영 시에는 아래가 같이 바뀌어야 한다.
   - `7일 미만`: 날짜별 주중/주말 순회 + 시간 cap
   - `7일 이상`: 7/14/30 anchor + 구간 daily add
4. `nextDayPrice` 계산도 같은 규칙으로 재귀/헬퍼 계산해야 한다.

## 한 줄 결론
- `7일 미만 = 날짜별 주중/주말 합산 + 1h 0.12 + 다음 1일 cap`
- `7일 이상 = 7/14/30 anchor + 0.50 / 0.35 증분`
- 이 기준을 `server/search-db/pricing/calculateGroupPrice.js` 반영 대상 공식으로 잠근다.
