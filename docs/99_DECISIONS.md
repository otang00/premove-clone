# 99. DECISIONS

## 목적
이 문서는 `premove-clone`의 핵심 구조 결정을 누적 기록한다.

---

## 2026-04-03 / 2026-04-04

### 1. 차량 조회는 partner 프록시 방식으로 시작한다
- 프론트에서 IMS/partner를 직접 호출하지 않는다.
- 우리 서버가 `partner.premove.co.kr` 검색 결과를 받아 파싱/가공한다.
- 이유: 구현 속도, 보안, 프론트 단순화.

### 2. 메인 페이지는 랜딩이 아니라 검색 시작점이다
- `/` 는 검색 조건 입력 + 차량 목록 진입의 출발점으로 본다.
- 이유: 실제 partner 구조도 query 기반 검색 상태가 중심이다.

### 3. 상세 페이지는 차량 소개가 아니라 예약 준비 화면이다
- 차량 요약 + 입력 폼 + 약관 + 결제 직전 검증까지 포함한다.
- 이유: 실제 서비스 흐름과 가장 가깝다.

### 4. query / DTO / id 명칭은 통일한다
- `deliveryDateTime`, `returnDateTime`, `pickupOption`, `driverAge`, `order`, `dongId`, `deliveryAddress`
- `carId`, `companyId`, `reservationId`
- 이유: 이후 partner 파싱 / 예약 / 결제 단계에서 구조 흔들림 방지.

### 5. 딜리버리 비용은 현재 관측 기준 roundTrip 값으로 총액에 반영된다
- 예: 개포동 선택 시 `delivery.roundTrip = 40,000원`, 총액에 동일 금액 반영.
- 이유: 실제 사이트 크롤링 결과와 일치.
