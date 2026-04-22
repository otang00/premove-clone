'use strict'

const { createBookingConfirmToken } = require('../security/bookingConfirmToken')

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatLocalDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(/\. /g, '.').replace(/\.$/, '')
}

function buildOrigin(req) {
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProto || 'https'
  const host = String(req?.headers?.host || '').trim()
  if (!host) {
    throw new Error('missing_request_host')
  }
  return `${protocol}://${host}`
}

function buildBookingConfirmationEmail({ booking, req } = {}) {
  if (!booking?.id || !booking?.publicReservationCode) {
    throw new Error('invalid_booking_for_confirmation_email')
  }

  const origin = buildOrigin(req)
  const { token } = createBookingConfirmToken({
    bookingOrderId: booking.id,
    reservationCode: booking.publicReservationCode,
  })

  const confirmUrl = `${origin}/admin/booking-confirm?token=${encodeURIComponent(token)}`
  const detailUrl = `${confirmUrl}&view=detail`
  const carName = booking.pricingSnapshot?.carName || '-'
  const customerPhone = booking.customerPhone || booking.customerPhoneLast4 || '-'
  const paymentMethod = booking.pricingSnapshot?.paymentMethod || '확인 필요'
  const totalAmount = `${Number(booking.quotedTotalAmount || 0).toLocaleString('ko-KR')}원`

  const subject = `[00렌트카] 예약 확정 대기 ${booking.publicReservationCode}`
  const previewText = '신규 예약이 접수되었습니다. 결제 확인 후 예약을 확정해 주세요.'

  const text = [
    '예약 확정 대기 알림',
    '',
    '신규 예약이 접수되었습니다.',
    `예약번호: ${booking.publicReservationCode}`,
    `고객명: ${booking.customerName || '-'}`,
    `연락처: ${customerPhone}`,
    `생년월일: ${booking.customerBirth || '-'}`,
    `차량명: ${carName}`,
    `대여일시: ${formatLocalDateTime(booking.pickupAt)}`,
    `반납일시: ${formatLocalDateTime(booking.returnAt)}`,
    `배차/수령: ${booking.pickupLocationSnapshot?.pickupOption === 'delivery'
      ? [booking.pickupLocationSnapshot?.deliveryAddress, booking.pickupLocationSnapshot?.deliveryAddressDetail].filter(Boolean).join(' ') || '딜리버리'
      : '회사 방문 수령'}`,
    `총 금액: ${totalAmount}`,
    `결제수단: ${paymentMethod}`,
    '',
    '아직 고객 예약은 확정 대기 상태입니다.',
    '결제 확인 후 아래 링크에서 예약을 확정해 주세요.',
    `예약확정: ${confirmUrl}`,
    `관리자 상세 보기: ${detailUrl}`,
  ].join('\n')

  const html = `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(previewText)}</div>
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;padding:24px;color:#17212b;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e5e7eb;">
        <div style="margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;color:#c2410c;background:#fff7ed;display:inline-block;padding:6px 10px;border-radius:999px;">확정 대기</div>
          <h1 style="margin:14px 0 8px;font-size:24px;line-height:1.3;">예약 확정 대기 알림</h1>
          <p style="margin:0;color:#475569;line-height:1.6;">신규 예약이 접수되었습니다. 결제 확인 후 예약을 확정해 주세요.</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <div style="background:#fff7ed;border-radius:12px;padding:14px;">
            <div style="font-size:12px;color:#9a3412;margin-bottom:6px;">상태</div>
            <strong style="font-size:16px;color:#c2410c;">확정 대기</strong>
          </div>
          <div style="background:#eff6ff;border-radius:12px;padding:14px;">
            <div style="font-size:12px;color:#1d4ed8;margin-bottom:6px;">결제상태</div>
            <strong style="font-size:16px;color:#1d4ed8;">입금/결제 확인 전</strong>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tbody>
            ${[
              ['예약번호', booking.publicReservationCode],
              ['고객명', booking.customerName || '-'],
              ['연락처', customerPhone],
              ['생년월일', booking.customerBirth || '-'],
              ['차량명', carName],
              ['대여일시', formatLocalDateTime(booking.pickupAt)],
              ['반납일시', formatLocalDateTime(booking.returnAt)],
              ['배차/수령', booking.pickupLocationSnapshot?.pickupOption === 'delivery'
                ? [booking.pickupLocationSnapshot?.deliveryAddress, booking.pickupLocationSnapshot?.deliveryAddressDetail].filter(Boolean).join(' ') || '딜리버리'
                : '회사 방문 수령'],
              ['총 금액', totalAmount],
              ['결제수단', paymentMethod],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:14px;vertical-align:top;width:140px;">${escapeHtml(label)}</td>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#17212b;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
          <a href="${confirmUrl}" style="background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;display:inline-block;">예약확정</a>
          <a href="${detailUrl}" style="background:#ffffff;color:#111827;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;display:inline-block;border:1px solid #d1d5db;">관리자 상세 보기</a>
        </div>

        <p style="margin:0 0 8px;color:#475569;line-height:1.6;">아직 고객 예약은 확정 대기 상태입니다.</p>
        <p style="margin:0;color:#475569;line-height:1.6;">이미 처리된 예약이면 현재 상태를 다시 보여주고 중복 확정은 막습니다.</p>
      </div>
    </div>
  `

  return {
    token,
    confirmUrl,
    detailUrl,
    subject,
    previewText,
    text,
    html,
  }
}

module.exports = {
  buildBookingConfirmationEmail,
}
