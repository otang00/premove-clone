# RENTCAR00 next goals

## active
- PRICING_HUB 실적용 전환
  - 상태: 현재 최우선 active 작업
  - 목표: IMS 완전 호환을 우선으로 두고, 24h 기준금액 + 기간 percent 정책 + 실적용 금액 preview 중심의 운영 요금체계를 잠금
  - 잠긴 원칙:
    1. IMS 반영이 최우선
    2. 찜카는 같은 기준값에서 파생 반영
    3. 안 맞는 찜카 옵션은 0원 처리 가능
    4. 직접 수정 가능한 절대금액은 24h 기준값만
    5. 기간 정책은 percent 조정만 허용
    6. 시간별/장기 금액은 수식 계산
    7. UI는 실제 적용 금액 즉시 확인 중심
  - 다음 액션:
    1. PRICING_HUB UI 단순화
    2. legacy 기준값 자동 주입 연결
    3. 기간 percent 기반 preview 계산 규칙 잠금
    4. IMS 반영 포맷 정리
    5. 찜카 0원 처리 규칙 정리
  - 현재 계산 규칙:
    - 24h 직접 수정
    - 기간 % 조정
    - 1h/일수별은 legacy 비율 유지
    - 6h fallback 0.55
    - 12h fallback 0.80
  - 현재 기준 문서:
    - `docs/present/2026-04-29_RENTCAR00_PRICING_HUB_CURRENT.md`
    - `docs/present/2026-04-29_RENTCAR00_PRICING_HUB_EXECUTION_CURRENT.md`
    - `docs/present/2026-04-29_RENTCAR00_PRICING_HUB_UI_RULES_CURRENT.md`
    - `docs/present/2026-04-29_RENTCAR00_PRICING_HUB_CALC_RULES_CURRENT.md`

- 토스페이먼츠 결제시스템 도입
  - 상태: 신청 진행 중
  - 다음 액션: 승인 완료 후 결제 상태/웹훅 설계 잠금

- 카카오 쉬운연결
  - 상태: 다음 단기 작업 후보
  - 다음 액션: 기존 회원 귀속 정책과 병합 기준 먼저 정리

## note
- 기존 범용 PRICING_HUB 초안 문서는 `docs/past/present-history/` 로 이동했다.
- 예약 연동/찜카 disable_time 구현 문서는 완료되어 `docs/past/present-history/` 에 있다.
- 제품 운영 상태 기준은 active present 문서를 우선한다.
