# RENTCAR00 PRICING_HUB execution current

Last updated: 2026-04-29

이 문서는 지금부터 실제로 적용할 PRICING_HUB 실행 순서를 잠근다.
현재 초점은 **UI를 먼저 단순화하고, 그 UI가 요구하는 계산/DB/API만 뒤에서 맞추는 것**이다.

---

## 1. 목적

- 관리자 화면을 **24h 기준금액 + 기간 percent 정책 + 실적용 preview** 중심으로 재구성한다.
- IMS 완전 호환을 기준으로 내부 데이터 구조를 다시 좁힌다.
- 찜카 반영은 같은 계산 결과를 채널 규칙에 맞춰 파생시키는 방식으로 정리한다.

---

## 2. 기준점

현재 이미 존재하는 것:
- `/admin/pricing-hub` 페이지 진입
- `api/admin/pricing-hub.js`
- `pricing_hub_*` 신규 테이블
- 관리자 버튼 연결
- migration 적용 완료

현재 active에서 바로 손봐야 할 것:
- 기존 정책 JSON 카드 제거
- legacy 기준값 폼 자동 주입
- 기간 정책을 percent 전용으로 단순화
- 24h 이외 직접 편집 입력 축소
- 실제 적용 금액 preview 강화

---

## 3. phase

### Phase 1 — 문서/원칙 잠금
목적:
- 범용 허브 초안을 내리고, 실적용 원칙으로 문서를 재잠금

종료 조건:
- present 문서는 현재 실행 기준만 남음
- 과거 초안은 past 로 이동

### Phase 2 — UI 단순화
목적:
- 관리자 화면을 24h 기준금액 + 기간 percent 중심으로 줄임

수정 대상:
- `src/pages/AdminPricingHubPage.jsx`
- `src/services/adminPricingHubApi.js`

세부 작업:
1. 기존 정책 JSON 카드 제거
2. legacy 기준값 폼 자동 주입
3. 기간 폼을 percent 전용으로 단순화
4. 직접 수정 가능한 금액 입력을 24h 중심으로 축소
5. 실제 적용 금액 preview 패널 추가

종료 조건:
- 관리자가 복잡한 내부 구조 없이 입력 가능
- 적용 예상 금액을 즉시 확인 가능

### Phase 3 — 계산 계약 잠금
목적:
- 24h 기준값에서 시간별/기간별 금액을 어떻게 계산할지 고정

수정 대상:
- 문서 우선
- 필요 시 `server/pricing-hub/*` 또는 `api/admin/pricing-hub.js`

잠긴 active 규칙:
- 24h 직접 수정
- 기간은 %만
- 1h/일수별 금액은 legacy 비율 유지
- 6h fallback = 24h × 0.55
- 12h fallback = 24h × 0.80

종료 조건:
- 1h / 6h / 12h / 장기요금 계산 규칙 문서화
- preview 결과와 계산 계약 일치

### Phase 4 — DB/API 축소 정렬
목적:
- 현재 범용적으로 열린 구조를 active 규칙에 맞게 좁힘

검토 대상:
- `pricing_hub_periods`
- `pricing_hub_rates`
- `pricing_hub_overrides`
- `pricing_hub_previews`
- `pricing_hub_preview_items`

핵심 판단:
- active 에서 필요한 필드만 실제 사용
- 나머지 필드는 후순위 또는 숨김 처리
- 필요 시 additive migration 으로 보강

종료 조건:
- UI 입력과 DB/API 구조가 같은 방향을 봄
- IMS 호환 관점에서 누락 필드가 식별됨

### Phase 5 — IMS 반영 계약
목적:
- 허브 저장값이 IMS에 그대로 들어갈 수 있는 반영 포맷 정리

종료 조건:
- IMS payload 기준 정리
- 기간 percent 가 IMS 정책에 어떻게 풀리는지 문서화
- 반영/검증 절차 초안 확보

### Phase 6 — 찜카 파생 반영 계약
목적:
- 같은 결과값을 찜카용으로 변환하는 규칙 정리

종료 조건:
- 찜카 항목별 0원 처리 규칙 정리
- 필수 매핑키 정리
- preview 에서 찜카 예상 반영값 확인 가능

---

## 4. 리스크

1. IMS 계산 규칙을 정확히 모르면 24h 기반 수식이 어긋날 수 있다.
2. 현재 DB는 범용 허브 초안 흔적이 있어, UI보다 DB가 넓게 열려 있다.
3. 찜카는 옵션이 많아 0원 처리 기준을 빨리 잠그지 않으면 preview 신뢰도가 떨어질 수 있다.
4. 너무 빨리 스키마를 다시 고치면 이전 실험 구조와 충돌할 수 있다.

---

## 5. 검증

- UI 빌드 통과
- 관리자 진입 확인
- 그룹 선택 시 legacy 값 자동 주입 확인
- 기간 percent 입력 시 preview 금액 변동 확인
- IMS / 찜카 예상 출력 행 검토

---

## 6. 한 줄 실행 순서

**문서 잠금 → UI 단순화 → 계산 계약 잠금 → DB/API 정렬 → IMS 반영 계약 → 찜카 파생 계약**
