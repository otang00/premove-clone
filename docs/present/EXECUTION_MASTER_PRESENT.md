# EXECUTION MASTER PRESENT

## 목적
프리무브의 가격/검색/상세 구조를 **실행 가능한 기준**으로 다시 잠근다.
이 문서는 설명용 요약이 아니라, 다음 수정 phase들이 그대로 따를 실행 기준 문서다.

## 현재 기준점
- 브랜치: `feat/db-preview-home`
- 기준 커밋: `67334d3`
- active present 문서: 이 문서 1개만 사용

## 이번 실행의 최종 목표
아래 상태가 되면 이번 구조 정리 작업은 끝난다.

1. 가격 경로가 **group policy only** 로 설명 가능하다
2. `car_prices` 관련 legacy fallback 이 제거된다
3. 검색/상세가 같은 pricing 조립 규칙을 사용한다
4. ID 이름이 역할 기준으로 읽힌다
5. 문서와 코드 설명이 일치한다

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

## 현재 확인 범위
### 확인 완료
- 검색 API 경로
- 상세 DTO 생성 경로
- 가격 계산기
- 그룹 정책 조회 경로
- 검색 DTO 그룹 dedupe 테스트
- 검색 DB 서비스 테스트

### 다음 phase에서 추가 확인 필요
- 검색 프론트 전체 렌더 의존 필드
- 상세 프론트 전체 렌더 의존 필드
- 검색 → 상세 이동 계약 전체
- legacy 문서 전수 정리 범위

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

## 유지 / 제거 / 변경 기준
### 유지
- `source_group_id -> ims_group_id -> group policy -> calculateGroupPrice()` 축
- `fetchGroupPricePolicies.js`
- `calculateGroupPrice.js`
- delivery region 별도 합산 구조

### 제거 대상
아래는 group-policy only 구조로 전환할 때 제거 대상이다.
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

## 실행 phase
### Phase 1. 사용처 전수 점검
목적:
- 문서 기준과 실제 코드의 불일치 범위를 전수 확인한다.

수정 범위:
- 없음, 읽기/검증만

확인 파일 후보:
- `api/search-cars.js`
- `api/car-detail.js`
- `src/services/cars.js`
- `src/services/carDetail.js`
- `src/components/SearchResultsSection.jsx`
- `src/components/CarDetailSection.jsx`
- `server/detail/buildDbCarDetailDto.js`

종료 조건:
- 검색/상세 프론트와 API 계약 차이 목록화 완료

### Phase 2. 가격 조회 경로 단일화
목적:
- legacy fallback 없는 group-policy only 조회 구조로 바꾼다.

수정 파일 후보:
- `server/search-db/repositories/fetchPriceRules.js`
- `server/search-db/repositories/fetchGroupPricePolicies.js`
- `server/detail/buildDbCarDetailDto.js`
- `server/search-db/dbSearchService.js`

종료 조건:
- 검색/상세 모두 그룹 정책만으로 가격 조회
- `car_prices` fallback 코드 제거
- 관련 테스트 갱신 완료

### Phase 3. pricing builder 공통화
목적:
- 검색/상세가 동일한 가격 조립 규칙을 사용하게 만든다.

수정 파일 후보:
- `server/search-db/transformers/mapDbCarsToDto.js`
- `server/detail/buildDbCarDetailDto.js`
- 신규 공통 모듈 1개

종료 조건:
- pricing 조립 핵심 로직이 1곳으로 모임
- 검색/상세 계산 결과 설명이 동일해짐

### Phase 4. 명칭 정리
목적:
- ID와 정책 이름을 읽는 즉시 역할이 보이게 만든다.

수정 파일 후보:
- 검색/상세 관련 서버 파일 전반
- 테스트 fixture
- 필요 시 프론트 service 레이어

종료 조건:
- `carId`, `groupId`, `priceRules` 같은 모호한 내부 이름 축소
- 역할 기준 이름으로 치환 완료

### Phase 5. legacy 자산 삭제
목적:
- 혼선 원인을 코드와 문서에서 제거한다.

수정 파일 후보:
- `scripts/build-car-price-seed.js`
- `supabase/migrations/20260415013000_create_car_prices_and_shadow_diffs.sql`
- `supabase/seed.sql`
- 관련 문서들

종료 조건:
- `car_prices` 가 현재 구조의 일부처럼 읽히지 않음
- 문서도 group-policy only 기준으로 정리됨

### Phase 6. 최종 검증
목적:
- 단순화 후에도 검색/상세가 실제로 깨지지 않는지 확인한다.

검증 범위:
- 테스트
- 검색 API
- 상세 API
- 검색 → 상세 이동 계약
- 프론트 렌더 필수 필드

종료 조건:
- 구조와 응답 설명이 일치
- 테스트 통과
- 남은 예외는 명시적 목록으로만 존재

## 실행 원칙
1. 점검 phase 후에만 구조 변경 phase로 넘어간다
2. 한 phase에는 한 종류의 변경만 넣는다
3. legacy 삭제는 마지막 phase에서만 한다
4. 각 phase는 검증 후 종료한다

## 바로 다음 실행
다음 실제 수정 시작점은 **Phase 1. 사용처 전수 점검** 이다.
이 phase가 끝나야, 무엇을 먼저 바꿀지 순서가 확정된다.

## 이번 문서의 역할
이 문서는 구현 중 참고 메모가 아니라 **실행 순서와 종료 조건의 기준점**이다.
다음 변경은 이 문서를 기준으로만 판단한다.
