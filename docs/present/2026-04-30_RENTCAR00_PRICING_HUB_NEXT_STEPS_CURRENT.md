# RENTCAR00 PRICING_HUB next steps current

Last updated: 2026-04-30

이 문서는 다음 세션에서 PRICING_HUB 작업을 바로 이어가기 위한 active 체크리스트다.
현재 기준점은 production 반영된 단일 편집 폼 baseline 이다.

---

## 1. 현재 기준점

배포 완료 baseline:
- `2db8728` `feat: simplify pricing hub editor flow`
- `88edd57` `refactor: tighten pricing hub controls`

현재 production 기준 UI:
- 단일 폼
- 편집 인자 3개
  - 기준 24시간 금액
  - 주중 %
  - 주말 %
- `수정` 버튼 저장 연결 완료
- 선택 그룹 차량번호 표시 완료

---

## 2. 다음 우선순위

### Priority 1. 계산 검수
목표:
- 저장 후 실제 값이 운영 기대값과 맞는지 확인

확인 항목:
- 기준24 변경 시 `common.fee_24h` 저장값
- 주중% 변경 시 `weekday.fee_24h` 저장값
- 주말% 변경 시 `weekend.fee_24h` 저장값
- 1h / 6h / 12h 계산값
- week_1 / week_2 / month_1 / long 계산값

종료 조건:
- 계산 결과가 사장님 기대값과 맞는지 최소 1~2개 그룹으로 검수 완료

### Priority 2. 계산식 미세조정
목표:
- legacy 비율/fallback 이 실제 운영값과 안 맞는 부분 있으면 수정

후보:
- `week1Price`, `week2Price` fallback 비율
- `month1Price = 24배` 규칙
- `long1hPrice = 0.1배` fallback
- 반올림 단위 원단위 vs 100원 단위

종료 조건:
- active 계산 규칙 문서와 코드가 일치

### Priority 3. 저장 후 피드백 UX
목표:
- 저장 후 성공/실패/재조회 UX를 더 명확히 정리

후보:
- 저장 성공 시 강조 메시지 톤 조정
- 변경값 diff 간단 표시 여부
- 저장 중 버튼 상태 개선

종료 조건:
- 실사용 시 혼동 없는 수준 확보

### Priority 4. IMS 반영 계약 문서화
목표:
- 허브 저장값을 IMS에 어떻게 풀어 넣을지 문서 확정

종료 조건:
- IMS payload 기준 문서 1개 추가

---

## 3. 다음 시작 추천 순서

1. 실제 그룹 1개 선택
2. 기준24 / 주중% / 주말% 몇 개 바꿔 저장
3. DB row 확인
4. 기대값과 차이 나는 계산식만 좁혀 수정
5. 그 다음 IMS 반영 문서화

---

## 4. 한 줄 결론

**다음 작업은 새 UI를 더 만드는 단계가 아니라, 지금 저장되는 계산값이 운영 기대값과 정확히 맞는지 검수하고 계산식을 잠그는 단계다.**
