# 2026-04-28 RENTCAR00 전화번호 로그인 전환 마스터

## 문서 상태
- 상태: active current
- 용도: 전화번호 기반 회원 식별/로그인 전환의 최종 current 기준
- 기준 브랜치: `feat/db-preview-home`
- 우선순위: urgent
- 관련 문서:
  - `docs/present/2026-04-28_RENTCAR00_AUTH_EMERGENCY_PHASE_CURRENT.md`
  - `docs/present/LOGIN_SYSTEM_CURRENT.md`
  - `docs/present/RENTCAR00_SIGNUP_PROFILE_CURRENT.md`

---

## 0. 최종 결정

기존 current 기준
- 로그인 ID: 이메일
- 회원가입 후 이메일 인증 검토
- 휴대폰 OTP는 보조 검증

새 current 기준
- **회원 식별자 = 휴대전화번호**
- **로그인 방식 = 휴대전화번호 + 비밀번호**
- **회원가입 전 휴대폰 OTP 완료 필수**
- 이메일은 당분간 **선택 연락처 필드 또는 부가 정보**로 격하
- 계정 신뢰 기준은 `phone_verified=true`

이 결정을 지금 하는 이유
- 아직 가입자가 없어 전환 비용이 가장 낮다.
- 렌터카 운영에서 실제 응대/조회 기준은 전화번호다.
- 지금 전환하지 않으면 이후 데이터/로그인/복구 정책 전환 비용이 급격히 커진다.

---

## 1. 이번 전환의 큰 원칙

### 1.1 바꾸는 것
1. 로그인 입력 기준을 이메일에서 전화번호로 변경
2. 회원가입 저장 기준을 전화번호 중심으로 변경
3. 서버 프로필 상태를 `phone_verified` 중심으로 재정의
4. 이메일 인증 정책 제거

### 1.2 이번 phase에서 유지하는 것
1. 비밀번호 기반 로그인 유지
2. Supabase Auth 사용 유지
3. `profiles` + `phone_verifications` 구조 유지
4. 주소/생년월일/약관 수집 유지

### 1.3 이번 phase에서 하지 않는 것
1. OTP-only 로그인 전환
2. 카카오 로그인 재설계
3. 비밀번호 재설정의 휴대폰 OTP 전환
4. guest 예약 OTP 구조 재정의
5. 운영자용 계정 병합/수정 도구

---

## 2. 전략 결론

### 추천 전략
- **구조는 최대한 유지하고 식별자만 전화번호로 전환한다.**
- 즉, Supabase Auth 는 계속 쓰되 앱 레벨의 로그인 ID/중복검사/프로필 기준축을 전화번호로 바꾼다.

### 왜 이 전략인가
- 완전 신규 인증체계 재구축보다 안전하다.
- 기존 OTP 구현을 그대로 살릴 수 있다.
- 비밀번호 로그인 구조를 재사용할 수 있다.
- 현재 phase 범위를 통제할 수 있다.

### 현실적 해석
- Supabase Auth 내부에는 이메일 필드가 남을 수 있다.
- 그러나 **앱 운영 기준에서는 전화번호가 실질 ID** 다.
- 이메일은 필수에서 선택으로 낮추거나, 내부용 placeholder 처리 여부를 별도 결정해야 한다.

---

## 3. 핵심 설계 결정

## 3.1 회원 식별자
- canonical identifier: `phone`
- 저장 형식: 숫자만, 국내 휴대전화 정규화 형식
- 중복 허용: 불가

## 3.2 로그인 방식
- 입력값: `phone + password`
- 프론트에서 전화번호 정규화 후 서버 전달
- 서버는 phone 기준으로 대상 auth user 를 찾아 로그인 처리

## 3.3 이메일 처리
이번 phase에서 두 가지 선택지가 있다.

### Option A. 이메일 선택 입력으로 유지
- 장점: 알림/문의 수집 가능
- 단점: Supabase Auth 기본 email 중심 구조와 충돌 가능성 검토 필요

### Option B. 이메일 입력 제거 또는 후순위화
- 장점: UX 단순
- 단점: 향후 메일 발송/문의 흐름 시 다시 수집 필요

### 현재 권고
- **이번 phase는 이메일을 필수에서 제거**
- UI 상에서는 선택 입력 또는 아예 숨김 후보
- 다만 구현 시작 전 Supabase signup/login 경로에 맞는 실제 처리 방식 확정 필요

## 3.4 프로필 상태값
권장 상태값
- `incomplete`
- `phone_unverified`
- `active`
- `blocked`
- `withdrawn`

규칙
- `blocked`, `withdrawn` 는 최우선 유지
- `phone_verified=true` 이면 `active`
- 필수 프로필 누락이면 `incomplete`
- 전화번호 미인증이면 `phone_unverified`
- `pending_email_verification` 는 신규 저장에서 더 이상 쓰지 않음

