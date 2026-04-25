# LOGIN SYSTEM 현재 문서

## 문서 상태
- 상태: active current
- 용도: 로그인/회원가입/OTP 기준 문서
- 기준 브랜치: `feat/db-preview-home`
- 연관 current 문서:
  - `docs/present/RENTCAR00_SIGNUP_PROFILE_CURRENT.md`
  - `docs/present/RENTCAR00_RESERVATION_CURRENT.md`

---

## 0. 목적

이 문서는 현재 프로젝트의 로그인 시스템을 다시 정의한다.
현 구현 기준은,
**이메일 로그인 + 회원정보 입력 회원가입 + 휴대폰 OTP + 회원/비회원 예약 연계**를 하나의 정책으로 잠그는 문서다.
카카오는 다음 phase 로 넘긴다.

이번 문서에서 확정하는 것:
1. 회원 모델
2. 로그인 수단(provider) 역할
3. 회원가입 완료 조건
4. 휴대폰 OTP 역할
5. 예약 가능 판단 기준
6. phase 별 구현 뼈대와 종료 조건

---

## 1. 현재 기준 요약

### 1.1 최종 운영 원칙
```plain text
회원은 하나다.
로그인 수단만 여러 개다.
카카오는 다음 phase 로 넘긴다.
휴대폰 OTP는 예약 연락처 검증이다.
회원은 가입 때 OTP 인증을 완료한다.
비회원은 예약 때 OTP 인증을 완료한다.
번호 변경 시에는 다시 인증한다.
예약과 결제는 서버 검증을 통과해야 한다.
카카오 전화번호는 자동 입력값일 뿐 인증 완료 근거가 아니다.
```

### 1.2 현 current 기준
- 회원가입 current 기준은 `이름 + 생년월일 + 이메일 + 비밀번호 + 휴대폰 OTP + 주소 + 약관` 이다.
- 예전 최소가입 정책은 현 current 기준이 아니다.
- 카카오는 구조상 다음 phase 확장 대상으로만 남긴다.

---

## 2. 현재 구조 진단

### 2.1 현재 앱 구조
- 프론트는 `Vite + React SPA + React Router` 구조다.
- 라우팅은 `src/App.jsx` 에서 처리한다.
- 서버는 루트 `api/*.js` 함수 구조다.
- 서버 Supabase 접근은 `server/supabase/createServerClient.js` 기반이다.

### 2.2 인증 전략 결론
- 현재 구조는 Next.js SSR 세션 구조가 아니다.
- 따라서 `@supabase/ssr` 중심이 아니라,
  **`@supabase/supabase-js` 기반 클라이언트 로그인 + bearer token 전달 + API 검증** 구조로 간다.
- 서버는 service role 로 세션을 추정하지 않고, 전달받은 access token 기준으로 사용자 컨텍스트를 검증한다.

---

## 3. 회원 모델 기준

### 3.1 회원 타입
회원 타입은 아래 2개만 사용한다.

```plain text
member
- 서비스 회원
- 현재 phase 에서는 이메일 로그인 기반
- phone_verified = true 여야 정상 예약 가능

guest
- 비회원 예약자
- 예약 단계에서 guest_phone_verified = true 필요
```

### 3.2 현재 phase 해석
- 현재 구현은 `email` 가입/로그인 기준으로 잠근다.
- provider 확장 구조는 염두에 두되, 이번 phase 문서 범위에서 카카오 세부 정책은 확정하지 않는다.
- 예약 가능 여부는 로그인 수단이 아니라 `phone_verified` 로 판단한다.

---

## 4. 회원가입 기준

### 4.1 회원가입 완료 조건
현 current 기준 회원가입 완료 조건은 아래다.

- 이름 입력 완료
- 생년월일 입력 완료
- 이메일 입력 완료
- 비밀번호 정책 충족
- 비밀번호 확인 일치
- 휴대폰 OTP 인증 완료
- 우편번호 입력 완료
- 기본주소 입력 완료
- 상세주소 입력 완료
- 필수 약관 동의 완료

### 4.2 회원가입 수집 항목
- 이름
- 생년월일
- 이메일
- 비밀번호
- 비밀번호 확인
- 휴대폰 번호
- SMS OTP 인증번호
- 우편번호
- 기본주소
- 상세주소
- 필수 약관 동의
- 선택 마케팅 동의

### 4.3 이전 최소가입 정책과의 관계
- 주소/생년월일을 뒤로 미루는 해석은 현 current 기준에서 채택하지 않는다.
- 현재 phase 는 회원정보 직접 입력 회원가입 화면을 먼저 완성한다.

