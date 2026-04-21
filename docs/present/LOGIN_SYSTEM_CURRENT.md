# LOGIN SYSTEM 현재 문서

## 문서 상태
- 상태: active current
- 용도: 로그인 및 회원 운영 축 실행 기준 문서
- 기준 브랜치: `feat/db-preview-home`
- 연관 current 문서: `docs/present/RENTCAR00_RESERVATION_CURRENT.md`

---

## 0. 목적

이 문서는 현재 프로젝트 구조에 맞는 로그인 시스템 구현 기준을 실행 중심으로 잠근다.

이 문서에서 확정하는 것은 아래다.

1. 현재 프론트/서버 구조에서 어떤 인증 방식을 쓸지
2. Supabase Auth 를 어떤 레이어에 붙일지
3. 로그인, 세션, 보호 API, 예약 연결을 어떤 순서로 구현할지
4. phase 별 수정 파일 범위와 종료 조건이 무엇인지
5. 이후 카카오 확장까지 어떤 기준으로 이어갈지

---

## 1. 현재 구조 진단

### 1.1 현재 홈페이지 구조
- 프론트는 **Vite + React SPA + React Router** 구조다.
- 엔트리는 `src/main.jsx` 이고 `BrowserRouter` 를 사용한다.
- 라우팅은 `src/App.jsx` 에서 클라이언트 라우팅으로 처리한다.
- `/login`, `/signup` 은 아직 `PlaceholderPage` 상태다.
- 서버는 Next.js route handler 가 아니라 루트 `api/*.js` 함수 구조다.
- 서버 Supabase 접근은 현재 `server/supabase/createServerClient.js` 에서 `@supabase/supabase-js` 로 직접 생성한다.

### 1.2 현재 판단
- 이 프로젝트는 Next.js SSR 구조가 아니다.
- 따라서 현재 기준 로그인 1차 구현에서 `@supabase/ssr` 를 핵심 전제로 잡지 않는다.
- 지금은 **`@supabase/supabase-js` 기반 클라이언트 로그인 + access token 전달 + API 검증** 구조가 맞다.

### 1.3 현재 제약
- 서버 컴포넌트, middleware, cookie-based SSR 세션 구조가 없다.
- 따라서 Next.js 전용 가이드 그대로 들이밀면 과구현이 된다.
- 먼저 SPA 구조에 맞는 인증 흐름을 붙이고, 나중에 프레임워크 전환이 필요할 때 SSR 방식으로 재검토한다.

---

## 2. 최종 구현 방향

### 2.1 1차 로그인 방식
- 1차는 **Supabase Auth 기본 로그인**으로 간다.
- 기본 로그인 방식은 **이메일 + 비밀번호** 로 고정한다.
- 비밀번호 분실 시에는 **비밀번호 재설정 링크**를 사용한다.
- 매직링크는 현재 범위에서 제외하고 후순위 확장으로 둔다.
- 단, 문서상 소셜 확장 가능성은 유지하되 현재 구조 정착을 위해 **Supabase 세션 구조를 먼저 붙인다.**

### 2.2 현재 권장 순서
1. Supabase Auth 클라이언트 기반 로그인 골격
2. 이메일 + 비밀번호 회원가입/로그인
3. 비밀번호 재설정 경로
4. 세션 유지와 로그인 상태 표시
5. 보호 API 검증 경로
6. 회원 예약내역 기본 연결
7. 그 다음 카카오 OAuth 확장

### 2.3 핵심 원칙
- 비회원 예약은 계속 유지한다.
- 로그인은 예약 필수 조건이 아니다.
- 예약 원장과 계정 시스템은 분리한다.
- 로그인 사용자는 예약 이력 연결 편의만 추가한다.
- 서버는 service role 로 세션을 추정하지 않고, **클라이언트 access token 검증**을 통해 사용자 컨텍스트를 받는다.

---

## 3. 아키텍처 기준

### 3.1 클라이언트
책임:
- 로그인/로그아웃 호출
- 세션 저장 및 갱신
- 현재 사용자 상태 관리
- 보호 API 호출 시 bearer token 전달

