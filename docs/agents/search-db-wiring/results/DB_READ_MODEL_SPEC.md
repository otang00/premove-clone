# 1. 결론
- 검색 DB read model 은 Supabase `cars` + `reservations` 를 기준으로 하되, 가격/딜리버리 규칙은 별도 `car_prices`·`delivery_price_rules` 보조 테이블로 분리해 계산 일관성을 확보한다.
- 예약 겹침 차단은 `reservations.status ∈ {pending, confirmed, paid}` AND 시간 구간 겹침(`requestedStart < end_at` AND `requestedEnd > start_at`)을 만족하는 row 를 blocking 으로 본다. end 시각은 반열림 구간으로 처리해 동일 시각 복귀 직후 재대여를 허용한다.
- DB 검색 서비스(`server/search-db/dbSearchService.js`)는 (1) 검색 파라미터 정규화 결과를 입력으로 받아 (2) Supabase에서 후보 차량을 조회하고 (3) 예약 테이블과 가격/딜리버리 규칙을 조인해 (4) 프론트 DTO shape (`mapPartnerSearchDto`) 로 매핑하는 책임을 진다.

# 2. 근거 파일
- `docs/present/CURRENT_STATE_PRESENT.md`
- `docs/present/ROADMAP_PRESENT.md`
- `docs/present/VALIDATION_PRESENT.md`
- `docs/present/PARALLEL_WORKSTREAMS_PRESENT.md`
- `docs/present/IMPLEMENTATION_RULES_PRESENT.md`
- `docs/present/DECISIONS_PRESENT.md`
- `docs/05_DETAIL_DB_INTEGRATION_PHASE1.md`
- `docs/past/ims-sync/2026-04-14_IMS_RESERVATION_DB_SYNC_SPEC_PAST.md`
- `docs/past/ims-sync/2026-04-14_IMS_SYNC_PHASE3_DB_SCHEMA_PAST.md`
- `docs/past/ims-sync/2026-04-14_PHASE_ROADMAP_DB_FIRST_PAST.md`
- `server/supabase/fetchCarBySourceCarId.js`
- `supabase/migrations/20260414_create_cars.sql`
- `supabase/migrations/20260414195200_create_ims_sync_tables.sql`
- `supabase/migrations/20260414213000_fix_reservations_upsert_unique.sql`
- `server/partner/mapPartnerDto.js`

# 3. 필요한 테이블/필드
## 3.1 `cars` (검색 기준 테이블)
| 필드 | 용도 | 비고 |
| --- | --- | --- |
| `id` (uuid) | 내부 pk | Supabase 기본키, 조회/업데이트 기준 |
| `source_car_id` (bigint, unique) | partner `carId`와 1:1 매핑 | 상세 병합에서도 동일 기준 (근거: `docs/05_DETAIL_DB_INTEGRATION_PHASE1.md`, `server/detail/mergeCarDetailSources.js`) |
| `source_group_id` (bigint) | 동일 차량군 묶음 | 정렬/가격 그룹 및 detail fallback 용도 |
| `name`, `display_name` | 카드 노출명 | `mapPartnerDto` 가 요구하는 `name` 유지 |
| `image_url` | 썸네일 | partner 이미지 fallback 존재하나 DB 우선 (근거 동일) |
| `model_year` | 연식 기준 | `min/maxModelYear` 를 동일 값으로 채우고, partner 추가 데이터가 있으면 override |
| `fuel_type` | `oilType` 매핑 | |
| `seats` | `capacity` 변환 | 정수 저장 → 문자열 가공 |
| `rent_age` | `driverAge` 필터 | 검색 파라미터(`driverAge` 21/26) 대비 최소 연령 비교 |
| `active` (bool) | 노출 여부 | `idx_cars_active` 로 빠른 필터 (근거: migration) |
| `options_json` (jsonb) | 옵션 라벨 목록 | `options_json.names` → DTO `options` (근거: detail merge) |
| `metadata` (jsonb) | 파생 정보 저장 | 가격 정책, 딜리버리 지원 범위 등 도메인 확장 필드 저장 |
| `created_at`, `updated_at` | 추적 | trigger 로 유지 |

