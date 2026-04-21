# rentcar00-booking-system booking core 실행 준비 문서

## 문서 상태
- 상태: active present
- 용도: 다음 구현 단계인 booking core 준비와 실행 기준 잠금
- 성격: 실행 준비 문서
- 기준 브랜치: `feat/db-preview-home`
- 직전 완료 문서:
  - `docs/past/present-history/2026-04-21-2051_RENAME_EXECUTION_CURRENT_PAST.md`
  - `docs/past/present-history/2026-04-21-2051_RENAME_SCOPE_CHECKLIST_PAST.md`
  - `docs/past/present-history/2026-04-21-2051_RENTCAR00_DB_EXECUTION_CURRENT_PAST.md`

---

## 0. 목적

이 문서는 아래 4가지를 잠그기 위해 만든다.

1. 다음 구현의 실제 시작점
2. booking core 테이블 책임 구분
3. unified blocking 계산 기준
4. 구현 전 반드시 잠가야 할 정책 항목

현재 단계는 rename 이 아니다.
현재 단계는 **local booking 원장 + mapping + blocking 구조** 준비다.

---

## 1. 현재 기준점

### 1.1 이미 끝난 것
- 프로젝트명 `rentcar00-booking-system` 기준 정리 완료
- Vercel public alias `rentcar00-booking-system.vercel.app` 정상 연결 완료
- IMS sync read model 물리 테이블명 `ims_sync_reservations` 정리 완료
- 관련 코드 실참조는 `ims_sync_reservations` 기준으로 정합 확인 완료
- rename 관련 커밋 기준점 확보 완료

### 1.2 이미 잠긴 구조 원칙
- local 예약 원장은 별도 local-owned 테이블이 가져간다.
- `ims_sync_reservations` 는 IMS sync read model 이다.
- 차량 차단 기준은 local 단독도, IMS 단독도 아니다.
- 최종 차단 기준은 `unified blocking set` 이다.
- local 예약과 IMS 예약의 중복 해소는 `reservation_mappings` 로 한다.

### 1.3 지금부터 다룰 핵심 질문
1. local 원장 테이블을 어떤 구조로 시작할 것인가
2. mapping 을 어떤 최소 컬럼으로 잠글 것인가
3. 어떤 상태가 blocking 인가
4. 결제 직후, IMS 미반영 상태를 어떻게 처리할 것인가
5. 취소 authority 와 tombstone 기준을 어떻게 둘 것인가

---

## 2. 다음 구현의 범위

### 2.1 이번 문서 기준 포함 범위
- `booking_orders` 책임과 최소 스키마 초안
- `reservation_mappings` 책임과 최소 스키마 초안
- `reservation_status_events` 필요 여부와 역할 잠금
- `booking_lookup_keys` 필요 여부와 역할 잠금
- local blocking 상태 집합 잠금
- `booking_orders` 생성 시점 vs blocking 시작 시점 잠금
- IMS 생성 idempotency 기준 잠금
- 취소 authority / tombstone 기준 잠금
- unified blocking set 계산 입력 규칙 잠금

### 2.2 이번 문서 기준 제외 범위
- 실제 결제 연동 구현
- 예약 생성 API 구현
- 비회원 조회 UI 구현
- 운영/admin 화면 구현
- push/deploy

---

## 3. 현재 추천 시작 구조

### 3.1 `booking_orders`
목적:
- 홈페이지 예약의 local source of truth

최소 책임:
- 공개 예약번호 발급 기준
- 고객 식별 기준
- 결제 상태
- 내부 예약 상태
- 차량 / 일정 / 가격 스냅샷
- 취소 / 환불 / 수동개입 분기

### 3.2 `reservation_mappings`
목적:
- local 예약과 IMS 예약을 동일 논리 예약으로 묶는 연결 계층

최소 책임:
- `booking_order_id -> ims_reservation_id` 연결
- sync 성공 / 실패 / 수동확인 상태 관리
- dedupe 판단의 기준 제공

### 3.3 `reservation_status_events`
목적:
- 상태 변경 이력 저장

필요 이유:
- 결제 성공 직후
- IMS 생성 실패
- 취소 동기화 실패
- 수동보정 개입

이런 경계 상태를 원장 테이블 한 줄만으로 설명하기 어렵기 때문이다.

### 3.4 `booking_lookup_keys`
목적:
- 비회원 예약조회 인증용 lookup 데이터 저장

최소 책임:
- 공개 예약번호 조회 보조
- 전화번호 뒤4자리/해시 기반 1차 인증 지원