권장 파일 축:
- `src/lib/supabaseClient.js`
- `src/context/AuthContext.jsx`
- `src/hooks/useAuth.js`
- `src/pages/LoginPage.jsx`
- `src/pages/SignupPage.jsx`

### 3.2 서버 API
책임:
- Authorization header 로 access token 수신
- 토큰 검증 후 사용자 식별
- 사용자 기준 데이터만 반환
- 예약 원장과 회원 계정 연결 처리

권장 파일 축:
- `server/auth/getAccessTokenFromRequest.js`
- `server/auth/getUserFromAccessToken.js`
- `api/auth/me.js`
- `api/member/bookings.js`
- 필요 시 `api/member/link-booking.js`

### 3.3 데이터 구조
기본 방향:
- Supabase Auth `auth.users` 를 인증 기준으로 사용
- 앱 레벨 프로필은 별도 `profiles` 테이블로 운용
- 예약 원장은 기존 `booking_orders`
- 회원 연결은 `booking_orders.user_id` 또는 연결 테이블 사용

현재 권장:
- 1차는 `profiles` 를 도입한다.
- 예약 연결은 `booking_orders.user_id nullable` 추가 또는 별도 연결 테이블 도입 중 하나를 Phase 1 에서 확정한다.
- 연결 규칙이 복잡해지면 별도 연결 테이블로 확장한다.

---

## 4. 범위 잠금

## 4.1 이번 로그인 실행 범위
1. Supabase Auth 클라이언트 초기화
2. 이메일 + 비밀번호 회원가입/로그인 페이지 구현
3. 비밀번호 재설정 페이지 또는 경로 구현
4. AuthContext 로 세션 유지
5. 헤더/메뉴 로그인 상태 반영
6. `api/auth/me` 구현
7. `api/member/bookings` 보호 API 구현
8. 예약내역 페이지 placeholder 를 로그인 사용자 기준 페이지로 전환

## 4.2 이번 범위에서 제외
- Next.js 전환
- `@supabase/ssr` 기반 쿠키 세션 구조
- 카카오/네이버 소셜 로그인 실제 연결
- 매직링크 로그인
- SMS OTP
- 면허확인
- 운영자 계정 병합 도구

---

## 5. Phase 로드맵

## Phase 1. 인증 기반 잠금
### 목적
현재 프로젝트 구조에 맞는 인증 방식을 확정한다.

### 해야 할 일
- `@supabase/ssr` 비적용 결정 명시
- `@supabase/supabase-js` 기반 SPA 인증 경로 고정
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 사용 위치 정리
- 서버 전용 키 사용 위치 정리
- redirect URL 정책 정리

### 수정 범위
- `docs/present/LOGIN_SYSTEM_CURRENT.md`
- 필요 시 `.env.example` 또는 환경변수 문서

### 종료 조건
- 현재 구조에서 어떤 라이브러리와 세션 전략을 쓰는지 한 문장으로 설명 가능

---

## Phase 2. 클라이언트 Auth 골격 구현
### 목적
프론트에서 로그인 상태를 유지할 최소 기반을 만든다.

### 해야 할 일
- `src/lib/supabaseClient.js` 생성
- `src/context/AuthContext.jsx` 생성
- 앱 루트에 AuthProvider 연결
- `onAuthStateChange` 구독
- 로딩/비로그인/로그인 상태 분기 공통화

### 수정 범위
- `src/main.jsx`
- 신규 `src/lib/supabaseClient.js`
- 신규 `src/context/AuthContext.jsx`
- 신규 `src/hooks/useAuth.js`

### 종료 조건
- 새로고침 후에도 로그인 세션 상태를 읽을 수 있다.
- 전역에서 현재 사용자 접근이 가능하다.

---

## Phase 3. 로그인/회원가입 UI 구현
### 목적
placeholder 인 `/login`, `/signup` 을 실제 동작 페이지로 바꾼다.

