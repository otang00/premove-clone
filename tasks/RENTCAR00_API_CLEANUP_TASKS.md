# RENTCAR00 API cleanup tasks

## 목적
현재 배포 가능한 11개 API 구조를 기준으로, 중복 라우트와 장기 확장 리스크를 줄이기 위한 다음 작업 목록을 고정한다.

## 현재 기준
- 기준 커밋 전 상태: `3dfc6c7`
- 운영 alias: `https://rentcar00.com`
- 현재 API 파일 수: 11
- 현재 핵심 blocker: Solapi 운영 ENV 미설정

---

## 우선순위 1
### member 예약 API 중복 정리
대상:
- `api/member/bookings.js`
- `api/member/bookings/[reservationCode].js`
- `api/member/bookings/[reservationCode]/cancel.js`

할 일:
1. 집약형 유지 vs 경로형 유지 결정
2. 살아남길 기준 라우트 확정
3. 프론트 호출 경로 전수 점검
4. 중복 라우트 제거
5. 회귀 검증

완료 조건:
- 회원 예약 목록/상세/취소가 한 정책으로만 동작
- 동일 기능을 두 경로로 제공하지 않음

---

## 우선순위 2
### OTP 운영 준비 완료
할 일:
1. Vercel 운영 ENV에 Solapi 설정 반영
2. `/api/auth/otp/send` 실발송 확인
3. `/api/auth/otp/verify` 연계 확인
4. 회원가입 end-to-end 검증

완료 조건:
- 운영에서 실제 문자 수신 확인
- signup 제출까지 정상 연결

---

## 우선순위 3
### API 스타일 통일
할 일:
1. 축별로 action형 / REST형 혼용 여부 점검
2. 신규 API 추가 규칙 문서화
3. 함수 수 제한을 고려한 기본 패턴 고정

완료 조건:
- 같은 도메인 축에서 라우트 스타일이 섞이지 않음

---

## 우선순위 4
### 플랜 판단
선택지:
- Hobby 유지: API 압축 규칙 강화
- Pro 전환: 함수 수 제약 완화 후 직관적 라우트 복원 검토

완료 조건:
- 다음 기능 추가 전에 플랜 전략 확정
