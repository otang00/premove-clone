# docs

문서는 아래 구조로 잠근다.

## 1. present
지금 당장 실행 기준으로 삼는 문서는 active current 1개만 유지한다.

현재 active present:
- `present/RENTCAR00_CURRENT.md`

원칙:
- present 에는 실제 실행 기준으로 쓰는 current 1개만 둔다.
- 임시 체크리스트, 중간 정리본, 작업용 current 는 남기지 않는다.
- 기준이 바뀌면 기존 current 에 덧대는 대신 현재 문서를 갱신하고, 이전 버전은 `past/` 로 내린다.

## 2. past
현재 기준에서 내려온 문서와 과거 실행 기록.

정리 원칙:
- active 가 아닌 문서는 `past/` 또는 `archive/` 에만 둔다.
- active 기준과 헷갈리는 문서는 present 에 남기지 않는다.

## 3. archive
현재 기준에서 직접 쓰지 않는 오래된 설계/메모.

## 4. references
현재/과거와 별개로 계속 참고하는 외부 레퍼런스.

## 운영 원칙
- 외부 SDK, 지도, 주소검색, 인증 위젯 변경은 기능 코드보다 먼저 `present/RENTCAR00_CURRENT.md` 와 `vercel.json` CSP를 같이 확인한다.
- Kakao 계열은 1차 로더 도메인만 보고 끝내지 않는다. 실제 하위 로딩 도메인까지 확인한 뒤 `script-src`, `connect-src`, `frame-src` 를 각각 점검한다.
- Kakao 우편번호는 popup 기준이라도 내부 iframe 로딩 여부까지 확인한다.
- 예약/회원/보안/API/운영 기준은 모두 `present/RENTCAR00_CURRENT.md` 를 먼저 본다.
- 완료된 실행 기록은 `past/present-history/` 에 보관한다.
- active 기준이 아닌 체크리스트는 남기지 않는다.
- 구기준 문서는 과감하게 active 영역에서 제거한다.