### 해야 할 일
- `LoginPage.jsx` 구현
- `SignupPage.jsx` 구현
- 이메일 + 비밀번호 sign in / sign up 구현
- 성공/실패/로딩 UI 처리
- 로그인 후 이동 경로 정리

### 수정 범위
- `src/App.jsx`
- 신규 `src/pages/LoginPage.jsx`
- 신규 `src/pages/SignupPage.jsx`
- 필요 시 공용 form 컴포넌트

### 종료 조건
- 회원가입 가능
- 로그인 가능
- 로그아웃 가능
- `/login`, `/signup` placeholder 제거

---

## Phase 4. 비밀번호 재설정 경로 구현
### 목적
비밀번호를 잊은 사용자가 재설정 링크로 복구할 수 있게 한다.

### 해야 할 일
- 비밀번호 재설정 요청 UI 구현
- 재설정 링크 발송 경로 구현
- 재설정 완료 페이지 또는 처리 경로 구현
- 성공/실패/만료 상태 처리

### 수정 범위
- 신규 비밀번호 재설정 관련 페이지
- 필요 시 `src/App.jsx`

### 종료 조건
- 비밀번호 재설정 링크 발송 가능
- 재설정 완료 후 다시 로그인 가능

---

## Phase 5. 로그인 상태 UI 반영
### 목적
홈페이지에서 로그인 상태가 실제로 보이게 한다.

### 해야 할 일
- 헤더의 `로그인`, `회원가입` 버튼 상태 분기
- 로그인 시 사용자 메뉴 또는 `예약내역` 진입 연결
- 로그아웃 버튼 배치
- 비로그인/로그인 상태별 CTA 정리

### 수정 범위
- 헤더 관련 컴포넌트
- `src/components/Layout.jsx` 또는 관련 헤더 컴포넌트
- landing header / brand header

### 종료 조건
- 로그인 시 헤더에 상태 반영
- 로그아웃 후 즉시 UI 반영

---

## Phase 6. 서버 보호 API 구현
### 목적
로그인 사용자에게 회원 기준 예약내역을 붙일 수 있는 보호 API 기반을 만든다.

### 해야 할 일
- bearer token 추출 helper 작성
- Supabase 로 token 사용자 조회 helper 작성
- `api/auth/me.js` 구현
- 보호 API 공통 검증 함수 작성
- `api/member/bookings.js` 구현

### 수정 범위
- 신규 `server/auth/getAccessTokenFromRequest.js`
- 신규 `server/auth/getUserFromAccessToken.js`
- 신규 `api/auth/me.js`
- 신규 `api/member/bookings.js`

### 종료 조건
- 로그인 사용자가 `/api/auth/me` 호출 시 본인 정보 반환
- 토큰 없거나 잘못되면 401 처리
- 로그인 사용자는 본인 예약내역 조회 가능

---

## Phase 7. 비회원 예약 사후 연결
### 목적
기존 비회원 예약을 로그인 계정에 연결할 수 있는 기반을 마련한다.

### 해야 할 일
- 연결 기준: 예약번호 + 휴대폰/생년월일 또는 추가 인증
- 연결 API 초안 작성
- 자동 연결과 수동 연결 기준 분리

### 수정 범위
- 신규 `api/member/link-booking.js` 또는 별도 설계 문서
- 회원 예약 페이지 연결 UI

### 종료 조건
- 비회원 예약을 회원 계정으로 귀속시키는 규칙이 문서상 잠김

---

## Phase 8. 소셜 로그인 확장
### 목적
카카오를 우선으로 실제 소셜 로그인까지 확장한다.

### 해야 할 일
- Supabase provider 지원 방식 검토
- 카카오 OAuth redirect 설정
- provider 계정과 내부 프로필 연동
- 이후 네이버 확장

### 종료 조건
- 카카오 로그인 도입 범위와 선행조건이 분리 설명 가능

---

## 6. 구현 세부 기준

### 6.1 세션 처리
- 클라이언트에서 Supabase session 을 유지한다.
- access token 은 보호 API 호출 시 Authorization header 로 전달한다.
- 서버는 전달받은 token 으로 사용자 검증만 수행한다.
- 현재 단계에서 서버 세션 쿠키 중심 구조로 가지 않는다.