---

## 4. 이번 단계에서 먼저 잠글 정책

### 4.1 local blocking 상태 집합
초기 잠금 후보:
- `payment_pending_hold`
- `payment_succeeded`
- `confirmed_pending_sync`
- `confirmed`
- `in_use`

비차단 후보:
- `draft`
- `payment_failed`
- `cancelled`
- `refunded`
- `completed`

### 4.2 생성 시점 vs blocking 시작 시점
현재 추천:
- `booking_orders` 생성은 결제 흐름 진입 전에도 가능
- 하지만 blocking 은 `payment_pending_hold` 부터 시작
- hold TTL 은 별도 잠금 필요

### 4.3 IMS 생성 idempotency
현재 추천:
- local 예약 1건당 외부 전송 기준키 1개 유지
- 재시도 시 동일 external key 로 중복 생성 방지
- mapping 생성 실패는 정상 완료가 아니라 `manual_review_required` 대상

### 4.4 취소 authority
현재 추천:
- 고객/서비스 기준 원장은 local 우선
- IMS 취소 실패가 local 취소를 되돌리면 안 됨
- 대신 운영 확인 큐로 올린다.

### 4.5 tombstone
현재 추천:
- IMS 배치에서 예약이 일시 누락됐다고 즉시 삭제로 간주하지 않는다.
- `빵빵카 예약 시스템 원장` 과 연결된 건은 자동 제거 금지
- stale / missing / deleted 추정 상태를 분리해 다룬다.

### 4.6 `booking_orders` 최소 컬럼 초안
#### 핵심 식별
- `id`
- `public_reservation_code`
- `booking_channel`

#### 고객 식별
- `customer_name`
- `customer_phone`
- `customer_phone_last4`

#### 예약 대상 / 일정
- `car_id`
- `pickup_at`
- `return_at`
- `pickup_method`
- `pickup_location_snapshot`
- `return_location_snapshot`

#### 가격 / 결제 스냅샷
- `quoted_total_amount`
- `payment_status`
- `payment_provider`
- `payment_reference_id`
- `pricing_snapshot`

#### 내부 상태 / 운영 상태
- `booking_status`
- `sync_status`
- `manual_review_required`
- `cancelled_at`
- `completed_at`

#### 공통 메타
- `created_at`
- `updated_at`

#### 현재 잠금 메모
- 예약 원장은 고객 조회, 결제 결과, 내부 상태의 기준이므로 `ims_sync_reservations` 와 책임이 겹치면 안 된다.
- 차량/일정/가격은 조회 기준을 위해 최소 snapshot 이 필요하다.
- `payment_status`, `booking_status`, `sync_status` 는 한 컬럼으로 뭉개지지 않게 분리한다.

### 4.7 `reservation_mappings` 최소 컬럼 초안
#### 연결 키
- `id`
- `booking_order_id`
- `external_system`
- `external_reservation_id`
- `ims_reservation_id`

#### 동기화 상태
- `mapping_status`
- `last_sync_attempt_at`
- `last_sync_success_at`
- `last_sync_error_code`
- `last_sync_error_message`

#### idempotency / 추적
- `external_request_key`
- `created_at`
- `updated_at`

#### 현재 잠금 메모
- 목적은 local 예약과 외부 예약을 같은 논리 예약으로 묶는 것이다.
- dedupe 기준은 `booking_order_id` 와 `ims_reservation_id` 연결 여부다.
- `external_request_key` 는 IMS 재전송 시 중복 생성 방지 기준으로 유지한다.

### 4.8 보조 테이블 채택 기준
#### `reservation_status_events`
- 채택 권장
- 이유: 결제 성공, IMS 생성 실패, 취소 동기화 실패, 수동 보정 이력을 원장 한 줄로 흡수하면 상태 해석이 깨진다.
- 최소 컬럼 후보:
  - `id`
  - `booking_order_id`
  - `event_type`
  - `event_payload`
  - `created_at`

#### `booking_lookup_keys`
- 채택 권장
- 이유: 비회원 조회 인증 로직과 원장 본문을 분리해야 lookup 정책 변경이 쉬워진다.
- 최소 컬럼 후보:
  - `id`
  - `booking_order_id`
  - `lookup_type`
  - `lookup_value_hash`
  - `lookup_value_last4`
  - `verified_at`
  - `created_at`

