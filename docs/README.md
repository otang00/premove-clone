# docs

문서는 아래 구조로 잠근다.

## 1. present
지금 당장 실행 기준으로 삼는 문서는 active current 로 유지한다.

현재 active present:
- `present/RENTCAR00_RESERVATION_CURRENT.md`
- `present/LOGIN_SYSTEM_CURRENT.md`
- `present/RENTCAR00_ADMIN_FOLLOWUPS_CURRENT.md`
- `present/RENTCAR00_SECURITY_CURRENT.md`
- `present/RENTCAR00_SECURITY_EXECUTION_CURRENT.md`

원칙:
- present 에는 실제 실행 기준으로 쓰는 current 만 둔다.
- 임시 체크리스트, 중간 정리본, 작업용 current 는 남기지 않는다.
- 기준이 바뀌면 기존 current 를 덧대지 말고 역할별 current 로 다시 잠근다.

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
- 예약/결제/주소 기준은 `present/RENTCAR00_RESERVATION_CURRENT.md` 부터 본다.
- 로그인/회원 기준은 `present/LOGIN_SYSTEM_CURRENT.md` 를 함께 본다.
- 관리자 후속 개선은 `present/RENTCAR00_ADMIN_FOLLOWUPS_CURRENT.md` 를 본다.
- 보안 현행 기준은 `present/RENTCAR00_SECURITY_CURRENT.md` 를 본다.
- 보안 실제 실행은 `present/RENTCAR00_SECURITY_EXECUTION_CURRENT.md` 를 본다.
- active 기준이 아닌 체크리스트는 남기지 않는다.
- 구기준 문서는 과감하게 active 영역에서 제거한다.
