# docs

문서는 아래 구조로 잠근다.

## 1. present
지금 당장 실행 기준으로 삼는 문서는 **최대 1개만 유지**한다.

현재 active present:
- `present/EXECUTION_MASTER_PRESENT.md`

원칙:
- 새 phase를 열 때도 active present 문서는 1개만 유지한다.
- phase 종료 또는 기준 전환 시 active present 문서는 `past/` 로 내린다.
- 루트에 phase/current 문서를 다시 흩뿌리지 않는다.

## 2. past
현재 기준에서 내려온 문서와 과거 실행 기록.

주요 구역:
- `past/doc-lock-2026-04-17/`: 이전 root current, present, agent 문서 일괄 보관본
- `past/present-history/`: 이전 present 스냅샷
- `past/ims-sync/`: IMS sync 설계 및 phase 기록

정리 원칙:
- root에 있던 과거 current 문서는 다시 root로 올리지 않는다.
- active가 아닌 agent 문서는 `past/` 에만 둔다.

## 3. archive
현재 기준에서 직접 쓰지 않는 오래된 설계/메모.

- `archive/spec-history/`
- `archive/working-notes/`
- `archive/legacy-ui-prototype/`

## 4. references
현재/과거와 별개로 계속 참고하는 외부 레퍼런스.

- `references/IMS_API_CALLS.md`

## 5. agents / phase-specs
현재는 active agent 문서와 active phase-spec 문서 없음.
필요 시 phase 안에서 다시 만들되, phase 종료 후 `past/` 또는 `archive/` 로 내린다.

## 운영 원칙
- 문서 기준은 항상 `present/EXECUTION_MASTER_PRESENT.md` 부터 본다.
- active current 문서는 present 1개만 유지한다.
- root current 문서는 남기지 않는다.
- 검증이 끝난 작업 문서는 바로 `past/` 로 내린다.
- 참고 문서만 `references/` 에 남긴다.