---

## 4. 구현 전 선결 확인사항

이 phase는 실제 구현 전에 아래를 먼저 잠가야 한다.

### 확인 1. Supabase Auth 에서 전화번호+비밀번호 가입/로그인 경로를 직접 사용할지
- 가능하면 Auth 자체를 phone 중심으로 맞춘다.
- 불가/복잡하면 과도기적으로 내부 email placeholder 전략 검토.

### 확인 2. 이메일 필드를 완전히 제거할지, 선택 입력으로 남길지
- 운영 알림/문의 메일 활용 계획과 함께 결정.

### 확인 3. 기존 reset-password 화면을 이번 phase에서 유지할지 비노출할지
- 전화번호 ID 체계와 충돌하는 UX 정리 필요.

이 3개는 구현 들어가기 전 기준점으로 잠가야 한다.

---

## 5. 전체 실행 계획

## Phase 0. 기준점 잠금
### 목적
문서와 정책을 전화번호 로그인 기준으로 통일한다.

### 범위
- current 문서 간 충돌 제거
- 이메일 로그인/이메일 인증 기준을 구기준으로 명시
- 본 문서를 상위 current 기준으로 지정

### 검증
- current 문서끼리 상충하는 지점 목록 정리 가능
- 구현자가 문서만 보고도 기준을 오해하지 않음

### 승인 게이트
- 사장님이 문서 기준 확정 승인

---

## Phase 1. 기술 경로 확정
### 목적
전화번호+비밀번호 인증을 어떤 방식으로 구현할지 고정한다.

### 범위
- Supabase native phone auth 가능성 확인
- 현재 `signUp/signInWithPassword` 대체 경로 조사
- 필요 시 placeholder email 전략 여부 판단
- phone unique / auth-user lookup 방식 확정

### 산출물
- 구현 방식 1안 확정
- 버리는 대안과 이유 기록

### 검증
- 실제 코드 구조 기준으로 호출 흐름 설명 가능
- signup/login API 계약서 초안 작성 가능

### 승인 게이트
- 사장님이 구현 방식 최종 선택 승인

---

## Phase 2. 데이터 계약 재정의
### 목적
전화번호를 canonical ID 로 쓰기 위한 DB 계약을 잠근다.

### 범위
- `profiles.phone` unique 기준 확정
- `email` 필수성 재정의
- `profile_status` 허용값 재정의
- 신규/기존 migration 영향 정리

### 수정 예상 축
- `supabase/migrations/*`
- `docs/present/LOGIN_SYSTEM_CURRENT.md`
- `docs/present/RENTCAR00_SIGNUP_PROFILE_CURRENT.md`

### 검증
- 신규 가입자 기준 중복/상태값 규칙 설명 가능
- migration 변경 목록이 문서와 1:1 매칭됨

### 승인 게이트
- 데이터 계약 승인 후 다음 phase 진행

---

## Phase 3. 회원가입 계약 재설계
### 목적
회원가입을 전화번호 중심으로 다시 잠근다.

### 범위
- 필수 입력 재정의
- 이메일 필드 처리 방식 반영
- OTP 완료 전 가입 불가 규칙 고정
- 서버 제출 payload shape 재정의

### 핵심 결정 포인트
- 이메일 필수/선택/제거
- 회원가입 성공 직후 자동 로그인 여부
- phone verification consume 시점

### 검증
- 회원가입 폼 state / API payload / DB 저장 필드가 일치
- 문장만으로 `/signup` 동작 재현 가능

### 승인 게이트
- 사장님이 회원가입 UX/필수항목 승인

---

## Phase 4. 로그인 계약 재설계
### 목적
로그인 입력/에러/세션 복원을 전화번호 기준으로 전환한다.

### 범위
- `/login` 화면 입력 필드 전환
- 전화번호 정규화 규칙 확정
- 로그인 에러 문구/실패 조건 정리
- 이메일 인증 관련 문구 제거

### 검증
- 로그인 성공/실패 조건이 문서와 코드에서 일치
- 사용자 시나리오 3개 이상으로 설명 가능

### 승인 게이트
- 로그인 UX 최종 승인

---

## Phase 5. 서버 auth/API 계약 전환
### 목적
서버가 phone 기반 인증 모델을 기준으로 동작하게 한다.

### 범위
- `api/auth/[action].js` signup/login/me 영향 범위 정리
- `server/auth/ensureProfileForUser.js` 상태 계산 전환
- `phone_verifications` 소비 규칙 재확인
- 보호 API에서 `phone_verified` 기준 유지 확인

