# RENTCAR00 next goals

## active
- KCP 결제창 PC/모바일 분기 구현
  - 상태: 현재 최우선 active 작업
  - 목표: PC는 KCP 표준웹, 모바일/태블릿은 KCP 모바일 결제창으로 분기하고 승인 후 예약확정 서버 흐름은 공통 유지
  - 잠긴 원칙:
    1. 결제 전 검증/세션토큰/금액검증/예약생성 규칙은 공통 유지
    2. 분기 대상은 결제창 진입 방식과 필수 파라미터 세트
    3. 1차 결제수단은 카드만 유지
    4. 한글 인코딩/이메일 alias 비노출 보정 유지
    5. KCP hosted UI 커스터마이즈는 이번 범위 제외
  - 다음 액션:
    1. `/api/payments/prepare` 채널별 payload 분기
    2. 프런트 기기 판별 및 PC/모바일 결제 진입 분기
    3. `/api/payments/return` 공통 승인 흐름 검증
    4. PC/모바일 smoke test 및 운영 재배포
  - 현재 기준 문서:
    - `docs/present/2026-05-12_RENTCAR00_KCP_PC_MOBILE_SPLIT_CURRENT.md`
    - `docs/present/2026-05-11_RENTCAR00_PAYMENT_REBUILD_CURRENT.md`
    - `docs/present/2026-05-11_RENTCAR00_PAYMENT_REBUILD_EXECUTION_CURRENT.md`

- 토스페이먼츠 결제시스템 도입
  - 상태: 후속 검토 후보
  - 다음 액션: KCP 승인흐름 안정화 후 UX/계약/정산 재검토

- 카카오 쉬운연결
  - 상태: 다음 단기 작업 후보
  - 다음 액션: 기존 회원 귀속 정책과 병합 기준 먼저 정리

## note
- KCP phase1 기준 문서는 `docs/past/present-history/2026-05-11_RENTCAR00_KCP_PHASE1_CURRENT_PAST.md` 로 이동했다.
- Pricing Hub grade multiplier 초안은 `docs/past/present-history/2026-05-06_RENTCAR00_PRICING_HUB_GRADE_MULTIPLIER_PLAN_CURRENT_PAST.md` 로 이동했다.
- 제품 운영 상태 기준은 active present 문서를 우선한다.