---

## 5. 카카오 범위 메모

- 카카오는 다음 phase 로 넘긴다.
- 현재 로그인 current 는 카카오 세부 정책을 구현 기준으로 잠그지 않는다.
- 필요 시 다음 phase current 문서에서 카카오 로그인/카카오싱크/identity 연결을 다시 정의한다.

---

## 6. 휴대폰 OTP 기준

### 6.1 역할 정의
휴대폰 OTP 는 연락 가능한 번호 검증이다.
법적 본인확인이 아니다.

### 6.2 member 기준
- 회원은 가입 시 OTP 1회 완료
- 이후 예약마다 반복 OTP 요구하지 않음
- 번호 변경 시 새 번호 OTP 재인증

### 6.3 guest 기준
- 비회원은 예약 전 OTP 인증 필수
- guest 예약 흐름은 member 와 분리 관리

### 6.4 OTP 목적값
권장 purpose:
- `signup`
- `kakao_onboarding`
- `guest_reservation`
- `phone_change`
- `reservation_lookup`

### 6.5 보안 원칙
- OTP 원문 저장 금지
- 로그에 OTP 출력 금지
- localStorage 저장 금지
- query string 포함 금지
- 발송 제한과 실패 횟수 제한은 서버에서 강제

---

## 7. 데이터 구조 기준

### 7.1 인증 원본
- 인증 기준 원본은 Supabase `auth.users`
- 앱 레벨 회원정보는 `profiles`

### 7.2 `profiles` current 기준 컬럼
현재 최소+확장 기준은 아래다.
- `id`
- `email`
- `name`
- `birth_date`
- `phone`
- `phone_verified`
- `phone_verified_at`
- `postal_code`
- `address_main`
- `address_detail`
- `marketing_agree`
- `profile_status`
- `created_at`
- `updated_at`

### 7.3 권장 상태값
`profile_status` 권장값:
- `incomplete`
- `phone_unverified`
- `active`
- `blocked`
- `withdrawn`

### 7.4 provider identity
provider 연결은 별도 identity 레이어가 필요하다.
개념 구조:
```plain text
member_identities
- id
- user_id
- provider
- provider_user_id
- provider_email
- linked_at
- created_at
```

현재 문서 기준:
- provider 를 회원 타입으로 쓰지 않는다.
- email/kakao 연결 구조를 준비한다.

### 7.5 예약 연결 기준
- 예약 원장은 `booking_orders`
- 회원 예약은 `booking_orders.user_id`
- 비회원 예약은 `user_id = null`
- 비회원 예약 인증은 기존 guest 흐름 유지

---

## 8. 예약 가능 기준

### 8.1 member 예약 가능 조건
```plain text
로그인된 member
profile exists
profile_status = active
phone_verified = true
phone exists
```

### 8.2 guest 예약 가능 조건
```plain text
guest_name exists
guest_phone exists
guest_phone_verified = true
reservation_draft 또는 동등 상태 존재
```

### 8.3 서버 재검증 원칙
프론트 상태만 믿지 않는다.
결제 전/예약 확정 전 서버에서 아래를 다시 확인한다.
- member 또는 guest 인증 상태
- phone_verified 또는 guest_phone_verified
- 예약 가능 상태
- 금액/재고/중복 확정 여부

---

## 9. 화면/라우팅 기준

### 9.1 `/signup`
현재 `/signup` 은 단순 이메일 가입 페이지가 아니라,
**운영형 회원가입 페이지**로 본다.

포함 요소:
- 이름
- 생년월일
- 이메일
- 비밀번호
- 비밀번호 확인
- 휴대폰 번호 + OTP
- 주소 입력
- 약관 동의

### 9.2 `/login`
포함 요소:
- 이메일 로그인
- 카카오 로그인 버튼
- 비밀번호 재설정 진입
- 가입 유도

### 9.3 카카오 onboarding 화면
필요 시 별도 화면 또는 `/signup` 재사용 구조로 처리한다.
조건:
- 카카오 로그인 성공했지만 필수 정보 미완성
- phone_verified 미완료
- 주소/생년월일/약관 미완성

---

## 10. 서버 책임 기준

### 10.1 로그인
- 이메일/비밀번호 로그인 처리
- 카카오 OAuth 결과 처리
- 세션 복원과 사용자 식별

### 10.2 회원가입
- 이메일 signup
- profile upsert
- 약관/프로필 필수값 검증
- phone_verified 상태 확인

