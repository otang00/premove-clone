# EXECUTION MASTER PRESENT

## 목적
프리무브의 가격/검색/상세 구조를 **한 번에 읽히는 형태**로 다시 잠근다.
이 문서는 현재 코드 기준의 정답 구조와, 이후 삭제/정리 방향의 기준 문서다.

## 현재 기준점
- 브랜치: `feat/db-preview-home`
- 기준 커밋: `ca3b13a`
- active present 문서: 이 문서 1개만 사용

## 정답 구조
### 1. 가격 기준축
가격 계산의 기준 키는 차량 개별 id가 아니라 **그룹 id**다.

흐름:
1. 차량 row 조회
2. `cars.source_group_id` 확인
3. `v_active_group_price_policies.ims_group_id` 로 정책 조회
4. `calculateGroupPrice()` 로 가격 계산
5. 검색/상세 DTO에 pricing 반영

### 2. ID 역할
- `source_car_id`: 차량 식별 키, 검색 결과 `carId` 및 상세 진입 기준
- `source_group_id`: 차량이 속한 가격 계산 시작 키
- `ims_group_id`: 그룹 가격 정책 조회 키
- `car.id` (uuid): DB 내부 row 식별자, 외부 계약의 기준이 아님

### 3. 검색 결과 단위
검색 결과는 실차 전체 목록이 아니라 **그룹 대표 1건 단위**다.
같은 `source_group_id` 차량이 여러 대여도 검색 DTO는 대표 1건만 내려간다.

### 4. 가격 공식 기준
- 계산 엔진: `server/search-db/pricing/calculateGroupPrice.js`
- 시간 구간:
  - `<=1h`
  - `<=6h`
  - `<=12h`
  - `12h~24h fallback`
- 일 구간:
  - `1~2일`
  - `3~4일`
  - `5~6일`
  - `7일+`
- 주중/주말은 서울 시간 기준으로 계산
- `deliveryPrice` 는 `delivery_regions.round_trip_price` 별도 합산

### 5. 검색/상세의 올바른 책임 분리
- 검색: 차량 후보 조회 + 예약 충돌 제외 + 그룹 가격 계산 + 그룹 대표 DTO 생성
- 상세: 단일 차량 조회 + 동일 그룹 가격 계산 규칙 적용 + 상세 DTO 생성
- 즉 가격 계산 규칙은 검색/상세가 따로 가지면 안 되고, 같은 정책 축을 써야 한다.

## 현재 코드와 맞는 사실
### 검색
- `/api/search-cars` 는 `dbSearchService.run()` 만 사용
- 후보 차량은 `cars` 테이블에서 조회
- 가격 조회는 현재 `fetchPriceRules()` 를 통해 이뤄짐
- 내부 우선순위는
  1. `v_active_group_price_policies`
  2. 없으면 `car_prices` fallback
- DTO는 `carId=source_car_id`, `groupId=source_group_id`
- 그룹 dedupe 가 있어 그룹 대표 1건만 반환

### 상세
- `buildDbCarDetailDto()` 는 `cars` 테이블에서 차량 1건 조회
- 가격 조회는 검색과 동일하게 `fetchPriceRules()` 를 사용
- `source_group_id` 기반으로 정책을 찾고 `calculateGroupPrice()` 로 계산
- `meta.groupId` 는 `source_group_id`

## 구조 문제의 핵심
### 문제 1. 가격 소스가 2개 공존
현재 코드는 그룹 가격 정책이 정답 구조인데, `car_prices` fallback 이 같이 살아 있다.
이 공존이 가장 큰 혼선 원인이다.

### 문제 2. 이름이 역할을 충분히 드러내지 못함
`carId`, `groupId`, `priceRules` 같은 이름만 보면
- 차량 식별 키인지
- 그룹 정책 키인지
- legacy 포함 조회 결과인지
한 번에 안 보인다.

### 문제 3. 검색/상세 pricing 조립이 분산
- 검색: `mapDbCarsToDto.js`
- 상세: `buildDbCarDetailDto.js`
같은 가격 규칙이 두 군데서 따로 조립된다.

## 앞으로 잠글 구조 변경 방향
### 유지
- `source_group_id -> ims_group_id -> group policy -> calculateGroupPrice()` 축
- `fetchGroupPricePolicies.js`
- `calculateGroupPrice.js`
- delivery region 별도 합산 구조

### 제거 대상
아래는 그룹 정책 경로가 기준으로 완전히 잠기면 제거 대상이다.
- `car_prices` fallback 경로
- `server/search-db/repositories/fetchPriceRules.js` 의 legacy fallback 책임
- `scripts/build-car-price-seed.js`
- `supabase/migrations/20260415013000_create_car_prices_and_shadow_diffs.sql` 내 `car_prices`
- `supabase/seed.sql` 내 `car_prices` seed
- `car_prices` 를 현재 기준처럼 설명하는 문서들

### 리네임 대상
- `fetchPriceRules` -> 그룹 정책 전용 의미 이름으로 분리 필요
- 내부 변수명도 역할 기준으로 분리 필요
  - `vehicleId`
  - `sourceCarId`
  - `sourceGroupId`
  - `imsGroupId`
  - `groupPricingPolicy`

### 공통화 대상
- 검색/상세 공통 pricing builder
- 가격 컨텍스트 조회 결과 shape
- meta/pricing source 표기 규칙

## 실행 원칙
1. 정답 구조를 먼저 유지 문서로 잠근다
2. 그 다음 legacy 경로 사용처를 전수 확인한다
3. group-policy only 구조로 바꾼다
4. 마지막에 legacy 코드/문서/seed/migration 을 삭제한다

## 이번 phase의 검증 기준
아래가 모두 맞으면 이 문서는 유효하다.
- 검색 가격 기준축이 `source_group_id` 인가
- 상세도 같은 그룹 정책 축을 타는가
- 대표 결과가 그룹 단위인가
- `car_prices` 가 정답이 아니라 fallback 으로만 남아 있는가
- 계산 엔진이 `calculateGroupPrice()` 하나로 잠겨 있는가

## 이번 문서의 역할
이 문서는 구현 문서가 아니라 **삭제와 단순화를 위한 기준점**이다.
다음 변경은 이 문서를 기준으로만 판단한다.