### 4.9 현재 기준 잠금 결론
1. 이번 booking core 시작 테이블은 `booking_orders` 와 `reservation_mappings` 두 개를 필수로 본다.
2. `reservation_status_events` 는 사실상 필수 보조 테이블로 본다.
3. `booking_lookup_keys` 는 비회원 조회를 고려하면 초기부터 두는 쪽이 유리하다.
4. local blocking 기준은 `booking_orders.booking_status` 와 `payment_status` 조합으로 해석하되, 외부 sync 상태는 별도 `sync_status` 로 분리한다.
5. 다음 단계에서는 위 초안을 바탕으로 상태 enum 과 null 허용 범위를 잠근다.

### 4.10 상태 enum 초안
#### `booking_orders.booking_status`
- `draft`
- `payment_pending_hold`
- `payment_succeeded`
- `confirmed_pending_sync`
- `confirmed`
- `in_use`
- `cancelled`
- `completed`
- `manual_review_required`

#### `booking_orders.payment_status`
- `not_started`
- `pending`
- `authorized`
- `paid`
- `failed`
- `cancelled`
- `refunded`

#### `booking_orders.sync_status`
- `not_required`
- `pending`
- `syncing`
- `synced`
- `sync_failed`
- `cancel_sync_pending`
- `cancel_synced`
- `cancel_sync_failed`
- `stale_check_required`

#### `reservation_mappings.mapping_status`
- `pending`
- `linked`
- `sync_failed`
- `cancel_pending`
- `cancel_failed`
- `manual_review_required`
- `closed`

#### 현재 잠금 메모
- `booking_status` 는 고객/서비스 기준 상태다.
- `payment_status` 는 PG/결제 흐름 기준 상태다.
- `sync_status` 와 `mapping_status` 는 외부 연동 기준 상태다.
- 하나의 enum 으로 뭉치지 않고 책임 축을 분리한다.

### 4.11 null 허용 범위 초안
#### `booking_orders` 필수 컬럼
- `id`
- `booking_channel`
- `customer_name`
- `customer_phone`
- `customer_phone_last4`
- `car_id`
- `pickup_at`
- `return_at`
- `pickup_method`
- `quoted_total_amount`
- `payment_status`
- `booking_status`
- `sync_status`
- `created_at`
- `updated_at`

#### `booking_orders` 조건부 nullable 컬럼
- `public_reservation_code`
  - 결제 성공 전 nullable 허용
- `payment_provider`
  - 결제 미시작이면 nullable 허용
- `payment_reference_id`
  - 결제 승인 전 nullable 허용
- `pricing_snapshot`
  - 초안 단계에서는 nullable 허용 가능, 최종 구현 전에는 기본 채움 권장
- `pickup_location_snapshot`
  - 픽업 방식에 따라 nullable 가능
- `return_location_snapshot`
  - 반납 방식에 따라 nullable 가능
- `cancelled_at`
  - 취소 전 nullable
- `completed_at`
  - 완료 전 nullable

#### `reservation_mappings` 필수 컬럼
- `id`
- `booking_order_id`
- `external_system`
- `mapping_status`
- `created_at`
- `updated_at`

#### `reservation_mappings` 조건부 nullable 컬럼
- `external_reservation_id`
  - 외부 생성 전 nullable 허용
- `ims_reservation_id`
  - IMS 연결 전 nullable 허용
- `last_sync_attempt_at`
  - 첫 시도 전 nullable
- `last_sync_success_at`
  - 성공 전 nullable
- `last_sync_error_code`
  - 실패 전 nullable
- `last_sync_error_message`
  - 실패 전 nullable
- `external_request_key`
  - 구현상 초기 생성 시점 즉시 채우는 쪽을 권장하지만, 문서 단계에서는 조건부 nullable 허용

#### 현재 잠금 메모
- 결제 전, 외부 sync 전, 완료 전 상태 때문에 nullable 컬럼은 일부 필요하다.
- 다만 상태 컬럼과 핵심 일정/차량/고객 식별값은 nullable 로 두지 않는다.
- nullable 은 편의가 아니라 상태 전이 때문에 필요한 경우에만 허용한다.

### 4.12 hold TTL 초안
#### 기본 규칙
- 차량 blocking 시작 시점은 `booking_status = payment_pending_hold` 부터다.
- 기본 hold TTL 은 `3분` 으로 잠근다.
- TTL 만료 후 결제 성공이 확인되지 않으면 hold 는 자동 소멸 대상이다.

#### 상태 해석
- `draft`
  - 비차단
