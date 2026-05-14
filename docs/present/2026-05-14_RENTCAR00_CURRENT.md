# 2026-05-14 RENTCAR00 CURRENT

## 문서 상태
- 상태: active current
- 목적: 다음 구현 우선순위인 비밀번호 재설정과 로그인 보호를 한 문서로 잠근다.

## 현재 active 범위
현재 active 범위는 **비밀번호 재설정 기능 정비 + 로그인 실패 방어 설계/구현** 이다.

### 방금 완료된 묶음
- 인증/비회원 흐름 관련 완료 기준은 아래 complete 문서로 분리했다.
- `docs/complete/2026-05-14_RENTCAR00_AUTH_AND_GUEST_FLOW_COMPLETE.md`

### 지금 바로 다룰 것
1. 비밀번호 재설정 흐름을 현재 서비스 식별자 기준으로 재설계
2. 로그인 실패 누적 시도 방어 구조 설계
3. CAPTCHA/잠금 정책 적용 위치 결정

## 현재 기준
- 장기 구조 기준은 `docs/policies/RENTCAR00_POLICY.md`
- 프로젝트 구조 기준은 `PROJECT_RENTCAR00_BOOKING_SYSTEM.md`
- 방금 완료된 인증/비회원 흐름 기준은 `docs/complete/2026-05-14_RENTCAR00_AUTH_AND_GUEST_FLOW_COMPLETE.md`

## 현재 문제
### 1. 비밀번호 재설정 UX 불일치
- 현재 로그인 UX 는 휴대폰 번호 + 비밀번호다.
- 그러나 `ForgotPasswordPage.jsx` 는 아직 이메일 입력 + email reset link 기준이다.
- 이메일은 선택값이라, 현재 회원 식별 UX 와 맞지 않는다.

### 2. 로그인 보호 구조 부족
- 현재 `LoginPage.jsx` 는 브라우저에서 Supabase `signInWithPassword` 를 직접 호출한다.
- 이 구조에서는 실패 횟수 누적, 번호/IP 기준 잠금, CAPTCHA 강제 같은 정책을 서버에서 일관되게 제어하기 어렵다.

## 방향 잠금
### 비밀번호 재설정
- 이메일 링크 기반이 아니라 **휴대폰 OTP 기반 재설정** 으로 전환한다.
- OTP 인증 후 짧은 만료시간의 reset session/token 을 발급한다.
- 유효한 reset session 이 있을 때만 새 비밀번호 저장을 허용한다.

### 로그인 보호
- 로그인 시도는 서버 API 를 한 번 거치게 재구성한다.
- 서버에서 실패 횟수 누적, 잠금 상태, CAPTCHA 요구 여부를 판단한다.
- 성공 로그인 시 실패 카운터를 초기화한다.

## 비밀번호 재설정 목표 UX
1. 휴대폰 번호 입력
2. 회원 존재 여부 확인 가능한 범위에서 재설정 흐름 진입
3. `password_reset` 목적 OTP 발송
4. OTP 인증 성공
5. reset session/token 발급
6. 새 비밀번호 입력
7. 서버가 비밀번호 변경 처리
8. 로그인 화면으로 복귀

## 로그인 보호 목표 UX
1. 휴대폰 번호 + 비밀번호 입력
2. 서버 로그인 API 호출
3. 잠금 전 단계에서는 일반 로그인 시도
4. 실패 누적이 기준치를 넘으면 대기시간 또는 CAPTCHA 요구
5. 성공 시 로그인 완료 + 카운터 초기화

## 정책 잠금
### 비밀번호 재설정 정책
- 전화번호 기반 회원 계정만 대상이다.
- reset token/session 은 짧게 유지한다.
- 새 비밀번호 규칙은 회원가입과 동일 기준을 사용한다.
- 재설정 완료 후 기존 세션 정리 여부를 검토한다.
- OTP 발송 단계에서는 회원 존재 여부를 외부에 과도하게 노출하지 않되, UX는 휴대폰 번호 기준으로 자연스럽게 유지한다.

