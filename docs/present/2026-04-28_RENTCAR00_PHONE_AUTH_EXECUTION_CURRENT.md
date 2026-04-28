# 2026-04-28 RENTCAR00 전화번호 인증 전환 실행 문서

## 문서 상태
- 상태: active current
- 용도: 전화번호 로그인 전환의 실제 실행 단계/검증/승인 게이트 관리
- 기준 브랜치: `feat/db-preview-home`
- 관련 문서:
  - `docs/present/2026-04-28_RENTCAR00_PHONE_AUTH_MASTER_CURRENT.md`

---

## 0. 목적

이 문서는 아래 전환을 실제 작업 단위로 쪼갠다.

- 회원 식별자: 이메일 → 전화번호
- 로그인: 이메일+비밀번호 → 전화번호+비밀번호
- 가입 전 검증: Solapi OTP 완료 필수
- 계정 생성: 서버 `admin.createUser({ phone, password, phone_confirm: true })`

---

## 1. 기준점

현재 코드 기준 핵심 축
- `api/auth/[action].js`
  - 현재 email signup 기준
  - signup 후 `profile_status='pending_email_verification'`
- `src/pages/LoginPage.jsx`
  - 현재 email/password 로그인
- `src/pages/SignupPage.jsx`
  - 현재 email 필수 가입 폼
- `server/auth/ensureProfileForUser.js`
  - 현재 email confirmation 의존 상태 계산
- `supabase/migrations/20260425175500_add_signup_phone_verification.sql`
  - 현재 `pending_email_verification` 상태값 포함

---

## 2. 서버 signup 목표 플로우

최종 플로우
1. 사용자 phone 입력
2. `/api/auth/otp/send`
3. `/api/auth/otp/verify`
4. verified token 발급 확인
5. `/api/auth/signup` 호출
6. 서버가 verification row 재검증
7. 서버가 중복 phone 검사
8. 서버가 `admin.createUser({ phone, password, phone_confirm: true, user_metadata })`
9. 서버가 `profiles` upsert
10. 서버가 verification consume 처리
11. 가입 성공 응답
12. 이후 `/login` 에서 `signInWithPassword({ phone, password })`

핵심 원칙
- `createUser()` 는 OTP 재검증 통과 후에만 호출
- 브라우저는 service role 에 접근하지 않음
- `phone_confirm: true` 는 서버 검증 완료를 근거로만 설정

---

## 3. 실행 단계

## Phase 0. 문서 정렬
### 목적
현재 기준 문서를 전화번호 로그인 체계로 통일한다.

### 범위
- `LOGIN_SYSTEM_CURRENT.md`
- `RENTCAR00_SIGNUP_PROFILE_CURRENT.md`
- 긴급수정 문서
- 마스터 문서와의 충돌 제거

### 종료 조건
- 이메일 로그인/이메일 인증이 현 current 기준이 아님이 문서상 명확함

### 검증
- current 문서끼리 상충 문구 없음

### 승인대기
- 문서 기준 확인 후 다음 단계 진행

---

## Phase 1. 기술 경로 잠금
### 목적
서버 생성 방식으로 구현 경로를 확정한다.

### 범위
- signup은 `publicClient.auth.signUp()` 제거
- signup은 `privilegedClient.auth.admin.createUser()` 기준으로 재정의
- login은 `supabase.auth.signInWithPassword({ phone, password })` 기준으로 잠금

### 종료 조건
- signup/login 호출 책임이 프론트/서버 기준으로 명확함

### 검증
- 요청/응답 흐름을 단계도로 설명 가능

### 승인대기
- 구현 방식 확정 후 다음 단계 진행

---

## Phase 2. 데이터 계약 수정
### 목적
phone canonical ID 기준으로 DB 상태를 정리한다.

### 범위
- `profiles.phone` unique 기준 확인/보강
- `profiles.email` 필수성 재정의
- `profile_status` 허용값 재정의
- 신규 저장에서 `pending_email_verification` 제거

### 종료 조건
- 신규 가입자는 email 상태와 무관하게 phone 기준으로 active 판단 가능

### 검증
- migration 계획이 문서 기준과 일치

### 승인대기
- DB 계약 검토 후 진행

---

## Phase 3. signup API 재설계
### 목적
가입 API를 phone 중심 서버 생성 구조로 바꾼다.

### 범위
- 입력 payload 재정의
- OTP verification 재검증 강화
- `admin.createUser()` 호출 추가
- `profiles` upsert payload 재정의
- verification consume 시점 유지

### 상세 순서
1. body parse
2. 이름/생년월일/비밀번호/전화번호/주소/약관 검증
3. verification row 조회
4. `phone`, `purpose`, `status`, `verified_at`, `consumed_at`, `verification_token_hash`, `expires_at` 검증
5. `profiles` 중복 phone 검사
6. `auth admin` 쪽 phone 중복/기존 유저 충돌 처리
7. `admin.createUser({ phone, password, phone_confirm: true, user_metadata })`
8. `profiles.upsert({ id:userId, phone, ... , profile_status:'active' 또는 규칙값 })`
9. `phone_verifications` consume
10. 성공 응답

### 종료 조건
- OTP 완료 번호만 가입 가능
- 가입 즉시 phone confirmed auth user 생성 가능