### 검증
- auth/me 응답이 새 상태 규칙과 일치
- 신규 가입자 profile_status 가 기대값으로 저장됨
- 예약/보호 API가 phone_verified 기준으로 설명 가능

### 승인 게이트
- 서버 계약 승인 후 구현 phase 진입

---

## Phase 6. 화면/문구/복구 동선 정리
### 목적
사용자 혼란을 줄이기 위해 기존 이메일 중심 흔적을 정리한다.

### 범위
- 회원가입/로그인 안내 문구 정리
- forgot/reset-password 노출 여부 결정
- 이메일 인증 관련 카피 제거
- 필요 시 후속 TODO 명시

### 검증
- 사용자 화면에서 기준 충돌 문구가 없음
- 기존 이메일 인증 유도 문구가 제거됨

### 승인 게이트
- 문구/노출 정책 승인

---

## Phase 7. 구현 실행
### 목적
앞 단계에서 잠근 기준으로 실제 코드 수정 수행.

### 범위
- Phase 1~6 확정안 반영
- 프론트/서버/DB 단계별 반영
- 각 phase 종료 시 build/흐름 검증

### 검증
- 단계별 최소 검증 통과
- 변경 diff 가 phase 범위를 넘지 않음

### 승인 게이트
- 각 하위 phase 완료 후 보고
- 최종 승인 전 배포/후속 phase 미진행

---

## 6. 실행 phase를 실제 작업 단위로 쪼개면

### Execution Phase A. 문서 정렬
- current 문서 3~4개 갱신
- 충돌 규칙 제거
- 검증: 문서 간 용어/정책 일치

### Execution Phase B. DB/migration
- 상태값/제약/필수성 조정
- 검증: migration diff 확인

### Execution Phase C. signup 재작업
- signup form / API / profile 저장 수정
- 검증: build + signup payload 점검

### Execution Phase D. login 재작업
- login UI / API / 에러 처리 수정
- 검증: login 흐름 점검

### Execution Phase E. auth/me + 보호 API
- 상태 계산 전환
- 검증: me/profile 응답 점검

### Execution Phase F. 회귀 검증
- OTP / signup / login / 예약 영향 최소 점검
- 검증: 체크리스트 완료

### Execution Phase G. commit 대기
- diff 정리
- 검증 결과 정리
- **최종 승인 대기**

---

## 7. 단계별 검증 규칙

각 단계는 아래 4단계를 순서대로 닫는다.

1. 범위 고정
2. 수정
3. 검증
4. 승인대기

이번 요청 기준에서는
- 문서 단계도 동일 규칙 적용
- 코드 구현 단계도 동일 규칙 적용
- **최종 commit/배포/후속 phase 진입은 사장님 승인 전 미실행**

---

## 8. 현재 시점 추천 진행 순서

지금 바로 할 순서
1. 문서 기준 완전 잠금
2. 기술 경로 확정
3. 데이터 계약 잠금
4. 회원가입/로그인 계약 잠금
5. 승인받고 구현 시작

즉, 지금은 **설계 잠금 단계**까지 먼저 끝내는 게 맞다.

---

## 9. 핵심 리스크

1. Supabase phone/password 경로 제약
- 구현 방식 확정 전 추측 구현 금지

2. 이메일 제거 폭 결정
- 완전 제거인지 선택 필드 유지인지에 따라 범위 달라짐

3. 비밀번호 재설정 UX
- 전화번호 ID 체계와 기존 이메일 reset 동선이 충돌 가능

4. 카카오/guest 후속 영향
- 이번 phase 범위 밖이지만 용어 충돌은 미리 차단해야 함

---

## 10. 리스크 요약

1. 서버 검증 누락 위험
- `admin.createUser({ phone, password, phone_confirm: true })` 호출 전 OTP 재검증이 빠지면 검증되지 않은 번호가 confirmed 계정이 될 수 있다.

2. 중복 phone 충돌
- `profiles.phone` 뿐 아니라 auth user 쪽 phone 충돌도 같이 막아야 한다.

3. 상태값 과도기 리스크
- `pending_email_verification` 와 `email_confirmed_at` 의존이 남아 있으면 phone-first 정책과 상태 계산이 충돌할 수 있다.

4. 복구 UX 충돌
- 기존 forgot/reset-password 는 email 중심이므로 이번 phase에서는 최소 비노출 또는 문구 정리가 필요하다.

5. 전화번호 재할당 리스크
- 장기적으로 번호 변경 절차와 추가 복구 정책을 별도 phase 로 잠가야 한다.

---

## 11. 한 줄 결론

이번 전환의 본질은
**이메일 기반 회원모델을 억지로 다듬는 것이 아니라, 가입자 0명인 지금 전화번호를 실제 회원 식별자로 고정하고 그 기준으로 로그인/회원가입/프로필 상태를 다시 잠그는 것**이다.