- `payment_pending_hold`
  - 차단
  - 단, hold TTL 안에서만 유효
- `payment_succeeded`
  - 차단
- `confirmed_pending_sync`
  - 차단
- `confirmed`
  - 차단
- `in_use`
  - 차단
- `cancelled`, `completed`
  - 비차단

#### 구현 메모
- hold 소멸 판단용 기준 시각 컬럼이 필요하다.
- 후보:
  - `hold_started_at`
  - `hold_expires_at`
- 결제 승인 직전 또는 예약 확정 직전에 availability 재검증 단계를 두는 쪽이 안전하다.

### 4.13 현재 단계 최종 결론
1. `booking_orders` 는 `booking_status`, `payment_status`, `sync_status` 3축 분리 구조로 간다.
2. `reservation_mappings` 는 `mapping_status` 와 외부 연결 키를 분리 보관한다.
3. 핵심 식별/차량/일정/상태 컬럼은 nullable 금지로 간다.
4. 결제 성공 전 공개 예약번호와 외부 예약 ID 는 nullable 허용으로 간다.
5. hold TTL 은 3분 기준으로 먼저 잠근다.
6. 3분은 전환율보다 재고 회전 보호를 더 우선하는 보수적 기준이다.
7. 다음 단계는 enum/null/TTL 초안을 바탕으로 migration 설계 입력 문서를 만드는 것이다.

---

## 5. Phase 1 migration 초안

### 5.1 목표
- booking core 최초 migration 에서 어떤 테이블을 어떤 순서로 만들지 잠근다.
- enum/null/TTL 기준이 실제 SQL 구조로 내려갈 수 있는 수준까지 정리한다.
- 아직 실제 SQL 문장을 쓰는 단계는 아니고, migration 설계 입력을 완성하는 단계다.

### 5.2 생성 대상 테이블 순서
#### 1. `booking_orders`
가장 먼저 만든다.
이유:
- local source of truth 이기 때문이다.
- 나머지 보조 테이블이 모두 이를 참조한다.

#### 2. `reservation_mappings`
두 번째로 만든다.
이유:
- `booking_orders` 를 FK 로 참조해야 한다.
- IMS sync 와 dedupe 연결의 핵심 테이블이다.

#### 3. `reservation_status_events`
세 번째로 만든다.
이유:
- 상태 이력 테이블이라 `booking_orders` 참조가 선행되어야 한다.

#### 4. `booking_lookup_keys`
네 번째로 만든다.
이유:
- 조회 인증 보조 테이블이라 원장 참조가 선행되어야 한다.

### 5.3 테이블별 핵심 제약 초안
#### `booking_orders`
- PK: `id`
- unique: `public_reservation_code`
  - 단, nullable 상태를 허용하므로 partial unique 또는 발급 후 unique 보장이 필요하다.
- FK: `car_id -> cars.id`
- check:
  - `return_at > pickup_at`
  - `quoted_total_amount >= 0`
- 필요 컬럼:
  - `hold_started_at`
  - `hold_expires_at`
- 상태 컬럼:
  - `booking_status`
  - `payment_status`
  - `sync_status`

#### `reservation_mappings`
- PK: `id`
- FK: `booking_order_id -> booking_orders.id`
- unique 후보:
  - `booking_order_id` on active mapping
  - `ims_reservation_id` when not null
  - `external_request_key` when not null
- check:
  - `external_system` 은 초기 구현에서 `ims` 로 고정 가능

#### `reservation_status_events`
- PK: `id`
- FK: `booking_order_id -> booking_orders.id`
- index:
  - `(booking_order_id, created_at desc)`

#### `booking_lookup_keys`
- PK: `id`
- FK: `booking_order_id -> booking_orders.id`
- index / unique 후보:
  - `(lookup_type, lookup_value_hash)`
  - `(booking_order_id, lookup_type)`

### 5.4 index 초안
#### `booking_orders`
목적별 index 후보:
- `(car_id, pickup_at, return_at)`
  - local blocking 계산 보조
- `(booking_status, hold_expires_at)`
  - hold 만료 정리 / 차단 판단 보조
- `(payment_status, created_at desc)`
  - 결제 추적 보조
- `(sync_status, updated_at desc)`
  - sync 실패 / 운영 추적 보조
- `(customer_phone_last4, created_at desc)`
  - 조회 보조, 단 단독 인증 기준으로 쓰지 않는다.

#### `reservation_mappings`
- `(booking_order_id)`
- `(ims_reservation_id)`
- `(mapping_status, updated_at desc)`
- `(external_request_key)`

