# RENTCAR00 API 축소 정리 현재 계획 문서

## 문서 상태
- 상태: active current
- 용도: API 파일 수 11개 → 7개 축소 작업의 기준과 결과 기록
- 기준 커밋(문서 갱신 시점): 작업 반영 후 커밋 예정
- 운영 alias: `https://rentcar00.com`
- 관련 문서:
  - `docs/present/RENTCAR00_API_CURRENT.md`
  - `tasks/RENTCAR00_API_CLEANUP_TASKS.md`

---

## 0. 실행 결과 요약

이번 정리의 목표는 완료됐다.

```text
11개 → 7개
```

### 유지된 파일
```text
api/search-cars.js
api/car-detail.js
api/auth/[action].js
api/auth/otp/[action].js
api/guest-bookings/[action].js
api/member/bookings.js
api/admin/bookings.js
```

### 제거된 파일
```text
api/member/bookings/[reservationCode].js
api/member/bookings/[reservationCode]/cancel.js
api/admin/booking-confirm.js
api/admin/booking-cancel.js
```

---

## 1. 최종 판단

붙여준 분석의 큰 방향은 맞았고,
실제 구현 기준으로는 아래 방식이 가장 안전했다.

- `member/bookings.js` 유지
- `admin/bookings.js` 유지
- 기존 진입점을 기준 라우트로 승격
- 중복 파일만 제거

즉,
**신규 `[action].js` 도입 없이 현재 쓰는 진입점을 중심으로 통합**했다.

---

## 2. 왜 이 안으로 확정했는가

### 이유 1. 실제 프론트 호출과 맞는다
member는 이미 아래를 사용 중이었다.

```text
GET /api/member/bookings
GET /api/member/bookings?reservationCode=...
POST /api/member/bookings?action=cancel&reservationCode=...
```

admin도 목록은 이미 아래를 사용 중이었다.

```text
GET /api/admin/bookings?... 
```

따라서 변경 폭을 최소화하려면,
`bookings.js` 를 유지하고 내부 분기만 흡수하는 게 맞았다.

### 이유 2. 함수 수 절감 효과는 동일하다
삭제 대상 4개를 제거하면 바로 7개가 된다.

### 이유 3. 새 패턴 도입 리스크를 줄인다
신규 `[action].js` 경로 전환 없이도 같은 결과를 얻을 수 있었다.

---

## 3. 최종 라우트 정책

### 검색
```text
GET /api/search-cars
GET /api/car-detail?carId=...&detailToken=...
```

### 인증
```text
GET /api/auth/me
POST /api/auth/signup
POST /api/auth/otp/send
POST /api/auth/otp/verify
```

### 비회원 예약
```text
POST /api/guest-bookings/create
POST /api/guest-bookings/lookup
POST /api/guest-bookings/cancel
```

### 회원 예약
```text
GET /api/member/bookings
GET /api/member/bookings?reservationCode=...
POST /api/member/bookings?action=cancel&reservationCode=...
```

### 관리자 예약
```text
GET /api/admin/bookings?tab=...&q=...&qField=...&page=...&pageSize=...
GET /api/admin/bookings?action=confirm-target&token=...
POST /api/admin/bookings?action=confirm
POST /api/admin/bookings?action=cancel
```

---

## 4. 실행 후 검증 결과

### 통과
- API 파일 수 7개 확인
- 로컬 빌드 통과
- 코드 기준 구 API 호출 제거 확인
- member 상세/취소는 기존 `bookings.js` 경로 유지
- admin 확정/취소는 `admin/bookings.js` 로 흡수 완료

### 주의
- present 문서는 최신 기준으로 같이 갱신해야 한다.
- past 문서에는 과거 경로가 남아 있어도 무방하다.
- 운영 실응답 검증은 재배포 후 다시 확인 필요하다.

---

## 5. 남은 운영 체크

1. 프로덕션 재배포
2. `/api/admin/bookings?action=confirm-target&token=...` 응답 확인
3. `/api/admin/bookings?action=confirm` 응답 확인
4. `/api/admin/bookings?action=cancel` 응답 확인
5. Solapi 운영 ENV 설정 후 OTP 확인

---

## 6. 한 줄 결론

API 축소 정리는 **완료**됐다.
현재 기준 최적안은 **기존 `bookings.js` 중심 통합**이며, 다음 확인 포인트는 **운영 재배포와 실응답 검증**이다.
