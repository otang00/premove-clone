# RENTCAR00 회원가입 페이지 실행준비 current

## 문서 상태
- 상태: active current
- 용도: 회원가입 다음 실행 범위와 phase 종료 조건 잠금
- 기준 브랜치: `feat/db-preview-home`
- 기준 파일:
  - `src/pages/SignupPage.jsx`
  - `src/pages/LoginPage.jsx`
  - `src/context/AuthContext.jsx`
  - `server/auth/ensureProfileForUser.js`
  - `supabase/migrations/20260422095000_add_auth_profiles_and_booking_user_id.sql`
- 연관 current 문서:
  - `docs/present/LOGIN_SYSTEM_CURRENT.md`
  - `docs/present/RENTCAR00_SIGNUP_PROFILE_CURRENT.md`

---

## 0. 지금 상태 요약

현재 `/signup` 상태는 아래다.

이미 되어 있는 것:
- 이메일/비밀번호 기반 Supabase signup
- 이메일 인증 required 설정 유지
- 회원가입 폼 UI 확장
- 비밀번호 규칙 표시
- 연락처 인증 UI placeholder

아직 안 되어 있는 것:
- 비밀번호 규칙 문구 위치 조정
- 실제 SMS OTP 발송/검증
- OTP 성공 상태와 회원가입 제출 연결
- `profiles` 에 추가 회원정보 저장

---

## 1. 이번 실행에서 잠근 결정

### 1.1 가입/인증 정책
- 생년월일은 주민번호형이 아니라 `생년월일 8자리` 로 유지한다.
- 이메일 인증 Supabase 설정은 그대로 유지한다.
- 가입자는 이메일 인증 완료 전 로그인 불가 구조를 유지한다.
- 연락처 인증은 `회원가입 단계 SMS OTP` 로 붙인다.

### 1.2 비밀번호 UI
- 비밀번호 규칙 문구는 `비밀번호 확인` 입력 아래로 이동한다.
- 사용자는 비밀번호 입력과 확인을 끝낸 뒤 조건/일치 상태를 한 번에 본다.

### 1.3 연락처 인증 정책
- 목적: 법적 본인확인이 아니라 연락 가능한 번호 검증
- OTP 형식: 숫자 6자리
- 만료 시간: 3분
- 재발송 대기: 60초
- 번호 수정 시: 기존 인증 상태 무효화 후 재인증 필요
- 가입 제출 조건: OTP 인증 완료 필요

---

## 2. 현재 기준점

### 프론트 기준점
- `SignupPage.jsx` 에 이름/생년월일/이메일/비밀번호/연락처/주소/약관 UI 가 있다.
- 연락처 인증은 현재 상태 문구만 바뀌는 placeholder 이다.
- 회원가입 제출은 아직 `email + password` signup 만 실제 동작한다.

### 인증 기준점
- `signUp` 은 Supabase email signup 사용 중이다.
- 현재 Supabase auth setting 은 `mailer_autoconfirm=false` 이다.
- 즉 이메일 인증 클릭 전 로그인 불가 구조는 이미 살아 있다.

### 프로필 기준점
- 현재 `profiles` 기본 컬럼은 `id, email, name, phone, marketing_agree` 수준이다.
- `birth_date`, `phone_verified`, `phone_verified_at`, 주소 컬럼은 아직 없다.

### 서버 기준점
- OTP 발송/검증 API 없음
- SMS 공급자 연동 없음
- OTP 저장/검증 테이블 없음

---

## 3. 실행 Phase

## Phase 1. 비밀번호 UI 정리
### 목적
비밀번호 규칙 문구와 확인 상태를 사용자 눈높이에 맞게 재배치한다.

### 범위
- `SignupPage.jsx`
- 필요 시 관련 스타일만 최소 조정

### 해야 할 일
- 비밀번호 규칙 문구를 `비밀번호 확인` 아래로 이동
- 비밀번호 일치 상태와 규칙 문구를 같은 시각 흐름에 정렬
- 현재 문구/색상 체계 유지 여부 점검

### 종료 조건
- 비밀번호 입력 → 확인 입력 → 그 아래에서 규칙/일치 상태 확인 흐름이 자연스럽다.
- 빌드 통과

---

## Phase 2. 연락처 인증 계약 잠금
### 목적
OTP 구현 전에 프론트/백엔드/DB 책임을 한 문장으로 설명 가능한 수준까지 잠근다.

### 범위
- 연락처 인증 상태 정의
- 회원가입 제출과의 연결 조건 정의
- 예외 케이스 정의

### 해야 할 일
- 프론트 상태 정의
  - `phone`
  - `otpCode`
  - `otpRequestedAt`
  - `otpExpiresAt`
  - `otpCooldownUntil`
  - `otpVerified`
- 서버 판단 기준 정의
  - 동일 번호 재발송 제한
  - 만료 검증
  - 실패 횟수 제한
  - 번호 변경 시 인증 무효화
- 가입 버튼 활성 조건 정의
  - 필수 약관 동의
  - 비밀번호 유효
  - 휴대폰 OTP 완료
  - Supabase 준비 완료