#### `reservation_status_events`
- `(booking_order_id, created_at desc)`
- `(event_type, created_at desc)`

#### `booking_lookup_keys`
- `(lookup_type, lookup_value_hash)`
- `(booking_order_id, created_at desc)`

### 5.5 migration 분리 원칙
현재 추천:
1. migration 1
- `booking_orders`
- `reservation_mappings`

2. migration 2
- `reservation_status_events`
- `booking_lookup_keys`

이유:
- 원장 + mapping 을 먼저 세우고,
- 이력/조회 보조는 한 단계 뒤에 올리는 편이 rollback 과 검증이 쉽다.

### 5.6 구현 비범위
이번 migration 초안 단계에서 하지 않는 것:
- PG 결제사 세부 컬럼 확정
- IMS API payload 전체 raw 저장 구조 확정
- admin 전용 운영 큐 테이블 추가
- 취소/환불 상세 회계 구조 설계
- coupon/discount/point 구조 설계

### 5.7 검증 포인트
#### 구조 검증
- `booking_orders` 없이도 다른 테이블이 생성 가능한 구조가 아니어야 한다.
- `reservation_mappings` 가 없으면 dedupe 설명이 불가능해야 한다.
- 상태 이력과 lookup 인증이 원장 본문을 오염시키지 않아야 한다.

#### 규칙 검증
- 3분 hold TTL 을 담을 컬럼이 실제로 존재해야 한다.
- `public_reservation_code` 는 결제 성공 전 nullable 이 가능해야 한다.
- `ims_reservation_id` 는 sync 전 nullable 이 가능해야 한다.
- 동일 local 예약 재전송 시 `external_request_key` 로 idempotency 설명이 가능해야 한다.

#### 운영 검증
- sync 실패건을 `sync_status` / `mapping_status` 로 분리 추적 가능해야 한다.
- 취소 실패건을 상태 이벤트로 남길 수 있어야 한다.
- 비회원 조회 로직이 원장 본문 스키마를 과도하게 오염시키지 않아야 한다.

### 5.8 현재 migration 초안 결론
1. 최초 booking core migration 의 중심은 `booking_orders` 와 `reservation_mappings` 다.
2. `reservation_status_events` 와 `booking_lookup_keys` 는 초기부터 두는 쪽이 유리하지만 migration 을 분리한다.
3. `hold_started_at`, `hold_expires_at` 는 Phase 1 에서 바로 넣는다.
4. `public_reservation_code`, `ims_reservation_id`, `external_request_key` 는 상태 전이 시점 때문에 조건부 nullable 을 허용한다.
5. 다음 phase 는 실제 SQL migration 문안 초안 작성이다.

---

## 6. SQL 문안 초안

### 6.1 `booking_orders` SQL 초안
```sql
create table if not exists public.booking_orders (
  id uuid primary key default gen_random_uuid(),
  public_reservation_code text,
  booking_channel text not null,

  customer_name text not null,
  customer_phone text not null,
  customer_phone_last4 text not null,

  car_id uuid not null references public.cars(id),
  pickup_at timestamptz not null,
  return_at timestamptz not null,
  pickup_method text not null,
  pickup_location_snapshot jsonb,
  return_location_snapshot jsonb,

  quoted_total_amount numeric(12, 2) not null,
  pricing_snapshot jsonb,
  payment_provider text,
  payment_reference_id text,

  booking_status text not null,
  payment_status text not null,
  sync_status text not null,
  manual_review_required boolean not null default false,

  hold_started_at timestamptz,
  hold_expires_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_orders_return_after_pickup
    check (return_at > pickup_at),
  constraint booking_orders_amount_nonnegative
    check (quoted_total_amount >= 0)
);
```

#### 후속 제약 / index 초안
```sql
create unique index if not exists uq_booking_orders_public_reservation_code
  on public.booking_orders (public_reservation_code)
  where public_reservation_code is not null;

create index if not exists idx_booking_orders_car_period
  on public.booking_orders (car_id, pickup_at, return_at);

create index if not exists idx_booking_orders_booking_status_hold_expires
  on public.booking_orders (booking_status, hold_expires_at);

create index if not exists idx_booking_orders_payment_status_created_at
  on public.booking_orders (payment_status, created_at desc);

create index if not exists idx_booking_orders_sync_status_updated_at
  on public.booking_orders (sync_status, updated_at desc);
```

