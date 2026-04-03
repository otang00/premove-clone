# IMS API 호출 문서

## 목적
프리무브 클론에서 IMS 연동 시 현재 확인된 인증 방식, API 엔드포인트, 호출 흐름을 정리한다.

이 문서는 `projects/telegram-parser-bot` 와 `tools/playwright/scripts` 에 있는 실제 동작 코드를 기준으로 작성했다.

---

## 결론
IMS는 현재 확인 기준으로 **직접 로그인 API를 먼저 때리는 구조가 아니라**,

1. `https://imsform.com/` 웹 로그인
2. 로그인된 브라우저 세션에서 내부 API 호출 발생
3. 그 요청의 `Authorization` 헤더 캡처
4. 캡처한 헤더로 `https://api.rencar.co.kr/...` API 호출

이 흐름으로 접근하는 것이 가장 확실하다.

즉, 사장님 말씀대로 **브라우저 로그인 인증을 가지고 API를 부르는 방식**이 맞다.

---

## 확인된 소스 위치

### 기준 문서
- `projects/telegram-parser-bot/docs/telegram-parser-bot-current-state.md`
- `projects/telegram-parser-bot/README.md`

### 실제 동작 코드
- `projects/telegram-parser-bot/src/index.js`
- `tools/playwright/scripts/ims-reservations-export.js`
- `tools/playwright/scripts/ims-reservation-cancel.js`
- `tools/playwright/scripts/ims-reservation-draft.js`

---

## 인증 방식

### 확인된 로그인 페이지
- `https://imsform.com/`

### 로그인 입력 셀렉터
- 아이디: `input[placeholder="아이디"]`
- 비밀번호: `input[placeholder="비밀번호"]`
- 로그인 버튼: `button:has-text("로그인")`

### 사용 환경변수
- `IMS_ID`
- `IMS_PW`

### 중요한 점
현재 코드에서 **API용 별도 로그인 엔드포인트는 확인되지 않았다.**
대신 브라우저 로그인 후, 화면이 호출하는 API 요청에서 아래 Authorization 헤더를 잡아 사용한다.

```js
page.on('request', (req) => {
  if (!auth && req.url().includes('/v2/company-car-schedules/reservations')) {
    auth = req.headers().authorization || null;
  }
});
```

즉, 서버 사이드에서 IMS API를 직접 쓰려면 다음 중 하나가 필요하다.
- 브라우저 자동화로 로그인 후 헤더 캡처
- 또는 별도 인증 토큰 발급 방식이 추가로 발견되어야 함

현재까지 **검증된 방법은 브라우저 로그인 + Authorization 캡처** 뿐이다.

---

## 확인된 API 베이스
- `https://api.rencar.co.kr`

---

## 1) 예약/스케줄 조회 API

### 확인된 엔드포인트
`GET https://api.rencar.co.kr/v2/company-car-schedules/reservations`

### 인증
헤더에 로그인 후 캡처한 Authorization 필요

```http
Authorization: <captured header>
Accept: application/json, text/plain, */*
```

### 현재 확인된 쿼리 파라미터
`tools/playwright/scripts/ims-reservations-export.js` 기준

- `page`
- `base_date`
- `rental_type`
- `status`
- `option`
- `exclude_returned`
- `date_option`
- `start`
- `end`

### 예시
```txt
GET https://api.rencar.co.kr/v2/company-car-schedules/reservations?page=1&base_date=2026-04-01&rental_type=all&status=all&option=customer_name&exclude_returned=false&date_option=start_at&start=2026-04-01&end=2026-04-30
```

### 코드 예시
```js
const res = await fetch(url, {
  headers: {
    Accept: 'application/json, text/plain, */*',
    Authorization: auth,
  },
});
```

### 응답에서 실제 사용 중인 주요 필드
`ims-reservations-export.js` 의 `flattenSchedule()` 기준

상위 스케줄 필드
- `id`
- `status`
- `self_contract_status`
- `title`
- `start_at`
- `end_at`