### 로그인 실패 방어 정책
- 번호 기준 + IP 기준을 함께 본다.
- 1차 잠금 초안은 아래로 고정한다.
  - 같은 전화번호 기준 5회 실패: 5분 대기
  - 같은 전화번호 기준 8회 실패: 15분 대기
  - 같은 전화번호 기준 10회 이상 또는 같은 IP 기준 과다 실패: CAPTCHA 필수
- 성공 로그인 시 해당 번호와 관련된 실패 카운터는 초기화한다.
- 잠금 중에는 Supabase 로그인 시도 전에 서버가 먼저 차단 응답을 반환한다.

### CAPTCHA 방향
- 1차 후보는 Cloudflare Turnstile 로 잠근다.
- 이유
  - 프론트 삽입이 비교적 가볍다.
  - 서버 검증이 명확하다.
  - 로그인 API 래핑 구조와 맞는다.

### 저장/추적 방향
- 로그인 실패 기록은 서버가 제어 가능한 저장소에 남긴다.
- 최소 저장 축은 아래를 본다.
  - normalized phone
  - client ip
  - attempt count
  - locked until
  - last attempted at
- 구현 시 별도 테이블과 기존 OTP/verification 테이블 재사용 중 하나를 선택하되, 로그인 실패 상태와 OTP 상태를 섞지 않는 방향을 우선한다.

## 다음 구현 phase
### 목적
- 비밀번호 재설정을 휴대폰 OTP 기준으로 정리하고,
- 로그인 실패 누적 방어를 서버 통제 구조로 바꾼다.

### 기준점
- 현재 로그인은 클라이언트에서 Supabase 직접 호출 구조다.
- 현재 비밀번호 재설정은 이메일 reset link 구조다.
- 기존 OTP 인프라는 signup / guest_booking / guest_lookup 에 이미 존재한다.

### 예상 수정 파일
- `src/pages/ForgotPasswordPage.jsx`
- `src/pages/ResetPasswordPage.jsx`
- `src/pages/LoginPage.jsx`
- `api/auth/[action].js`
- `api/auth/otp/[action].js`
- `server/auth/*`
- 필요 시 `src/lib/supabaseClient.js` 또는 auth hook 사용 경로
- 필요 시 `vercel.json` (CAPTCHA 도메인 추가가 필요할 때만)

### Phase 1. 현재 구조/경계 확정
#### 작업
- 현재 Supabase direct login 과 email reset link 경로를 정확히 확인한다.
- 서버 API 래핑 범위를 잠근다.
- reset 전용 OTP purpose / reset token 구조를 잠근다.
- 로그인 실패 기록 저장 위치 후보를 확인한다.

#### 예상 수정 파일
- `src/pages/LoginPage.jsx`
- `src/pages/ForgotPasswordPage.jsx`
- `src/pages/ResetPasswordPage.jsx`
- `api/auth/[action].js`
- `api/auth/otp/[action].js`
- `server/auth/*`

#### 종료조건
- 로그인과 재설정 각각의 서버/프론트 책임 경계가 문장으로 고정된다.

### Phase 2. 비밀번호 재설정 서버 계약 잠금
#### 작업
- `password_reset` purpose 추가
- OTP verify 성공 후 reset session/token 발급 계약 정의
- reset session 검증 후 새 비밀번호 저장 API 계약 정의
- 성공/실패/만료 응답 코드를 잠근다.

#### 응답 기준 초안
- OTP 발송: `password_reset_otp_sent`
- OTP 확인: `password_reset_verified`
- reset session 만료: `password_reset_session_expired`
- 비밀번호 변경 성공: `password_reset_completed`

#### 종료조건
- 휴대폰 OTP → reset session → 비밀번호 변경 흐름이 끊기지 않는다.

