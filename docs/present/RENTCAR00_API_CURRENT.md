# RENTCAR00 API 현재 기준 문서

## 문서 상태
- 상태: active current
- 용도: 현재 배포 기준 API 구조, 운영 상태, 정리 대상 고정
- 기준 브랜치: 현재 작업 브랜치
- 기준 커밋(문서 작성 시점): `3dfc6c7`
- 운영 alias: `https://rentcar00.com`
- 관련 current 문서:
  - `docs/present/RENTCAR00_RESERVATION_CURRENT.md`
  - `docs/present/LOGIN_SYSTEM_CURRENT.md`
  - `docs/present/RENTCAR00_SIGNUP_PHASE1_CURRENT.md`

---

## 0. 현재 결론

- 현재 `api/` 파일 수는 **11개**다.
- 현재 구조는 **Vercel Hobby 12개 함수 제한을 피하기 위한 압축 구조**가 일부 반영돼 있다.
- 배포는 정상 완료됐고 `rentcar00.com` alias 연결도 완료됐다.
- 현재 운영에서 확인된 핵심 상태는 아래와 같다.
  - `/api/auth/me` : 401 정상
  - `/api/guest-bookings/lookup` + invalid token : 403 정상
  - `/api/auth/otp/send` : 503, 원인 = **Solapi 운영 ENV 미설정**
- 즉, **라우팅과 배포는 살아 있고, OTP 실발송만 운영 설정 미완성**이다.

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
    - 로그인 사용자 조회
    - 프로필 보장/직렬화
  - `POST /api/auth/signup`
    - 이메일 회원가입
    - 휴대폰 OTP 완료 토큰 검증
    - `profiles` upsert

### 4. `api/auth/otp/[action].js`
- 목적: 휴대폰 OTP 묶음 라우트
- 내부 액션:
  - `POST /api/auth/otp/send`
    - 인증번호 발송
    - cooldown/ttl/시도 제한 적용
    - Solapi 사용
  - `POST /api/auth/otp/verify`
    - 인증번호 검증
    - 가입 제출용 verification token 발급

### 5. `api/guest-bookings/[action].js`
- 목적: 비회원 예약 묶음 라우트
- 내부 액션:
  - `POST /api/guest-bookings/create`
    - 비회원/회원 공용 예약 생성
    - 예약 확인 메일 발송 시도
    - completion token 발급
  - `POST /api/guest-bookings/lookup`
    - completion token 기반 완료 조회
    - 또는 이름/전화/생년월일 기반 비회원 예약 조회
    - rate limit / delay 보호 포함
  - `POST /api/guest-bookings/cancel`
    - 비회원 예약 취소
    - 보호 로직 포함

### 6. `api/member/bookings.js`
- 목적: 회원 예약 메인 API
- 기능:
  - `GET /api/member/bookings`
    - 내 예약 목록 조회
  - `GET /api/member/bookings?reservationCode=...`
    - 특정 예약 상세 조회
  - `POST /api/member/bookings?action=cancel&reservationCode=...`
    - 특정 예약 취소

### 7. `api/member/bookings/[reservationCode].js`
- 목적: 회원 예약 상세 전용 API
- 메서드: `GET`
- 기능:
  - 경로 기반 특정 예약 상세 조회

### 8. `api/member/bookings/[reservationCode]/cancel.js`
- 목적: 회원 예약 취소 전용 API
- 메서드: `POST`
- 기능:
  - 경로 기반 특정 예약 취소

### 9. `api/admin/bookings.js`
- 목적: 관리자 예약 목록 API
- 메서드: `GET`
- 기능:
  - 관리자 권한 확인
  - 탭별 목록 조회: `pending`, `active`, `cancelled`
  - 검색 조건: 차량번호, 예약번호, 고객명
  - pagination 처리

### 10. `api/admin/booking-confirm.js`
- 목적: 관리자 예약 확정 API
- 메서드: `GET`, `POST`
- 기능:
  - `GET`: 토큰 기반 예약 조회
  - `POST`: 토큰 기반 예약 확정

### 11. `api/admin/booking-cancel.js`
- 목적: 관리자 예약 취소 API
- 메서드: `POST`
- 기능:
  - 관리자 권한 확인
  - 토큰 기반 예약 취소

---

## 2. 현재 구조 분류

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
- `api/member/bookings/[reservationCode].js`
- `api/member/bookings/[reservationCode]/cancel.js`