차량 필드
- `car.id`
- `car.car_identity` → 차량번호
- `car.car_name`
- `car.car_group_id`
- `car.car_age`
- `car.oil_type`
- `car.use_connect`

상세 필드
- `detail.id`
- `detail.type`
- `detail.rental_type`
- `detail.customer_name`
- `detail.customer_contact`
- `detail.customer_car_number`
- `detail.pickup_address`
- `detail.dropoff_address`
- `detail.delivery_user_name`
- `detail.recommender_name`
- `detail.status`
- `detail.license_verification`

### 프리무브 클론에서의 의미
이 조회 API는 최소한 아래 용도로 바로 쓸 수 있다.
- 기존 예약/스케줄 확인
- 특정 기간 예약 현황 조회
- 예약 데이터 백오피스 동기화

다만 **메인 차량 가용 목록 API와 1:1로 같은지 여부는 아직 확인 필요**다.

---

## 2) 예약 취소 API

### 확인된 엔드포인트
`POST https://api.rencar.co.kr/v2/company-car-schedules/delete`

### 인증
헤더에 로그인 후 캡처한 Authorization 필요

```http
Content-Type: application/json
Accept: application/json, text/plain, */*
Authorization: <captured header>
```

### 요청 바디
```json
{
  "ids": [12345]
}
```

### 현재 코드
```js
const res = await fetch(`${apiBaseUrl}/v2/company-car-schedules/delete`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    Authorization: authHeader,
  },
  body: JSON.stringify({ ids: [scheduleId] }),
});
```

### 성공 판정 기준
현재 코드는 아래를 성공으로 본다.
- HTTP OK
- `data.success === true`
- `failed_deletion_schedule_ids` 가 비어 있음

---

## 3) 예약 생성

### 현재 확인 상태
**직접 API 엔드포인트는 아직 못 찾았다.**

지금 파서봇은 예약 생성을 아래 방식으로 처리한다.
- `ims-reservation-draft.js`
- Playwright로 로그인
- 차량 검색 화면 이동
- 날짜/시간/차량번호 입력
- 결과 리스트에서 차량 선택
- 예약 상세 폼 입력
- 저장 버튼 클릭

즉, 현재 검증된 예약 생성은 **UI 자동화 방식**이다.

### 현재 입력 필드
`ims-reservation-draft.js` 기준

필수
- `rentalAt`
- `returnAt`
- `carNumber`
- `totalFee`
- `customerName`
- `customerPhone`

선택
- `address`
- `useDelivery`
- `memo`
- `dispatchMemo`

### IMS 폼 셀렉터
- 딜리버리 사용: `#delivery_use`
- 배/회차 장소 동일: `text=배/회차 장소 동일`
- 주소: `[data-input="address"]`
- 총 금액: `[data-input="rentFee"]`
- 고객명: `[data-input="customerName"]`
- 고객번호: `[data-input="customerContract"]`
- 메모: `[data-input="booking_memo"]`
- 저장 버튼: `button.Register_submit__wJTwr`

### 현재 파서봇에서 IMS 입력 매핑
`projects/telegram-parser-bot/docs/telegram-parser-bot-current-state.md` 기준

- 대여일 → `rentalAt`
- 반납일 → `returnAt`
- 차량번호 → `carNumber`
- 결제금액 → `totalFee`
- 임차인 → `customerName`
- 고객번호 → `customerPhone`
- 배반차위치 → `address`
- 배반차위치 존재 시 → `useDelivery=true`

메모 규칙
- `예약:{예약번호} | 운전자:{운전자명}/{생년월일} | 보험:{차량보험}`
- 120자 초과 시 절삭

---

## 4) 프리무브 메인 목록 구현에 대한 해석

사장님 요구사항은 다음이다.
- 메인 페이지에서 대여/반납 일정 입력
- 그 기준으로 **비어있는 차량 리스트** 조회
- 차량 클릭 시 예약 페이지 진입
- 결제 후 IMS 예약 반영

