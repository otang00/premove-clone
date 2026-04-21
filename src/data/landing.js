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
      pcSrc: '/assets/hero/hero-1-pc.png',
      mobileSrc: '/assets/hero/hero-1-mobile.png',
      alt: '빵빵카 메인 배너 1',
    },
    {
      pcSrc: '/assets/hero/hero-2-pc.png',
      mobileSrc: '/assets/hero/hero-2-mobile.png',
      alt: '빵빵카 메인 배너 2',
    },
    {
      pcSrc: '/assets/hero/hero-3-pc.png',
      mobileSrc: '/assets/hero/hero-3-mobile.png',
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
