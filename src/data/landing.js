import { company } from './mock'

export const kakaoSdkConfig = {
  javascriptKey: 'b912305361ab3ad47fd00c2714bf324e',
  channelPublicId: '_SZcVn',
  mapAddress: '서울 서초구 신반포로23길 78-9',
}

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
    actionType: 'phone',
  },
  {
    label: '카카오톡',
    value: landingNotice.kakaoId,
    note: '카카오톡 1:1 채팅 연결',
    actionType: 'kakao',
    href: 'https://pf.kakao.com/_SZcVn/chat',
    channelPublicId: kakaoSdkConfig.channelPublicId,
  },
  {
    label: '방문 주소',
    value: company.address,
    note: '모달에서 지도 보기',
    actionType: 'map',
    href: 'https://kko.to/nsu8bdQELb',
    mapAddress: kakaoSdkConfig.mapAddress,
    mapCoords: {
      x: 501239,
      y: 1114525,
    },
  },
  {
    label: '운영시간',
    value: landingNotice.hours,
    note: '상세 운영 기준 보기',
    actionType: 'hours',
    detailLines: ['평일 09:00 - 18:00', '점심시간 12:00 - 13:00', '주말 및 공휴일 휴무', '운영시간 외 문의는 다음 영업일에 순차 응대'],
  },
]
