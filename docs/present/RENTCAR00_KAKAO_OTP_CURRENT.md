# RENTCAR00 카카오 로그인 + 휴대폰 OTP 현재 문서

## 문서 상태
- 상태: active current draft
- 용도: 카카오 로그인 + 휴대폰 OTP 구현 기준 문서
- 기준 브랜치: `feat/db-preview-home`
- 기준 노션 문서: `📱 통합회원 · 카카오 로그인 · 휴대폰 OTP/SMS 인증 최종 운영정책`
- 노션 페이지: `https://www.notion.so/34ca9a5bf8c881d3ac67dd1bc18fd55b`
- 연관 current 문서:
  - `docs/present/LOGIN_SYSTEM_CURRENT.md`
  - `docs/present/RENTCAR00_RESERVATION_CURRENT.md`

---

## 0. 목적

이 문서는 노션에 정리된 통합회원 정책을 현재 코드베이스에 맞게 실행 기준으로 다시 잠근다.

이번 문서에서 잠그는 것은 아래다.

1. 카카오 로그인과 휴대폰 OTP를 현재 구조에 어떻게 붙일지
2. 이미 구현된 이메일 로그인 구조를 어떻게 확장할지
3. 회원/비회원 예약 분기를 어떤 데이터 기준으로 처리할지
4. 이번 작업에서 먼저 해야 할 것과 아직 미루는 것을 어디까지로 볼지

---

## 1. 노션 기준 핵심 결론

노션 문서 기준으로 이번 축의 핵심은 아래다.

- 회원 타입은 `member`, `guest` 두 개만 사용한다.
- 카카오는 회원 타입이 아니라 로그인 provider 다.
- 카카오 로그인 성공만으로 `phone_verified = true` 처리하지 않는다.
- 회원가입은 이메일/비밀번호만으로 끝나지 않는다.
- 회원은 가입 단계에서 휴대폰 OTP를 필수로 완료해야 회원가입 완료로 본다.
- 비회원은 예약 전 휴대폰 OTP를 필수로 완료해야 한다.
- 회원 예약 허용 기준과 비회원 예약 허용 기준은 분리해서 본다.
- 결제 전 / 예약 확정 전에는 서버에서 인증 상태를 재검증한다.
- 같은 휴대폰 번호 중복 회원은 초기 버전에서 자동 병합하지 않고 차단 + 안내 우선으로 처리한다.

---

## 2. 현재 코드베이스 기준 확인 결과

### 2.1 이미 있는 것
- Supabase Auth 기반 이메일 로그인 골격이 이미 들어가 있다.
- 클라이언트 전역 세션 상태는 `src/context/AuthContext.jsx` 로 관리 중이다.
- 서버의 사용자 확인은 `Authorization: Bearer <access_token>` 기반이다.
- `api/auth/me.js` 에서 토큰 검증 후 `profiles` 를 upsert 한다.
- `profiles` 와 `booking_orders.user_id` 를 추가한 마이그레이션이 이미 있다.

### 2.2 현재 부족한 것
- `profiles` 에 `phone_verified`, `phone_verified_at`, `profile_status` 가 아직 없다.
- provider 연결용 `member_identities` 성격 테이블이 아직 없다.
- 카카오 OAuth 진입/콜백 처리 라인이 아직 없다.
- OTP 발송/검증 API 가 아직 없다.
- 비회원 예약용 `guest_phone_verified` 상태 저장 구조가 아직 없다.
- 예약/결제 직전 서버 재검증 축이 아직 문서 수준만 있고 구현 기준이 부족하다.

### 2.3 현재 판단
- 현재 구조는 버릴 필요가 없다.
- 이번 작업은 **기존 이메일 로그인 골격을 유지한 채**
  - provider 확장
  - phone verification 상태 확장
  - guest verification 축 추가
  - 예약 서버 검증 축 추가
  순서로 붙이는 방식이 맞다.

---

## 3. 이번 작업의 기준 모델

### 3.1 회원 모델
- `member`: 로그인 가능한 서비스 회원
- `guest`: 비회원 예약자

회원 예약 허용 기준:
- 로그인 상태
- 회원 프로필 존재
- 휴대폰 번호 존재
- `phone_verified = true`
- `profile_status = active`

비회원 예약 허용 기준:
- 예약자 이름 존재
- 예약 연락처 존재
- `guest_phone_verified = true`
- 비회원 예약 세션 또는 draft 유효

### 3.2 provider 모델
- `email`
- `kakao`
- 추후 `naver`, `apple` 확장 가능

중요:
- provider 는 로그인 수단이다.
- 예약 가능 여부 판단에는 provider 를 직접 쓰지 않는다.

### 3.3 OTP 목적값
초기 구현에서는 아래 purpose 를 잠근다.
- `signup`
- `kakao_onboarding`
- `guest_reservation`
- `phone_change`
- `reservation_lookup`