추가 파생 뷰: `car_read_model_view`
- SELECT 위 필드 + `COALESCE(metadata->>'min_model_year', model_year)` 등 변환 컬럼을 포함한 뷰/SQL helper 를 마련하면 카드 DTO 매핑 전처리가 단순해진다.

## 3.2 가격·딜리버리 규칙 (보조 테이블)
근거: `docs/past/ims-sync/2026-04-14_PHASE_ROADMAP_DB_FIRST_PAST.md` 의 `car_prices`·`delivery_price_rules` 권장 구조.
- `car_prices`
  - `car_id` (cars.pk 또는 source_car_id)
  - `valid_from`, `valid_to`
  - `base_daily_price`, `weekend_daily_price`, `insurance_daily_price`
  - `discount_rule_json`
  - `is_active`
- `delivery_price_rules`
  - `company_id` or `car_id`
  - `region_code`(=dongId), `round_trip_price`
  - `holiday`, `weekend_multiplier`

이 2개는 가격 계산 helper (`priceCalculator`) 와 delivery surcharge 구간 계산에 필요하다. 현재 Supabase schema에는 없으므로 **신규 테이블 설계가 필요**하다.

## 3.3 `reservations`
- 필드/인덱스는 `supabase/migrations/20260414195200_create_ims_sync_tables.sql` + Phase3 문서 기준 유지.
- 검색 가용성 계산에 반드시 활용할 컬럼:
  - `car_id`: IMS 실차 id (`car.id`). 향후 `cars.source_car_id` 와의 변환 테이블이 필요하면 `car_id` 대신 `source_car_id` 로 매핑하는 helper 를 둔다. (**확인 필요**)
  - `status`, `status_raw`: 내부/외부 상태. blocking 규칙은 4절 참조.
  - `start_at`, `end_at`: 예약 구간. `end_at > start_at` 제약으로 데이터 품질 확보.
  - `pickup_option`, `delivery_region_id`: 배송형 검색 시 같은 주소/옵션 예약만 차단할 것인지 결정 가능.
  - `last_synced_at`: shadow mode 중 최신 데이터 여부 판단.

## 3.4 조회 지원 뷰/테이블 제안
- `car_availability_windows` (뷰)
  - SELECT `car_id`, `start_at`, `end_at`, `status`
  - WHERE `status IN blockingStatuses` AND `end_at >= now() - buffer`
- `search_sessions` + `search_session_cars`
  - Phase roadmap 기준, 검색결과 snapshot 저장에 필요. read model 자체는 아니지만 shadow mode/상세 전환 준비에 필수. (**확인 필요**: 이미 구현된지 여부)

# 4. blocking status 규칙
1. **차단 상태 세트** (근거: `docs/past/ims-sync/2026-04-14_IMS_RESERVATION_DB_SYNC_SPEC_PAST.md`)
   - `pending`: 예약이 접수되었으나 확정 전 → 재고 잠금 필요.
   - `confirmed`: 사내 확정 → 반드시 차단.
   - `paid`: 결제 완료 → 차단.
2. **제외 상태**
   - `cancelled`, `failed`, `completed`: 재고에 영향 없음. 단, `completed` 는 `end_at` 이전이라면 여전히 점유할 수 있으므로 `end_at <= now()` 조건을 함께 확인.
3. **status_raw 매핑**
   - IMS 원본 `status_raw` 전체 enum 은 아직 수집 중 → `statusMapping.json` 과 같은 레퍼런스를 만들어 `raw → 내부 status` 를 관리해야 한다. **확인 필요**
4. **동기화 지연 처리**
   - `last_synced_at` 이 `now() - 10m` 보다 오래되면 shadow mode 에서 경고 flag 를 남겨 파트너 결과와 비교 시 차이를 설명할 수 있게 한다.

