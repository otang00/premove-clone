# 2026-04-14 19:38 / d7ecfb2 / IMS SYNC PHASE 1 API BASELINE

## 결론
IMS 예약 동기화 Phase 1의 단일 기준 API는 아래로 고정한다.

- `GET https://api.rencar.co.kr/v2/company-car-schedules/reservations`

이 Phase의 목적은 **동기화 요청 규칙을 잠그는 것**이다.

---

## 요청 규칙

### 엔드포인트
- `/v2/company-car-schedules/reservations`

### 기본 헤더
- `Authorization: <captured from logged-in browser session>`
- `Accept: application/json, text/plain, */*`

### 기본 쿼리 전략
- `page`: 1부터 증가
- `base_date`: 실행일 기준 yyyy-mm-dd
- `rental_type=all`
- `status=all`
- `option=customer_name`
- `exclude_returned=false`
- `date_option=start_at`
- `start`: 오늘 - 1일
- `end`: 오늘 + 30일

---

## 왜 이렇게 잡는가
- 초기엔 누락보다 단순성과 재현성을 우선한다.
- IMS 쪽 `exclude_returned` 동작을 아직 완전히 신뢰하지 않고, 우리 DB 기준 active 필터를 별도로 둔다.
- 따라서 수집은 넓게 받고, 운영 active 기준은 우리 쪽에서 다시 자른다.

---

## active 예약 기준
운영 active 기준은 아래로 고정한다.

- `end_at > now()`

즉:
- IMS fetch 범위는 조금 넓게
- 우리 DB 운영 대상은 아직 안 끝난 예약만

---

## 페이지네이션 규칙
- `page=1`부터 시작
- 빈 결과 또는 마지막 페이지 확인 시 종료
- 각 실행은 하나의 `sync_run` 으로 묶는다.

---

## 샘플 요청
```txt
GET https://api.rencar.co.kr/v2/company-car-schedules/reservations?page=1&base_date=2026-04-14&rental_type=all&status=all&option=customer_name&exclude_returned=false&date_option=start_at&start=2026-04-13&end=2026-05-14
```

---

## 이 Phase에서 아직 안 잠근 것
- IMS 응답의 모든 필드 매핑
- status 내부 표준화 표
- 차량 식별자 최종 매핑 전략
- DB SQL 스키마
- 워커 코드 위치/실행 방식

---

## Phase 1 종료 조건 점검
- 단일 엔드포인트 확정: 완료
- 기본 쿼리 전략 확정: 완료
- active 예약 기준 확정: 완료
- 샘플 요청 1개 고정: 완료
