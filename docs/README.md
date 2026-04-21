# docs

문서는 아래 구조로 잠근다.

## 1. present
지금 당장 실행 기준으로 삼는 문서는 기본적으로 **주 current 1개 + 필요 시 작업 current 1개**까지만 유지한다.

현재 active present:
- 주 current: `present/RENTCAR00_DB_EXECUTION_CURRENT.md`
- 작업 current: `present/RENAME_EXECUTION_CURRENT.md`

원칙:
- 주 current 는 제품/구조 기준 문서 1개만 유지한다.
- 대규모 rename, migration, cutover 같은 한시적 작업은 작업 current 1개를 추가로 둘 수 있다.
- 작업 current 는 해당 phase 종료 시 `past/` 로 내린다.
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
- 문서 기준은 항상 `present/RENTCAR00_DB_EXECUTION_CURRENT.md` 부터 본다.
- rename 같은 현재 작업이 열려 있으면 `present/RENAME_EXECUTION_CURRENT.md` 를 다음 기준으로 본다.
- present 에는 주 current 1개와 작업 current 1개까지만 유지한다.
- root current 문서는 남기지 않는다.
- 검증이 끝난 작업 current 문서는 바로 `past/` 로 내린다.
- 참고 문서만 `references/` 에 남긴다.