# 5. overlap rule
- 시간대는 Asia/Seoul 기준 ISO 문자열을 `Date` 대신 `luxon` 등 타임존 안전 라이브러리로 파싱한다. (근거: `buildPartnerUrl.js` 가 문자열 기반이므로 서버 서비스가 명확하게 UTC 변환해야 함.)
- 요청 구간: `[deliveryDateTime, returnDateTime)` (end exclusive) — return 이 start 와 같으면 0길이로 간주해 예약 가능.
- 겹침 조건: `existing.start_at < requestedEnd` AND `existing.end_at > requestedStart`.
- 버퍼 정책:
  - `pickupOption = delivery` 인 경우 배송/회수 이동 시간을 고려해 ±30분 버퍼를 둘지 여부 **확인 필요**. 현 DB에는 버퍼 필드가 없어 정책 결정이 필요하다.
- Long rental(월렌트) 대비:
  - 24시간 이상 요청도 동일 공식 사용. `end_at - start_at` 값이 길수록 가격 계산에서 일수/주말 분리를 처리.
- Race condition 방지:
  - 읽기 후 쓰기 사이에 신규 예약이 들어올 수 있으므로, 예약 확정 단계에서 동일 overlap 체크를 DB transaction 안에서 1회 더 수행한다. (근거: `Phase_ROADMAP_DB_FIRST` 의 "예약 확정 직전 재검증" 규칙)

# 6. 조회 흐름도
1. **입력 정규화**
   - 기존 `normalizeSearchState`/`validateSearchState` (근거: `server/partner/buildPartnerUrl.js`) 재사용 → `normalizedSearch` 확보.
2. **후보 차량 조회**
   - Supabase RPC/REST로 `cars` 조회.
   - 필터: `active = true`, `rent_age <= driverAge`, (선택) `metadata->>'pickup_option'` 포함 여부.
   - Delivery 검색 시 `metadata.delivery_regions` 또는 별도 매핑 테이블에서 `dongId` 지원 여부 확인 (데이터 미정 → **확인 필요**).
3. **가격 조인**
   - `car_prices` 에서 해당 기간(`valid_from <= deliveryDateTime`, `valid_to >= returnDateTime`)과 pickup option에 맞는 요율을 가져와 `basePrice` / `discountPrice` / `deliveryPrice` 계산.
   - 규칙: `order === 'lower'` → `discountPrice` ASC, `higher` → DESC, `newer` → `model_year` DESC.
4. **예약 겹침 필터**
   - `reservations` subquery: status in blocking set, overlap rule 적용.
   - delivery 검색 시 `delivery_region_id` 가 동일하거나 NULL 인 예약만 차단할지 여부 정의 필요 (**확인 필요**). 기본은 차량 단위 전부 차단.
5. **DTO 매핑**
   - `mapPartnerSearchDto` 와 동일 shape: `search`, `company`, `cars`, `totalCount`.
   - `company` 정보는 임시로 config/metadata (예: Supabase `companies` 테이블 또는 `.env`)에서 공급. 장기적으로 회사 정보 테이블 필요.
6. **search session 기록 (선택)**
   - Shadow mode/상세 전환을 준비하기 위해 `search_session` 테이블에 `normalizedSearch` + `cars` snapshot 저장.
7. **응답/메타**
   - `meta.source = 'db-search'`, `meta.diff` (shadow mode 시) 등 부가 정보 포함.

# 7. 추천 서버 파일 구조
```
server/
  search-db/
    dbSearchService.js          # public run({ search }) → dto
    repositories/
      fetchCandidateCars.js     # Supabase cars 조회 + 기본 필터
      fetchBlockingReservations.js # reservations overlap 쿼리
      fetchPriceRules.js        # car_prices/delivery_price_rules 조회
    helpers/
      buildSearchWindow.js      # datetime 파싱/버퍼 적용
      mapStatusRules.js         # status_raw → blocking 여부
      overlap.js                # 구간 겹침 계산 (테스트 포함)
      priceCalculator.js        # base/discount/delivery price 산출
      dtoMapper.js              # DB result → mapPartnerSearchDto 입력 형태
    transformers/
      composeReadModel.js       # cars + 가격 + 가용성 결합
```
- Supabase 호출은 기존 `server/supabase/fetchCarBySourceCarId.js` 패턴을 일반화해 `server/supabase/createRestClient.js` helper 로 공유.
- DTO mapper 는 partner/DB 공용 shape 유지 (근거: `IMPLEMENTATION_RULES_PRESENT.md` Rule 3).