### 종료 조건
- 상태 전이와 실패 케이스를 표 없이도 구현 가능하게 설명할 수 있다.
- 다음 phase 입력/출력이 충돌하지 않는다.

---

## Phase 3. DB/프로필 확장 준비
### 목적
회원가입 완료 후 남길 데이터 shape 를 먼저 잠근다.

### 범위
- `profiles` 확장 기준
- OTP 검증 저장 위치 기준

### 해야 할 일
- `profiles` 후보 컬럼 잠금
  - `birth_date`
  - `phone`
  - `phone_verified`
  - `phone_verified_at`
  - `postal_code`
  - `address_main`
  - `address_detail`
  - `profile_status`
- `profile_status` 후보값 잠금
  - `pending_email_verification`
  - `active`
- OTP 저장 구조 결정
  - 별도 verification table 또는 server-side transient store
- 원문 OTP 저장 금지 원칙 반영

### 종료 조건
- 회원가입 성공 후 어떤 값이 어디에 저장되는지 명확하다.
- migration 설계 시작 가능한 수준이다.

---

## Phase 4. OTP 발송 API 준비
### 목적
`인증번호 받기` 버튼이 실제 서버 동작으로 연결될 준비를 끝낸다.

### 범위
- 발송 API 계약
- SMS provider adapter 자리
- rate limit 기준

### 해야 할 일
- API shape 정의
  - 예: `POST /api/auth/otp/send`
- 입력
  - `phone`
  - `purpose='signup'`
- 서버 처리
  - 번호 정규화
  - OTP 생성
  - hash 저장
  - 만료시각 저장
  - 재발송 제한 확인
  - provider 발송 호출
- 응답
  - `cooldownSeconds`
  - `expiresInSeconds`
  - 사용자용 상태 문구

### 종료 조건
- API 계약이 고정되어 프론트 연결이 가능하다.
- SMS provider만 꽂으면 발송 구현 시작 가능하다.

### 현재 blocker
- SMS 공급자 미정
- 현재 저장소에 SMS SDK/연동 코드 없음

---

## Phase 5. OTP 확인 API 준비
### 목적
`확인` 버튼이 인증 성공/실패를 서버 기준으로 판정하게 만든다.

### 범위
- 검증 API 계약
- 실패 제한 정책
- 인증 완료 후처리 기준

### 해야 할 일
- API shape 정의
  - 예: `POST /api/auth/otp/verify`
- 입력
  - `phone`
  - `code`
  - `purpose='signup'`
- 서버 처리
  - OTP hash 비교
  - 만료 확인
  - 실패 횟수 누적
  - 성공 시 verification 완료 처리
- 프론트 후처리
  - `otpVerified=true`
  - 번호 잠금 또는 번호 수정 시 재인증 분기

### 종료 조건
- 인증 성공/실패/만료/재시도 제한이 모두 분기된다.
- 프론트가 서버 결과만 보고 가입 가능 여부를 판단할 수 있다.

---

## Phase 6. 회원가입 제출 연결
### 목적
이메일 인증 + 휴대폰 OTP + 프로필 저장을 한 흐름으로 묶는다.

### 범위
- signup submit flow
- profile upsert flow
- 성공/실패 UX

### 해야 할 일
- `otpVerified` 없으면 submit 차단
- `supabase.auth.signUp()` 이후 프로필 저장 순서 결정
- 이메일 미인증 상태 기본값 반영
- 성공 시 안내 문구 정리
  - 이메일 인증 메일 확인 필요
  - 연락처 인증 완료 상태 유지

### 종료 조건
- 미인증 전화번호로는 회원가입 완료 불가
- 이메일 미인증 상태는 유지되되, OTP 완료 데이터와 충돌하지 않는다.

---

## Phase 7. 검증
### 목적
실행 후 깨지는 지점을 최소 범위에서 확인한다.

### 체크 항목
- 잘못된 휴대폰 번호
- OTP 재발송 제한
- OTP 만료
- OTP 오입력 반복
- 인증 후 번호 수정
- 이메일 미인증 로그인 차단
- 회원가입 성공 후 프로필 값 저장 확인
- 프론트 빌드 통과

### 종료 조건
- 정상 가입/실패 케이스가 모두 설명 가능하다.
- 빌드와 핵심 흐름 검증이 끝난다.

---

## 4. 현재 준비 상태 판정

준비 완료:
- 실행 범위 재정의
- 정책 재확인
- 기준 파일 확인
- phase 분해 완료
- 종료 조건 분해 완료

아직 필요한 것:
- SMS 공급자 확정
- OTP 저장 방식 확정
- `profiles` 확장 migration 실행 승인

---

## 5. 다음 실행 순서

1. Phase 1: 비밀번호 UI 위치 조정
2. Phase 2~3: OTP 정책/DB 계약 반영
3. Phase 4~5: OTP 발송/검증 API 구현
4. Phase 6: 회원가입 연결
5. Phase 7: 검증

---

## 6. 한 줄 기준

**지금 다음 실행은 `비밀번호 UI 미세조정 + 회원가입용 연락처 OTP 연결 준비` 이고, 실제 OTP 구현은 SMS 공급자와 저장 구조를 잠근 뒤 시작한다.**
