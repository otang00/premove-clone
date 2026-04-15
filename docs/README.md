# docs

문서는 아래 4구역으로 본다.

## 1. present
지금 당장 실행 기준으로 삼는 문서는 **1개만 유지**한다.

현재 기준 문서:
1. `present/EXECUTION_MASTER_PRESENT.md`
2. `00_FINAL_GOAL.md`
3. `04_PARTNER_SITE_REFERENCE.md`
4. `06_EXTERNAL_PREVIEW_DEPLOY_RUNBOOK.md`
5. `references/IMS_API_CALLS.md`

원칙:
- 실행 기준 변경은 `present/EXECUTION_MASTER_PRESENT.md` 에만 반영한다.
- 분산된 current-state / roadmap / validation 문서 체계는 더 이상 늘리지 않는다.

## 2. agents
에이전트 병렬 작업용 지시문서.

- `agents/search-db-wiring/README.md`
- `agents/search-db-wiring/LAUNCH_PLAN.md`
- `agents/search-db-wiring/AGENT_A_CONTRACT_DTO_AUDIT.md`
- `agents/search-db-wiring/AGENT_B_DB_READ_MODEL_SPEC.md`
- `agents/search-db-wiring/AGENT_C_SHADOW_MODE_SPEC.md`
- `agents/search-db-wiring/AGENT_D_INTEGRATION_RULES_AUDIT.md`

## 3. past
검토 완료, phase 잠금, 이전 실행 기록 문서.

- `past/present-history/`: 이전 current/present 문서 스냅샷
- `past/ims-sync/`: IMS sync 설계/phase/history
- `archive/spec-history/`: 더 오래된 단계별 설계/실행 기록
- `archive/working-notes/`: 과거 작업 지시/빌드 규칙
- `archive/legacy-ui-prototype/`: 더 오래된 UI 프로토타입 문서

## 4. references
현재/과거와 별개로 계속 참고하는 외부 레퍼런스.

- `references/IMS_API_CALLS.md`

## 원칙
- 현재 실행 판단은 먼저 `present/EXECUTION_MASTER_PRESENT.md` 를 본다.
- 병렬 작업 준비가 필요하면 `agents/*` 지시문서를 만든다.
- phase가 끝난 문서는 `past/*` 로 내린다.
- 큰 기준 전환 시 기존 present 문서는 날짜 기준으로 `past/present-history/` 로 이동한다.