현재 확보된 사실은 이렇다.

### 이미 확인된 것
- IMS 내부 API는 `api.rencar.co.kr` 를 쓴다.
- 브라우저 로그인 세션 기반 Authorization 헤더가 필요하다.
- 예약/스케줄 조회 API가 존재한다.
- 삭제 API가 존재한다.
- 생성은 UI 자동화로 검증되어 있다.

### 아직 확인이 필요한 것
- 메인 차량 검색 결과를 직접 주는 API 엔드포인트
- 가용 차량 검색 API의 쿼리 규격
- 예약 생성용 직접 API 존재 여부
- 결제 후 IMS 등록 순서에서 사용할 최종 엔드포인트

즉, **메인 차량 목록을 API로 붙이려면 추가 API 캡처가 필요**하다.

가장 유력한 다음 단계는:
1. Playwright로 `partner.premove.co.kr/35457` 또는 IMS 차량 검색 화면 진입
2. 검색 버튼 클릭 시 발생하는 네트워크 요청 캡처
3. 차량 목록 API URL / method / payload / response 구조 문서화
4. 그 API를 프리무브 클론 서버 쪽에서 프록시 호출

---

## 5) 서버 구현 권장 방식

### 권장 아키텍처
프론트에서 IMS를 직접 치지 말고, 서버 라우트를 둔다.

예시
- `GET /api/ims/available-cars`
- `POST /api/ims/create-reservation`
- `POST /api/ims/cancel-reservation`

### 이유
- Authorization 헤더를 브라우저에 직접 노출하면 안 됨
- IMS 로그인/세션/헤더 갱신 로직을 서버에서 숨길 수 있음
- IMS 구조 변경 시 프론트 수정 범위를 줄일 수 있음

### 서버 내부 방식 초안
1. 서버가 Playwright 또는 세션 캐시로 IMS 로그인
2. Authorization 확보
3. IMS API 호출
4. 프론트에는 필요한 필드만 가공해 전달

---

## 6) 바로 재사용 가능한 코드 포인트

### Authorization 캡처 방식
- 참고: `tools/playwright/scripts/ims-reservations-export.js`
- 참고: `tools/playwright/scripts/ims-reservation-cancel.js`

### 예약 생성 UI 자동화
- 참고: `tools/playwright/scripts/ims-reservation-draft.js`

### 예약 취소 API 호출
- 참고: `tools/playwright/scripts/ims-reservation-cancel.js`

### 파서봇에서 IMS 후속 처리 연결
- 참고: `projects/telegram-parser-bot/src/index.js`

---

## 7) 현재 판단

### 확정
- IMS는 브라우저 로그인 기반 인증을 사용 중이다.
- 로그인 후 내부 API 호출에서 Authorization 헤더를 캡처해 API를 호출할 수 있다.
- 조회 API와 삭제 API는 확인됐다.
- 생성은 아직 직접 API가 아니라 UI 자동화만 검증됐다.

### 미확정
- 차량 가용 목록 API
- 직접 예약 생성 API
- 결제 후 최종 계약 확정 API

---

## 8) 다음 액션 추천

1. **차량 가용 목록 API 캡처 문서 추가 작성**
   - 메인 검색 기준 실제 호출 API 찾기
2. **IMS 세션/Authorization 재사용 전략 설계**
   - 요청마다 로그인할지
   - 세션 캐시를 둘지
3. **프리무브 클론 API 스펙 초안 작성**
   - 프론트가 쓰는 내부 API 우선 정의
4. **결제 이후 예약 생성 순서 확정**
   - 결제 성공 후 IMS 생성
   - IMS 생성 실패 시 보상 처리

---

## 부록: 현재 확인된 환경변수

### parser-bot
- `IMS_ID`
- `IMS_PW`

### Playwright 예약 생성
- `IMS_SAVE=true` 일 때 실제 저장

### Playwright 예약 취소
- `IMS_CANCEL_DELETE=true` 일 때 실제 삭제