`reservation_risk_check` 는 후순위로 두되 구조는 열어둔다.

---

## 4. 현재 프로젝트에 맞춘 데이터 기준

### 4.1 profiles 확장
현재 `profiles` 는 아래 수준이다.
- `id`
- `email`
- `name`
- `phone`
- `marketing_agree`

이번 축에서 필요한 추가 후보:
- `phone_verified boolean not null default false`
- `phone_verified_at timestamptz null`
- `profile_status text not null default 'phone_unverified'`

권장 상태값:
- `incomplete`
- `phone_unverified`
- `active`
- `blocked`
- `withdrawn`

### 4.2 provider identity 구조
카카오 로그인을 이번 범위에 포함하므로 provider identity 구조를 이번에 같이 설계한다.
가칭:
- `profile_identities`
- 또는 기존 네이밍 컨벤션에 맞는 동등 테이블

최소 필드 후보:
- `id`
- `user_id`
- `provider`
- `provider_user_id`
- `provider_email`
- `linked_at`
- `created_at`

제약:
- `(provider, provider_user_id)` unique
- 같은 이메일 자동 병합 금지
- 같은 휴대폰 번호 자동 병합 금지

### 4.3 guest verification 구조
회원 프로필에 guest 상태를 넣지 말고 예약 draft 또는 booking 생성 흐름에 붙인다.

최소 필요 상태:
- `guest_name`
- `guest_phone`
- `guest_phone_verified`
- `guest_phone_verified_at`

여기서 말하는 draft 는 **최종 예약 전 임시 저장소**다.
즉, OTP는 끝났지만 아직 결제/최종 예약 생성 전인 상태를 별도로 보관하는 구조다.

- `booking_orders` 에 바로 넣으면 임시 상태와 확정 예약이 섞인다.
- draft 로 분리하면 만료, 재시도, 조회 권한 관리가 쉬워진다.

현재 기준 판단은 **예약 draft 성격 저장소를 별도로 두는 방향이 더 안전**하다.

### 4.4 OTP 로그 구조
신규 로그 테이블 필요.
최소 필드 후보:
- `phone_number_masked`
- `phone_hash`
- `purpose`
- `target_user_id nullable`
- `reservation_draft_id nullable`
- `ip_address_hash`
- `user_agent`
- `status`
- `attempt_count`
- `sent_at`
- `verified_at`
- `expires_at`

원칙:
- OTP 원문 저장 금지
- 전화번호 원문 전체 저장 최소화
- 로그에 OTP 출력 금지

---

## 5. 구현 범위 잠금

## 5.1 이번 문서 기준 포함 범위
1. 카카오 로그인 provider 연결
2. 회원 phone verification 상태 추가
3. 이메일/비밀번호 회원가입 + 휴대폰 OTP 필수화
4. 카카오 첫 로그인 후 휴대폰 OTP 온보딩 연결
5. 비회원 예약 전 OTP 요구 구조 설계
6. OTP 발송/검증 API 기본 구현
7. 결제 전 / 예약 확정 전 서버 검증 포인트 정의
8. 중복 휴대폰 번호 자동 병합 금지 정책 반영

## 5.2 이번 범위에서 제외
- 법적 본인확인(PASS/NICE/KCB)
- 면허 진위확인 자동 연동
- 자동 계정 병합
- 관리자 수동 병합 도구
- 고도화된 위험도 기반 OTP 추가 검증
- 다중 provider 계정관리 UI 완성본

---

## 6. 현재 코드 기준 실행 단계

## Phase 1. 데이터 기준 먼저 잠금
### 목적
현재 이메일 로그인 골격을 깨지 않고 카카오/OTP 확장용 필드를 준비한다.

### 해야 할 일
- `profiles` 확장 필드 추가
- provider identity 테이블 추가
- OTP 로그 또는 OTP 검증 저장 구조 추가
- guest verification 저장 위치 결정

### 종료 조건
- 카카오/OTP 구현에 필요한 DB 기준이 문서와 코드에서 동일해진다.

## Phase 2. 카카오 로그인 연결
### 목적
카카오를 member 의 추가 provider 로 붙인다.

### 해야 할 일
- 카카오 OAuth 진입 버튼 추가
- OAuth 콜백 처리
- 기존 identity 조회
- 미연결 사용자는 onboarding 상태로 진입
- `phone_verified` 확인 후 미완료면 OTP 단계 이동

### 종료 조건
- 카카오 로그인 성공 후 기존 계정 로그인 또는 신규 온보딩 분기가 동작한다.

## Phase 3. 회원 OTP 연결
### 목적
이메일 가입/카카오 가입 모두 휴대폰 인증을 거쳐 active member 로 만들게 한다.

