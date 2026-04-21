# rentcar00-booking-system

`rentcar00-booking-system`은 렌터카 검색/상세/예약 진입 흐름을
우리 서버와 DB 기준으로 재구성하는 예약 서비스 프로젝트다.

## 현재 기준 문서
문서는 아래 순서로 본다.

1. `docs/present/RENTCAR00_RESERVATION_CURRENT.md`
2. `docs/present/LOGIN_SYSTEM_CURRENT.md`
3. `docs/references/IMS_API_CALLS.md`

## 문서 정책
- 현재 active current 는 아래 2개다.
  - `docs/present/RENTCAR00_RESERVATION_CURRENT.md`
  - `docs/present/LOGIN_SYSTEM_CURRENT.md`
- rename 관련 문서는 current 에 두지 않고 `docs/past/present-history/` 에 보관한다.
- 단계별 설계/실행 문서는 `docs/archive/spec-history/` 로 이동했다.
- 과거 작업 지시/빌드 규칙 문서는 `docs/archive/working-notes/` 로 이동했다.
- 더 오래된 외형 프로토타입 문서는 `docs/archive/legacy-ui-prototype/` 로 유지한다.
- IMS 관련 참고 자료는 `docs/references/IMS_API_CALLS.md` 에 둔다.

## 현재 구현 전략
- 프론트는 외부 partner/IMS를 직접 호출하지 않는다.
- 프론트는 내부 API만 호출한다.
- 검색과 상세는 우리 서버의 검증/계산 기준으로 동작한다.
- 상세는 검색 결과에서 발급된 `detailToken` 검증 통과 시에만 열린다.
- 향후 결제/IMS 예약 생성 단계로 확장 가능하게 설계한다.