### Phase 3. 로그인 서버 API 계약 잠금
#### 작업
- `api/auth/login` 신설 또는 `api/auth/[action].js?action=login` 확장 중 하나를 선택한다.
- 번호/IP 기준 실패 누적 저장 구조를 정의한다.
- 성공/실패/잠금/CAPTCHA 요구 응답 포맷을 정의한다.

#### 응답 기준 초안
- 로그인 성공: 세션 발급 또는 성공 payload
- 일반 실패: `invalid_login_credentials`
- 잠금 상태: `login_temporarily_locked`
- CAPTCHA 필요: `captcha_required`

#### 종료조건
- 클라이언트가 서버 응답만으로 로그인 UI 상태를 분기할 수 있다.

### Phase 4. 잠금/CAPTCHA 구현 기준 확정
#### 작업
- 실패 횟수 임계치와 대기시간을 위 정책값으로 잠근다.
- Turnstile 도입 시 프론트 토큰 수집 + 서버 verify 흐름을 잠근다.
- CSP 추가 필요 여부를 확인한다.

#### 종료조건
- 임계치와 차단 단계, CAPTCHA 검증 경로가 문서 기준으로 고정된다.

### Phase 5. 구현 1차 범위
#### 작업
- 휴대폰 OTP 기반 비밀번호 재설정 구현
- 로그인 서버 API 래핑 구현
- 실패 누적 / 잠금 응답 구현
- CAPTCHA는 1차에서 포함 또는 Phase 5-B 로 분리 여부를 구현 직전 확정

#### 종료조건
- 현재 UX 기준으로 재설정/로그인 보호가 동작한다.

### Phase 6. 프론트 연결
#### 작업
- `ForgotPasswordPage` 를 휴대폰 OTP UI 로 교체
- `ResetPasswordPage` 를 reset session 기반 저장 화면으로 조정
- `LoginPage` 를 서버 로그인 API 호출 구조로 전환
- 잠금/캡차 요구 응답에 맞는 안내 문구를 연결

#### 종료조건
- 프론트가 새 서버 계약에 맞게 동작한다.

### Phase 7. 검증
#### 검증 항목
- 회원 휴대폰 비밀번호 재설정 OTP 발송
- OTP 인증 후 reset session 발급
- 새 비밀번호 변경 성공
- 잘못된 OTP / 만료 token 차단
- 로그인 실패 누적
- 잠금 응답
- CAPTCHA 요구 단계
- build 검증

#### 종료조건
- 재설정과 로그인 보호가 모두 일관되게 동작한다.

## 리스크
- 로그인 API 를 서버로 감싸면 기존 세션 처리 방식과 충돌할 수 있다.
- CAPTCHA 도입 시 CSP 도메인 추가가 필요할 수 있다.
- reset session 설계를 느슨하게 하면 계정 탈취 리스크가 생긴다.
- 회원 존재 여부 노출 수준은 UX와 보안 사이 균형이 필요하다.
- 로그인 실패 저장 구조를 잘못 잡으면 OTP 차단 상태와 로그인 차단 상태가 섞여 운영 판단이 어려워질 수 있다.

## 구현 전 확인 필요 사항
1. 로그인 실패 기록을 저장할 기존 테이블 재사용이 가능한지
2. 별도 테이블/migration 이 필요한지
3. Turnstile 도입 시 `vercel.json` CSP 추가가 필요한지
4. 비밀번호 변경 후 기존 세션 강제 만료를 할지

## 구현 상태
- 아직 미구현이다.
- 현재는 문서 기준 정리 단계다.

## current 운영 원칙
- active current 는 이 문서 1개만 유지한다.
- 방금 끝난 구현은 complete 로 올리고 current 에 누적하지 않는다.
- 다음 구현은 이 문서 phase 기준으로만 진행한다.

## 한 줄 결론
지금 active current 는 **휴대폰 OTP 기반 비밀번호 재설정 + 로그인 실패 방어 구조 설계/구현** 이다.