### 6.2 사용자 프로필
- 인증 계정 원본은 Supabase Auth
- 앱 표시용 정보는 `profiles` 테이블로 분리 권장
- 최초 로그인 성공 시 `profiles` row 를 upsert 한다.
- 최소 컬럼:
  - `id`
  - `email`
  - `name`
  - `phone`
  - `marketing_agree`
  - `created_at`
  - `updated_at`

### 6.3 예약 연결
- 로그인 상태 예약 생성 시 예약과 회원 계정 연결이 가능해야 한다.
- 비회원 예약은 연결 없이 유지한다.
- `booking_orders.user_id nullable` 추가 또는 별도 연결 테이블 도입 중 하나를 Phase 1 에서 확정한다.
- 사후 연결 시에만 기존 비회원 예약을 귀속 처리한다.

### 6.4 데이터 접근 원칙
- 브라우저는 Supabase Auth 인증만 직접 사용한다.
- 서비스 데이터는 내부 `api/*.js` 를 통해서만 접근한다.

### 6.5 보안
- service role key 는 브라우저에 노출 금지
- 브라우저는 anon key 만 사용
- 보호 API 는 토큰 검증 없이 회원 데이터 반환 금지
- 비회원 조회 API 와 회원 API 를 혼용하지 않는다.

---

## 7. 검증표

## Phase 2 검증
- 앱 시작 시 세션 읽기 성공
- 로그인 상태 전역 접근 가능
- 로그아웃 후 상태 초기화 성공

## Phase 3 검증
- 회원가입 성공
- 로그인 성공
- 실패 메시지 정상 노출
- 리다이렉트 정상 동작

## Phase 4 검증
- 비밀번호 재설정 링크 발송 성공
- 재설정 후 재로그인 가능
- 실패 또는 만료 상태 메시지 정상 노출

## Phase 5 검증
- 헤더 상태 반영
- 로그인/로그아웃 UI 동작
- 예약내역 진입 경로 정상

## Phase 6 검증
- `/api/auth/me` 200/401 분기 정상
- 잘못된 토큰 거부
- 서버에서 사용자 id 식별 가능
- 로그인 사용자 본인 예약만 조회
- 비회원 예약 조회 흐름 비영향
- 예약 데이터 노출 범위 과다 없음

---

## 8. 현재 리스크

1. 지금 구조에서 SSR 가이드 따라가면 구현이 불필요하게 복잡해질 수 있다.
2. 로그인 도입 전에 예약 원장 연결 컬럼이 없으면 회원 예약내역 구현이 다시 꼬일 수 있다.
3. 소셜 로그인부터 바로 붙이면 현재 세션/보호 API 골격 없이 표면 기능만 생길 수 있다.
4. 비회원 조회와 회원 조회를 섞으면 인증 경계가 흐려질 수 있다.

현재 대응:
- 먼저 Supabase 기본 세션 구조를 붙인다.
- 그 다음 보호 API 와 회원 예약조회 연결을 만든다.
- 카카오는 그 위에 올린다.

---

## 9. 현재 결론

- 이 프로젝트의 로그인 1차 구현은 **Next.js / `@supabase/ssr` 방식이 아니다.**
- 현재 구조에는 **`@supabase/supabase-js` 기반 SPA 로그인**이 맞다.
- 기본 로그인은 **이메일 + 비밀번호** 로 간다.
- 비밀번호 분실은 **재설정 링크**로 처리한다.
- 매직링크는 현재 범위에서 제외하고 후순위로 둔다.
- 실행 순서는 아래로 잠근다.
  1. Auth 골격
  2. 로그인/회원가입 UI
  3. 비밀번호 재설정
  4. 로그인 상태 UI 반영
  5. 보호 API
  6. 회원 예약내역
  7. 비회원 예약 사후 연결
  8. 카카오 확장

이 순서를 바꾸지 않는다.