# 8. 변경 제안 파일
- `server/search-db/dbSearchService.js` (신규)
- `server/search-db/helpers/overlap.js`, `helper/statusRules.js`, `helper/priceCalculator.js`
- `server/search-db/repositories/fetchCandidateCars.js`
- `server/search-db/repositories/fetchBlockingReservations.js`
- `server/search-db/repositories/fetchPriceRules.js`
- `docs/schema/car_prices.sql` (또는 Supabase migration 신규 파일)
- `docs/schema/delivery_price_rules.sql`
- `docs/agents/search-db-wiring/results/DB_READ_MODEL_SPEC.md` (본 문서)

# 9. 금지/주의 파일
- 금지 (shared choke points, 근거: `IMPLEMENTATION_RULES_PRESENT.md`):
  - `api/search-cars.js`
  - `src/utils/searchQuery.js`
  - `src/services/cars.js`
  - `server/partner/buildPartnerUrl.js`
  - `server/partner/mapPartnerDto.js`
- 주의:
  - `server/detail/mergeCarDetailSources.js` (상세 merge 용도이므로 검색 로직 혼합 금지)
  - `server/partner/*` 전체 (DB 로직 삽입 금지)
  - `supabase/migrations/*` 수정 시 반드시 새 migration 파일 작성

# 10. 위험요소 / 확인 필요 사항
- `status_raw` 전체 enum 미수집 → mapping 테이블 부재 (**확인 필요**).
- `reservations.car_id` (IMS 실차 id) 와 `cars.source_car_id` 가 1:1 로 매핑되는지, 별도 `ims_car_mappings` 가 필요한지 불명 (**확인 필요**).
- 가격 데이터(`car_prices`)가 아직 적재되지 않았으므로 DB 검색 시 가격/정렬 재현 불가. 우선 partner 가격을 metadata 에 캐싱하는 임시 플랜이 필요한지 결정해야 함.
- `deliveryCostList`/`deliveryTimes` 정보를 어디서 공급할지 미정. metadata 혹은 새 `companies` 테이블 필요 (**확인 필요**).
- Delivery 검색시 `dongId` → region 매핑 데이터 소스 없음. 딜리버리 가능 지역이 Supabase에 없는 상태에서 DB 검색을 개시하면 partner/DB 결과가 상이해질 수 있다.
- Shadow mode 비교 시 `last_synced_at` 지연으로 인해 상태 불일치 가능. 동기화 지연 허용치를 결정해야 함.

# 11. 다음 단계
1. **상태 매핑 수집**: 최신 IMS 예약 샘플을 추출해 `status_raw → status` 매핑표를 작성하고 blocking 세트를 확정.
2. **가격/딜리버리 테이블 설계**: `car_prices`, `delivery_price_rules` migration 초안을 만들고 실제 운영 데이터 입력 계획 수립.
3. **car_id 매핑 확인**: `reservations.car_id` 값 샘플과 `cars.source_car_id` 를 비교해 매핑 전략을 잠근다. 필요 시 매핑 테이블/migration 추가.
4. **dbSearchService skeleton**: `server/search-db/` 디렉터리 생성, helper/repository stub 작성, overlap/정렬 unit test 추가.
5. **shadow mode 준비**: Agent C 결과와 연동해 DB 검색 결과를 병렬로 호출하고 diff 로깅 할 수 있도록 service 인터페이스를 확정.
6. **company/delivery static data 정리**: 검색 DTO 의 `company` 블록을 Supabase config 또는 환경변수 기반으로 임시 공급하고, 장기 테이블 설계 여부를 결정.
