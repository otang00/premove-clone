# docs

문서는 아래 3구역으로 본다.

## 1. present
지금 당장 기준으로 삼는 문서.

우선순위:
1. `present/CURRENT_STATE_PRESENT.md`
2. `00_FINAL_GOAL.md`
3. `present/IMS_SYNC_PRESENT.md`
4. `present/COMMIT_PLAN_PRESENT.md`
5. `present/DECISIONS_PRESENT.md`
6. `04_PARTNER_SITE_REFERENCE.md`
7. `05_DETAIL_DB_INTEGRATION_PHASE1.md`
8. `06_EXTERNAL_PREVIEW_DEPLOY_RUNBOOK.md`
9. `references/IMS_API_CALLS.md`

## 2. past
검토 완료, phase 잠금, 이전 실행 기록 문서.

- `past/ims-sync/`: IMS sync 설계/phase/history
- `archive/spec-history/`: 더 오래된 단계별 설계/실행 기록
- `archive/working-notes/`: 과거 작업 지시/빌드 규칙
- `archive/legacy-ui-prototype/`: 더 오래된 UI 프로토타입 문서

## 3. references
현재/과거와 별개로 계속 참고하는 외부 레퍼런스.

- `references/IMS_API_CALLS.md`

## 원칙
- 현재 기준이 바뀌면 `present/*` 를 먼저 갱신한다.
- phase가 끝난 문서는 `past/*` 로 내린다.
- 현재 판단 근거는 `present/DECISIONS_PRESENT.md` 에 누적한다.
