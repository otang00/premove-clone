import { company } from './mock'

export const landingNotice = {
  serviceNotice: '서울/수도권 전지역 배차/반차 가능합니다. 전화상담 01024167114 카카오톡ID 00RENTCAR',
  phone: '010-2416-7114',
  kakaoId: '00RENTCAR',
  hours: '09:00 - 18:00',
}

export const landingHeaderMenu = [
  { label: '단기렌트', to: '#landing-reservation' },
  { label: '장기렌트', to: '#landing-contact' },
  { label: '예약내역', to: '/reservations' },
  { label: '회원', to: '/reservations' },
  { label: '장바구니', to: '/cars' },
]

export const landingHero = {
  slides: [
    {
      pcSrc: 'https://file.cafe24cos.com/banner-admin-live/upload/rentcar00/7217f1ea-19e4-43a6-eab4-88d35dafb734.png',
      mobileSrc: 'https://file.cafe24cos.com/banner-admin-live/upload/rentcar00/2f004089-ee51-423b-a7d7-3b033aa89e1f.png',
      alt: '빵빵카 메인 배너 1',
    },
    {
      pcSrc: 'https://file.cafe24cos.com/banner-admin-live/upload/rentcar00/231fadb3-48f7-4a5f-a5b4-bdef938540b6.png',
      mobileSrc: 'https://file.cafe24cos.com/banner-admin-live/upload/rentcar00/6075463c-6c5f-4506-d0a9-05745986dc36.png',
      alt: '빵빵카 메인 배너 2',
    },
    {
      pcSrc: 'https://file.cafe24cos.com/banner-admin-live/upload/rentcar00/6fa790ff-9602-4721-a6f8-d3402de8daf4.png',
      mobileSrc: 'https://file.cafe24cos.com/banner-admin-live/upload/rentcar00/75c16682-d12a-48b4-89c1-e6d37ce189f2.png',
      alt: '빵빵카 메인 배너 3',
    },
  ],
}

export const landingContactItems = [
  {
    label: '전화상담',
    value: landingNotice.phone,
    note: '평일 운영시간 내 빠른 상담 가능',
  },
  {
    label: '카카오톡',
    value: landingNotice.kakaoId,
    note: '채널 또는 ID로 간편 문의 가능',
  },
  {
    label: '방문 주소',
    value: company.address,
    note: '서울 서초구 반포권역 방문 수령 가능',
  },
  {
    label: '운영시간',
    value: landingNotice.hours,
    note: '점심 12:00 - 13:00 / 주말·공휴일 휴무',
  },
]
