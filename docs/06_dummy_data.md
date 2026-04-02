# 06. 더미 데이터 설계

## 업체 더미
- 업체명
- 로고 URL
- 주소
- 대표번호
- 안내사항

## 검색 조건 더미
- pickupOption: pickup | delivery
- deliveryDateTime
- returnDateTime
- driverAge: 21 | 26
- order: lower | higher | newest

## 차량 목록 더미 스키마
- id
- name
- yearLabel
- ageLabel
- fuelType
- seats
- dayPrice
- totalPrice
- features[]
- imageUrl

## 상세 더미 스키마
- carId
- summary
- insurance
- rentalMethods
- storeInfo
- paymentMethods
- terms
- priceSummary

## 데이터 원칙
- 실제 사이트에서 보인 필드명과 의미를 최대한 유지
- 이후 2단계에서 API/DB로 교체 가능하도록 키 구조를 단순하게 설계