### 해야 할 일
- OTP 발송 API
- OTP 검증 API
- `signup`, `kakao_onboarding`, `phone_change` purpose 후처리
- 이메일 회원가입은 OTP 성공까지 끝나야 가입 완료로 처리
- 성공 시 `phone_verified`, `phone_verified_at`, `profile_status=active` 반영

### 종료 조건
- 이메일/비밀번호만 입력하고 OTP를 완료하지 않으면 회원가입 완료로 보지 않는다.
- OTP 성공 후에만 예약 가능한 회원 상태가 된다.

## Phase 4. 비회원 OTP 연결
### 목적
비회원 예약을 guest verification 기반으로 잠근다.

### 해야 할 일
- guest 예약 시작 시 OTP 발송/검증
- `guest_phone_verified` 저장
- 인증 없이 예약/결제 진입 시 서버 차단

### 종료 조건
- 비회원 예약은 OTP 없이 진행되지 않는다.

## Phase 5. 예약/결제 서버 검증 연결
### 목적
프론트 상태 조작을 막고 서버 기준으로 인증 상태를 다시 확인한다.

### 해야 할 일
- 회원 예약 전 검증
- 비회원 예약 전 검증
- 결제 승인 후 예약 확정 전 재검증
- 연락처 snapshot 저장 기준 반영

### 종료 조건
- provider 와 무관하게 `phone_verified` 또는 `guest_phone_verified` 기준으로 예약 허용 여부가 결정된다.

---

## 7. 현재 코드 파일 기준 반영 포인트

### 7.1 이미 손대야 할 가능성이 높은 파일
- `src/context/AuthContext.jsx`
- `src/services/authApi.js`
- `api/auth/me.js`
- `server/auth/ensureProfileForUser.js`
- `supabase/migrations/*`

### 7.2 신규 축이 들어갈 가능성이 높은 파일
- `src/pages/SignupPage.jsx`
- `src/pages/LoginPage.jsx` 내 카카오 버튼
- `src/pages/*` 내 카카오 온보딩 / 휴대폰 인증 화면
- `api/auth/kakao/*`
- `api/auth/otp/*`
- `api/member/*`
- `api/reservations/*` 또는 결제 전 검증 축
- `server/auth/*`
- `server/otp/*`

### 7.3 현재 주의점
- 기존 클래스명/함수명/라우팅명은 유지 우선
- 새 구조를 억지로 프레임워크식으로 갈아엎지 않는다.
- 지금 프로젝트는 SPA + API 함수 구조이므로 이 구조 위에 최소 변경으로 얹는다.

---

## 8. 체크리스트

### 정책 체크
- [ ] member / guest 2분기만 사용
- [ ] provider 는 예약 판단 기준으로 직접 사용하지 않음
- [ ] 카카오 로그인 성공만으로 phone_verified 처리하지 않음
- [ ] 회원은 가입 시 OTP 1회 필수
- [ ] 비회원은 예약 시 OTP 필수
- [ ] 번호 변경은 새 번호 OTP 성공 후 반영
- [ ] 중복 휴대폰 번호 자동 병합 금지

### 데이터 체크
- [ ] profiles 확장 필드 추가
- [ ] identity 테이블 추가
- [ ] OTP 로그/검증 저장 구조 추가
- [ ] guest verification 저장 위치 확정

### 서버 체크
- [ ] OTP rate limit 서버 적용
- [ ] OTP 실패 횟수 제한 적용
- [ ] 결제 전 서버 검증 적용
- [ ] 예약 확정 전 서버 재검증 적용
- [ ] OTP/전화번호 민감값 로그 차단

---

## 9. 리스크

1. **카카오 계정과 기존 이메일 회원 중복**
- 초기 자동 병합 금지로 안전성은 높아지지만 UX 마찰이 생긴다.

2. **guest draft 저장 위치 미확정**
- 이 부분을 먼저 잠그지 않으면 OTP 성공 후 예약 흐름이 흔들릴 수 있다.

3. **OTP 공급자 미정**
- 공급자 선택 전까지는 API 인터페이스를 먼저 고정하고 구현체를 분리하는 게 맞다.

4. **현재 profiles 구조가 단순함**
- 지금 상태로는 `active member` 판정 기준이 부족하다.

---

## 10. 현재 권장 다음 액션

1. `profiles` / identity / OTP / guest draft 데이터 기준부터 잠근다.
2. 이메일 회원가입 완료 조건을 `이메일/비밀번호 + 휴대폰 OTP 완료` 로 고정한다.
3. 그 다음 카카오 OAuth 를 provider 연결로 붙이고 동일한 OTP 온보딩 규칙을 적용한다.
4. 마지막에 예약/결제 서버 재검증을 연결한다.

현재 판단으로는
**회원가입 완료 기준과 OTP 후처리를 먼저 잠그는 것이 가장 안전하다.**
