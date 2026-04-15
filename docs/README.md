# docs

문서는 아래 4구역으로 본다.

## 1. present
지금 당장 기준으로 삼는 문서.

우선순위:
1. `present/CURRENT_STATE_PRESENT.md`
2. `present/ROADMAP_PRESENT.md`
3. `present/VALIDATION_PRESENT.md`
4. `present/PARALLEL_WORKSTREAMS_PRESENT.md`
5. `present/IMPLEMENTATION_RULES_PRESENT.md`
6. `present/DECISIONS_PRESENT.md`
7. `00_FINAL_GOAL.md`
8. `04_PARTNER_SITE_REFERENCE.md`
9. `05_DETAIL_DB_INTEGRATION_PHASE1.md`
10. `06_EXTERNAL_PREVIEW_DEPLOY_RUNBOOK.md`
11. `references/IMS_API_CALLS.md`

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

- `past/present-history/`: 이전 현행 문서 스냅샷
- `past/ims-sync/`: IMS sync 설계/phase/history
- `archive/spec-history/`: 더 오래된 단계별 설계/실행 기록
- `archive/working-notes/`: 과거 작업 지시/빌드 규칙
- `archive/legacy-ui-prototype/`: 더 오래된 UI 프로토타입 문서

## 4. references
현재/과거와 별개로 계속 참고하는 외부 레퍼런스.

- `references/IMS_API_CALLS.md`

## 원칙
- 현재 기준이 바뀌면 `present/*` 를 먼저 갱신한다.
- 병렬 작업 준비가 필요하면 `agents/*` 지시문서를 먼저 만든다.
- phase가 끝난 문서는 `past/*` 로 내린다.
- 현재 판단 근거는 `present/DECISIONS_PRESENT.md` 에 누적한다.
- 큰 기준 전환 시 기존 `present/*` 는 날짜 기준으로 `past/present-history/` 로 내린다.