### 관리자 예약 축
- `api/admin/bookings.js`
- `api/admin/booking-confirm.js`
- `api/admin/booking-cancel.js`

---

## 3. 현재 구조의 문제와 해석

### 3.1 좋은 점
- 함수 수를 11개로 줄여 Hobby 제한 안에 들어왔다.
- 인증, 비회원 예약, OTP를 빠르게 배포 가능한 수준으로 묶었다.
- rewrite 는 `/api/` 를 제외하도록 정리되어 SPA 라우팅 충돌이 없다.

### 3.2 문제점
- `member/bookings.js` 와 경로형 member API 2개가 **기능 중복**이다.
- 일부 파일은 동사형 action query (`?action=cancel`) 와 REST 경로형(`/cancel`)이 섞여 있다.
- 현재 구조는 장기적으로 기능 추가 시 다시 함수 수 또는 분기 복잡도 문제가 생길 수 있다.
- OTP는 코드가 아니라 **운영 ENV 미설정** 때문에 실제 동작이 막혀 있다.

### 3.3 가장 먼저 정리할 중복 지점
1. `api/member/bookings.js`
2. `api/member/bookings/[reservationCode].js`
3. `api/member/bookings/[reservationCode]/cancel.js`

현재 member 예약은 위 3개가 겹친다.

---

## 4. 현재 기준 라우트 정책

### 유지
- 검색 축 2개는 현재처럼 분리 유지
- 관리자 축은 현재 3개 유지 가능
- OTP는 `send / verify` 액션 라우트 유지 가능

### 정리 필요
- member 예약은 **한 방식만 남겨야 한다**
- 권장 우선순위는 아래 둘 중 하나다.

#### 안 A. 경로형 REST 우선
- `GET /api/member/bookings`
- `GET /api/member/bookings/:reservationCode`
- `POST /api/member/bookings/:reservationCode/cancel`
- 장점: 직관적
- 단점: 함수 수 증가 압박

#### 안 B. 집약형 유지
- `GET /api/member/bookings`
- `GET /api/member/bookings?reservationCode=...`
- `POST /api/member/bookings?action=cancel&reservationCode=...`
- 장점: 함수 수 절약
- 단점: 분기 해석이 덜 직관적

### 현재 실무 권장
Hobby를 유지하는 동안은 **안 B 집약형 유지**가 안전하다.
즉, member 예약 경로형 2개는 추후 정리 후보다.

---

## 5. 현재 운영 체크 결과

### 배포 상태
- 프로덕션 재배포 완료
- alias 연결 완료: `https://rentcar00.com`

### 확인한 응답
- `GET /api/auth/me`
  - 응답: `401`
  - 해석: 비로그인 보호 정상
- `POST /api/guest-bookings/lookup` + invalid completion token
  - 응답: `403`
  - 해석: 토큰 방어 정상
- `POST /api/auth/otp/send`
  - 응답: `503`
  - 해석: OTP provider 미준비 상태 정상 노출

### 현재 운영 리스크
- Solapi ENV 미설정 상태에서는 회원가입 OTP 실발송 불가
- 기능 추가가 이어지면 Hobby 함수 제한 재충돌 가능

---

## 6. 지금 기준 다음 정리 원칙

1. member 예약 API 중복 제거를 최우선으로 본다.
2. 신규 기능 추가 전, REST형과 action형을 섞지 말고 축별로 하나로 잠근다.
3. Hobby 유지 시 함수 수를 먼저 계산하고 추가한다.
4. Pro 전환 전까지는 무분별한 파일 분리를 금지한다.
5. 운영 ENV 의존 기능은 배포 완료와 운영 가능을 구분해서 본다.

---

## 7. 바로 확인 필요한 운영 항목

### 필수
- Solapi 운영 ENV 설정
  - 발신번호
  - API key / secret
  - 운영 프로젝트 변수 반영 여부

### 다음 구현 전 확인
- member 예약 API를 집약형으로 유지할지 경로형으로 되돌릴지
- 관리자 축도 추후 액션 라우트로 더 묶을지 여부
- Hobby 유지 vs Pro 전환 결정 시점

---

## 8. 현재 기준 한 줄 결론

현재 API는 **배포 가능한 최소 구조로 11개에 정리되어 있고 운영 라우팅은 정상**이다.
다만 **member 예약 API 중복 정리와 Solapi 운영 ENV 설정**이 다음 우선 과제다.