#### 현재 해석 메모
- enum 은 PostgreSQL native enum 보다 text + check 또는 app enum 고정이 현재 변경 대응에 유리하다.
- `hold_started_at`, `hold_expires_at` 는 3분 hold 정책 때문에 Phase 1 에 바로 넣는다.
- `public_reservation_code` 는 결제 성공 후 발급이라 partial unique 로 간다.

### 6.2 `reservation_mappings` SQL 초안
```sql
create table if not exists public.reservation_mappings (
  id uuid primary key default gen_random_uuid(),
  booking_order_id uuid not null references public.booking_orders(id) on delete cascade,
  external_system text not null,
  external_reservation_id text,
  ims_reservation_id text,
  mapping_status text not null,

  external_request_key text,
  last_sync_attempt_at timestamptz,
  last_sync_success_at timestamptz,
  last_sync_error_code text,
  last_sync_error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### 후속 제약 / index 초안
```sql
create unique index if not exists uq_reservation_mappings_booking_order_active
  on public.reservation_mappings (booking_order_id);

create unique index if not exists uq_reservation_mappings_ims_reservation_id
  on public.reservation_mappings (ims_reservation_id)
  where ims_reservation_id is not null;

create unique index if not exists uq_reservation_mappings_external_request_key
  on public.reservation_mappings (external_request_key)
  where external_request_key is not null;

create index if not exists idx_reservation_mappings_mapping_status_updated_at
  on public.reservation_mappings (mapping_status, updated_at desc);
```

#### 현재 해석 메모
- 초기 구현에서는 `external_system = 'ims'` 로 고정해도 된다.
- `external_request_key` 는 IMS 재시도 idempotency 기준이다.
- `booking_order_id` unique 는 local 예약 1건당 active mapping 1건을 강하게 가정한 구조다.

### 6.3 보조 테이블 SQL 방향
#### `reservation_status_events`
```sql
create table if not exists public.reservation_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_order_id uuid not null references public.booking_orders(id) on delete cascade,
  event_type text not null,
  event_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reservation_status_events_booking_order_created_at
  on public.reservation_status_events (booking_order_id, created_at desc);
```

#### `booking_lookup_keys`
```sql
create table if not exists public.booking_lookup_keys (
  id uuid primary key default gen_random_uuid(),
  booking_order_id uuid not null references public.booking_orders(id) on delete cascade,
  lookup_type text not null,
  lookup_value_hash text not null,
  lookup_value_last4 text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_lookup_keys_type_hash
  on public.booking_lookup_keys (lookup_type, lookup_value_hash);

create index if not exists idx_booking_lookup_keys_booking_order_created_at
  on public.booking_lookup_keys (booking_order_id, created_at desc);
```

### 6.4 실제 migration 파일 작성 전 최종 체크
1. status 값은 text 컬럼으로 유지하되, DB check constraint 로도 잠근다.
2. `booking_orders.booking_channel` 허용값은 `website / phone / manual_admin` 으로 잠근다.
3. `pickup_method` 허용값은 `pickup / delivery` 로 잠근다.
4. `external_system` 허용값은 초기에는 `ims` 단일값으로 잠근다.
5. `customer_phone` 원문 저장 범위와 마스킹 정책은 구현 직전 재확인한다.
6. `payment_reference_id` 길이와 provider 종속성은 구현 직전 재확인한다.
7. `booking_order_id` unique 는 강제 unique 가 아니라 `mapping_status <> 'closed'` 조건의 partial unique 로 잠근다.

### 6.5 현재 SQL 초안 결론
1. 지금 기준이면 실제 migration 파일 작성 시작 가능하다.
2. text status 는 app enum + DB check constraint 이중 잠금으로 간다.
3. `reservation_mappings.booking_order_id` 는 active mapping 1건만 허용하고, 닫힌 이력은 남길 수 있게 partial unique 로 간다.
4. 보조 테이블은 2차 migration 으로 분리하는 방향을 유지한다.

---

## 7. 바로 다음 작업

다음 작업은 아래 순서로 진행한다.

1. SQL 초안 검토
2. 상태값 check constraint 적용 여부 결정
3. migration 파일 실제 작성
4. dry-run 성격 검토
5. 그 다음에만 DB 반영 여부 판단

---

## 8. 현재 기준 한 문장 요약

**rename 은 끝났고, 이제는 local booking 원장과 mapping, unified blocking 구조를 실제 migration 파일로 내릴 수 있는 SQL 초안까지 잠근 상태다.**
