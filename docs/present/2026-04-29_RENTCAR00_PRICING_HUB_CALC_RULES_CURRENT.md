# RENTCAR00 PRICING_HUB calculation rules current

Last updated: 2026-04-29

이 문서는 PRICING_HUB의 active 계산 규칙을 잠근다.

---

## 1. 입력 원칙

1. 관리자가 직접 수정하는 절대금액은 `24h` 기준값만 허용한다.
2. 기간 정책은 `percent adjustment` 만 허용한다.
3. 나머지 시간별/일수별 금액은 수식으로 계산한다.

---

## 2. 계산 순서

### Step 1. 기준 24h 확정
- `base_24h = 관리자 입력 24h`

### Step 2. 기간 조정 반영
- `applied_24h = round(base_24h * (1 + percent / 100))`

### Step 3. 시간요금 계산
- `1h`
  - 원칙: 기존 legacy 비율 유지
  - 수식: `legacy_hour_1_price / legacy_base_24h * applied_24h`
  - fallback: legacy 값이 없으면 `applied_24h * 0.04`

- `6h`
  - 원칙: legacy 값이 있으면 비율 유지
  - fallback: `applied_24h * 0.55`

- `12h`
  - 원칙: legacy 값이 있으면 비율 유지
  - fallback: `applied_24h * 0.80`

### Step 4. 일수별 금액 계산
아래는 모두 기존 legacy 비율 유지가 원칙이다.

- 평일 1~2일
- 평일 3~4일
- 평일 5~6일
- 평일 7일+
- 주말 1~2일
- 주말 3~4일
- 주말 5~6일
- 주말 7일+

수식:
- `legacy_bucket_price / legacy_base_24h * applied_24h`

---

## 3. 반올림 규칙

- 1차 active 기준은 `원단위 반올림`으로 통일한다.
- 추후 필요하면 100원 단위 반올림으로 별도 잠근다.

---

## 4. 채널 반영 원칙

### IMS
- 허브 계산 결과가 IMS 반영 기준이 된다.
- 즉 IMS 호환성이 최우선이다.

### 찜카
- 같은 계산 결과를 찜카 포맷으로 파생 반영한다.
- 대응되지 않는 옵션은 0원 처리 가능하다.

---

## 5. 한 줄 결론

- **24h만 직접 수정**
- **기간은 %만**
- **1h/일수별은 legacy 비율 유지**
- **6h/12h는 legacy 우선, 없으면 0.55 / 0.80 fallback**