### 10.3 OTP
- 발송 요청 처리
- 검증 요청 처리
- purpose 별 후처리
- 발송/실패 제한 적용

### 10.4 보호 API
- bearer token 추출
- access token 검증
- member/guest 상태 분기
- 회원 예약내역 반환

### 10.5 예약 연결
- 로그인 회원 예약 생성 시 `booking_orders.user_id` 저장
- 비회원 예약은 guest 흐름 유지
- 결제 전/확정 전 인증 상태 재검증

---

## 11. 범위 잠금

## 11.1 이번 current 기준에 포함되는 축
1. 이메일 로그인
2. 운영형 회원가입 설계
3. 회원가입 단계 휴대폰 OTP 필수화
4. 프로필 확장 기준
5. 보호 API 기준
6. 회원/비회원 예약 연계 기준

## 11.2 이번 current 기준에서 제외되는 것
- 카카오 로그인
- 카카오싱크
- provider identity 세부 설계
- Next.js 전환
- `@supabase/ssr` 기반 구조
- 법적 본인확인 서비스
- 자동 계정 병합
- 면허 진위 확인 세부 구현
- 운영자 수동 병합 도구

---

## 12. 구현 Phase 뼈대

## Phase 1. 데이터 계약 재정의
### 목적
현 current 기준에 맞게 `profiles` 와 provider/OTP 관련 계약을 다시 잠근다.

### 범위
- `profiles` 확장 컬럼 정의
- `profile_status` 상태값 정의
- phone_verified 필드 정의
- provider identity 개념 잠금

### 종료 조건
- 회원가입/카카오/예약 검증이 같은 데이터 모델을 바라봄

---

## Phase 2. 회원가입 화면 계약 잠금
### 목적
운영형 회원가입 화면을 구체 사양으로 닫는다.

### 범위
- 필드 순서
- 유효성 규칙
- OTP 상태 UI
- 주소 검색 UX
- 약관 구조
- 버튼 활성화 조건

### 종료 조건
- `/signup` 화면 동작이 문장만으로 구현 가능함

---

## Phase 3. 이메일 가입 구현
### 목적
이메일 회원가입을 현 current 기준으로 실제 동작하게 한다.

### 범위
- 이름/생년월일/이메일/비밀번호/전화번호/주소/약관 수집
- OTP 완료 후 signup 허용
- profile upsert 보강

### 종료 조건
- 이메일 회원가입 완료 시 `profiles` 필수값이 채워짐
- phone_verified 없는 가입 완료가 차단됨

---

## Phase 4. 보호 API/예약 연결 구현
### 목적
회원/비회원 예약 흐름이 current 기준과 맞게 서버 검증을 통과하도록 한다.

### 범위
- `/api/auth/me`
- `/api/member/bookings`
- 예약 생성 시 member `user_id` 연결
- guest 예약 비영향 유지

### 종료 조건
- member/guest 예약 정책이 provider 와 분리되어 동작함

---

## Phase 5. 번호 변경/안정화
### 목적
실운영에서 꼬일 부분을 방지한다.

### 범위
- 번호 변경 OTP
- 동일 번호 중복 차단
- 카카오 중복 생성 방지
- 회귀 검증

### 종료 조건
- 번호 변경과 중복 회원 이슈에 대한 기본 방어가 있음

---

## 13. 수정 파일 축

### 프론트
- `src/lib/supabaseClient.js`
- `src/context/AuthContext.jsx`
- `src/hooks/useAuth.js`
- `src/pages/LoginPage.jsx`
- `src/pages/SignupPage.jsx`
- 필요 시 카카오 onboarding 관련 페이지/컴포넌트

### 서버
- `server/auth/ensureProfileForUser.js`
- token 검증 helper
- OTP 발송/검증 API
- `api/auth/me.js`
- `api/member/bookings.js`
- 카카오 OAuth 처리 경로

### DB
- `profiles` 확장 migration
- 필요 시 identity/OTP 로그 관련 migration

---

## 14. 최종 정리

- 현 current 기준은 **카카오 기준 기본설계**다.
- 회원가입에서 **생년월일을 받는다.**
- 회원가입에서 **주소를 받는다.**
- 현재 phase 는 **카카오를 넘기고 회원정보 입력 회원가입**을 먼저 만든다.
- 예약 가능 여부는 로그인 수단이 아니라 **phone_verified** 기준이다.
- 예전 최소가입 정책은 현 current 문서 기준이 아니다.
- 로그인 문서와 회원가입 문서는 이 기준으로 함께 움직인다.