### 검증
- API 입력/출력 샘플로 설명 가능
- 실패 케이스 목록 정의 가능

### 승인대기
- signup 계약 승인 후 구현 진행

---

## Phase 4. signup 화면 재작업
### 목적
회원가입 UI를 phone-first 기준으로 전환한다.

### 범위
- email 필수 제거
- 설명 문구를 phone 기준으로 수정
- password 설명 수정
- 성공 후 이동 동선 정리

### 종료 조건
- 회원가입 폼이 현재 정책과 일치

### 검증
- 필수값/버튼활성/에러 문구가 문서와 일치

### 승인대기
- UI 기준 확인 후 진행

---

## Phase 5. login 화면 재작업
### 목적
로그인을 phone + password 기준으로 바꾼다.

### 범위
- 입력 필드: email → phone
- `signInWithPassword({ phone, password })` 적용
- 에러 문구 일반화
- 현재 사용자 표시 기준 보정

### 종료 조건
- 전화번호로 로그인 가능
- Email not confirmed 문구 제거

### 검증
- 전화번호 형식/정규화/실패 케이스 점검

### 승인대기
- login UX 확인 후 진행

---

## Phase 6. profile 상태 계산 전환
### 목적
서버 프로필 상태를 email confirmation 과 분리한다.

### 범위
- `ensureProfileForUser.js` 수정
- `email_confirmed_at` 의존 제거
- `phone_verified` + 필수 필드 기준 상태 계산

### 종료 조건
- `phone_verified=true` 중심 active 판정
- `pending_email_verification` 신규 미사용

### 검증
- auth/me 응답 예시로 상태 설명 가능

### 승인대기
- 상태 규칙 확인 후 진행

---

## Phase 7. 부가 동선 정리
### 목적
기존 이메일 중심 흔적을 최소화한다.

### 범위
- forgot/reset-password 노출 유지 여부 결정
- email 관련 잔여 카피 제거
- 후속 TODO 문서화

### 종료 조건
- 사용자에게 보이는 정책이 충돌하지 않음

### 검증
- 로그인/가입 화면 문구 일관성 확인

### 승인대기
- 노출 정책 승인 후 진행

---

## Phase 8. 검증
### 목적
핵심 인증 플로우 회귀를 막는다.

### 체크리스트
- OTP 발송 성공
- OTP 확인 성공
- 잘못된 OTP 차단
- 만료 OTP 차단
- 가입 시 phone 중복 차단
- 가입 성공 후 login 성공
- auth/me profile 응답 정상
- build 통과

### 종료 조건
- 신규 회원의 phone-first 흐름을 실제로 설명 가능

### 승인대기
- 검증 결과 보고 후 최종 승인 대기

---

## 4. 구현 순서 추천

실제 작업 순서
1. 문서 정렬
2. signup API 재설계
3. login 화면 전환
4. profile 상태 계산 전환
5. migration/상태값 정리
6. 회귀 검증
7. 최종 승인 대기

이 순서가 좋은 이유
- 인증 핵심은 signup API 가 기준점이다.
- login UI 는 그 다음에 맞추는 편이 안전하다.
- 상태값/migration 은 새 흐름이 잠긴 뒤 정리하는 게 덜 흔들린다.

---

## 5. 이번 실행에서 건드릴 가능성이 높은 파일

### 문서
- `docs/present/LOGIN_SYSTEM_CURRENT.md`
- `docs/present/RENTCAR00_SIGNUP_PROFILE_CURRENT.md`
- `docs/present/2026-04-28_RENTCAR00_AUTH_EMERGENCY_PHASE_CURRENT.md`

### 서버
- `api/auth/[action].js`
- `server/auth/ensureProfileForUser.js`
- 필요 시 auth helper

### 프론트
- `src/pages/SignupPage.jsx`
- `src/pages/LoginPage.jsx`

### DB
- `supabase/migrations/*`

---

## 6. 최종 원칙

- 각 phase 는
  1. 범위 고정
  2. 수정
  3. 검증
  4. 승인대기
  순서로 닫는다.
- 다음 phase 는 직전 phase 검증/보고 후에만 진행한다.
- 최종 commit 은 사장님 승인 전 미실행.

---

## 7. 리스크 요약

1. signup 선행 검증 누락
- verification row 재검증 없이 `createUser()` 를 치면 가장 크게 꼬인다.

2. auth/profile 이중 충돌
- `profiles` 와 auth user 양쪽에서 phone 중복을 동시에 확인해야 한다.

3. 상태 계산 순서 문제
- signup API 수정 후 바로 `ensureProfileForUser` 를 맞추지 않으면 active 판정이 꼬일 수 있다.

4. 화면 문구 충돌
- SignupPage/LoginPage 의 email 중심 카피와 forgot-password 노출을 그대로 두면 사용자 혼란이 생긴다.

5. 범위 확장 위험
- guest, kakao, reset-password 까지 같이 건드리면 이번 phase 가 불필요하게 커진다.

---

## 8. 한 줄 결론

이번 실행의 핵심은
**기존 이메일 signup 을 억지 보수하는 것이 아니라, Solapi OTP로 번호를 먼저 검증한 뒤 서버가 확인된 phone 계정을 직접 생성하도록 인증 기준축을 재배치하는 것**이다.
