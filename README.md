# premove-clone

`premove-clone`은 partner.premove.co.kr 기반 차량 조회 결과를
우리 서버가 파싱/가공하고,
그 결과를 메인 → 목록 → 차량 예약 페이지 흐름으로 재구성하는 예약 서비스 프로젝트다.

## 현재 기준 문서
문서는 아래 순서로 본다.

1. `docs/00_FINAL_GOAL.md`
2. `docs/01_MAIN_PROMPT.md`
3. `docs/02_BUILD_FLOW.md`
4. `docs/03_CONVENTIONS.md`
5. `docs/04_PARTNER_SITE_REFERENCE.md`
6. `docs/phase-specs/*`
7. `docs/references/*`

## 문서 정책
- 현재 살아있는 기준 문서는 `docs/` 루트와 `docs/phase-specs/` 아래 문서다.
- 과거 외형 프로토타입 문서는 `docs/archive/legacy-ui-prototype/` 로 이동했다.
- IMS 관련 참고 자료는 `docs/references/IMS_API_CALLS.md` 에 둔다.

## 현재 구현 전략
- 프론트는 외부 partner/IMS를 직접 호출하지 않는다.
- 우리 서버가 partner 검색 결과를 받아 파싱한다.
- 프론트는 내부 API만 호출한다.
- 향후 결제/IMS 예약 생성 단계로 확장 가능하게 설계한다.
