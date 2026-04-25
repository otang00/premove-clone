# RENTCAR00 API 현재 기준 문서

## 문서 상태
- 상태: active current
- 용도: 현재 배포 기준 API 구조, 운영 상태, 정리 완료 기준 고정
- 기준 브랜치: 현재 작업 브랜치
- 기준 커밋(문서 갱신 시점): 작업 반영 후 커밋 예정
- 운영 alias: `https://rentcar00.com`
- 관련 current 문서:
  - `docs/present/RENTCAR00_RESERVATION_CURRENT.md`
  - `docs/present/LOGIN_SYSTEM_CURRENT.md`
  - `docs/present/RENTCAR00_SIGNUP_PHASE1_CURRENT.md`
  - `docs/present/RENTCAR00_API_REDUCTION_PLAN_CURRENT.md`

---

## 0. 현재 결론

- 현재 `api/` 파일 수는 **7개**다.
- member 예약 API는 `api/member/bookings.js` 하나로 통일했다.
- admin 예약 API는 `api/admin/bookings.js` 하나로 통일했다.
- 배포 전 로컬 빌드 검증은 통과했다.
- 코드 기준 구 API 호출은 제거됐다.
- 현재 운영 blocker 는 여전히 **Solapi 운영 ENV 미설정**이다.

---

## 1. 현재 API 파일 목록

### 1. `api/search-cars.js`
- 목적: 차량 검색 API
- 메서드: `GET`
- 기능:
  - 검색 조건 검증
  - DB 기반 차량 검색
  - 각 차량에 상세조회용 `detailToken` 발급

### 2. `api/car-detail.js`
- 목적: 차량 상세 API
- 메서드: `GET`
- 기능:
  - `carId + detailToken` 검증
  - 검색 문맥 기준 차량 상세 DTO 반환

### 3. `api/auth/[action].js`
- 목적: 인증 묶음 라우트
- 내부 액션:
  - `GET /api/auth/me`
  - `POST /api/auth/signup`

### 4. `api/auth/otp/[action].js`
- 목적: 휴대폰 OTP 묶음 라우트
- 내부 액션:
  - `POST /api/auth/otp/send`
  - `POST /api/auth/otp/verify`

### 5. `api/guest-bookings/[action].js`
- 목적: 비회원 예약 묶음 라우트
- 내부 액션:
  - `POST /api/guest-bookings/create`
  - `POST /api/guest-bookings/lookup`
  - `POST /api/guest-bookings/cancel`

### 6. `api/member/bookings.js`
- 목적: 회원 예약 단일 API
- 메서드: `GET`, `POST`
- 기능:
  - `GET /api/member/bookings`
    - 내 예약 목록 조회
  - `GET /api/member/bookings?reservationCode=...`
    - 특정 예약 상세 조회
  - `POST /api/member/bookings?action=cancel&reservationCode=...`
    - 특정 예약 취소

### 7. `api/admin/bookings.js`
- 목적: 관리자 예약 단일 API
- 메서드: `GET`, `POST`
- 기능:
  - `GET /api/admin/bookings?tab=...&q=...&qField=...&page=...&pageSize=...`
    - 예약 목록 조회
  - `GET /api/admin/bookings?action=confirm-target&token=...`
    - 예약 확정 대상 조회
  - `POST /api/admin/bookings?action=confirm`
    - 예약 확정 실행
  - `POST /api/admin/bookings?action=cancel`
    - 예약 취소 실행

---

## 2. 제거된 API

아래 파일은 정리 완료로 제거됐다.

```text
api/member/bookings/[reservationCode].js
api/member/bookings/[reservationCode]/cancel.js
api/admin/booking-confirm.js
api/admin/booking-cancel.js
```

---

## 3. 현재 구조 분류

### 검색 축
- `api/search-cars.js`
- `api/car-detail.js`

### 인증/회원가입 축
- `api/auth/[action].js`
- `api/auth/otp/[action].js`

### 비회원 예약 축
- `api/guest-bookings/[action].js`

### 회원 예약 축
- `api/member/bookings.js`

### 관리자 예약 축
- `api/admin/bookings.js`

---

## 4. 현재 구조의 해석

### 좋은 점
- Hobby 제한 기준에서 함수 수 여유가 생겼다.
- member/admin 축 중복 라우트가 제거됐다.
- 프론트 호출 진입점을 크게 바꾸지 않고 정리했다.
- 관리자 목록과 확정/취소를 한 축에서 관리할 수 있게 됐다.

### 주의점
- member/admin 축은 query action 방식이므로 분기 누락에 주의해야 한다.
- 운영 가능 여부는 API 배포와 별개로 ENV 설정 상태에 좌우된다.
- OTP는 코드 문제가 아니라 운영 환경변수 미설정이 blocker 다.

---

## 5. 현재 운영 체크 포인트

### 배포/검증 기준
- API 파일 수: 7개
- 로컬 빌드: 통과
- 코드 내 구 API 호출: 제거

### 남은 운영 이슈
- Solapi 운영 ENV 설정
- OTP 실발송 확인
- 운영 재배포 후 핵심 API 응답 확인

---

## 6. 현재 기준 다음 우선순위

1. 운영 배포 후 admin confirm/cancel 실제 응답 확인
2. Solapi 운영 ENV 설정
3. OTP → signup end-to-end 확인
4. 결제/웹훅 추가 전 함수 수 정책 재점검

---

## 7. 현재 기준 한 줄 결론

현재 API는 **7개 구조로 정리 완료**됐고, member/admin 중복 라우트는 제거됐다.
이제 남은 핵심은 **운영 재배포 확인과 Solapi 운영 설정**이다.
