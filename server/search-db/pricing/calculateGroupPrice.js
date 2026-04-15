'use strict'

function ceilHours(startAt, endAt) {
  const diffMs = endAt.getTime() - startAt.getTime()
  return diffMs / (1000 * 60 * 60)
}

function getBucket(totalHours) {
  if (totalHours <= 1) return 'hour_1'
  if (totalHours <= 6) return 'hour_6'
  if (totalHours <= 12) return 'hour_12'
  if (totalHours < 24) return 'hour_12_plus'
  if (totalHours <= 48) return 'days_1_2'
  if (totalHours <= 96) return 'days_3_4'
  if (totalHours <= 144) return 'days_5_6'
  return 'days_7_plus'
}

function getDayNameInSeoul(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date)
}

function isWeekendInSeoul(date) {
  const day = getDayNameInSeoul(date)
  return day === 'Sat' || day === 'Sun'
}

function addHours(date, hours) {
  return new Date(date.getTime() + (hours * 60 * 60 * 1000))
}

function getDurationBucketPrices(policy = {}, bucket) {
  switch (bucket) {
    case 'days_1_2':
      return {
        weekday: Number(policy.weekday_1_2d_price || 0),
        weekend: Number(policy.weekend_1_2d_price || 0),
      }
    case 'days_3_4':
      return {
        weekday: Number(policy.weekday_3_4d_price || 0),
        weekend: Number(policy.weekend_3_4d_price || 0),
      }
    case 'days_5_6':
      return {
        weekday: Number(policy.weekday_5_6d_price || 0),
        weekend: Number(policy.weekend_5_6d_price || 0),
      }
    default:
      return {
        weekday: Number(policy.weekday_7d_plus_price || 0),
        weekend: Number(policy.weekend_7d_plus_price || 0),
      }
  }
}

function calculateHourlyPrice(policy = {}, totalHours, bucket) {
  const roundedHours = Math.ceil(totalHours)
  const hour1 = Number(policy.hour_1_price || 0)
  const hour6 = Number(policy.hour_6_price || 0)
  const hour12 = Number(policy.hour_12_price || 0)

  if (bucket === 'hour_1') {
    return hour1
  }

  if (bucket === 'hour_6') {
    return hour6 > 0 ? hour6 : hour1 * roundedHours
  }

  if (bucket === 'hour_12') {
    if (hour12 > 0) return hour12
    if (hour6 > 0) return hour6 * Math.ceil(roundedHours / 6)
    return hour1 * roundedHours
  }

  const extraHours = Math.max(roundedHours - 12, 0)
  return (hour12 > 0 ? hour12 : hour1 * 12) + (hour1 * extraHours)
}

function calculateDailyPrice(policy = {}, startAt, billableDays, bucket) {
  const unitPrices = getDurationBucketPrices(policy, bucket)
  let weekdayDays = 0
  let weekendDays = 0
  let discountPrice = 0

  for (let index = 0; index < billableDays; index += 1) {
    const dayPoint = addHours(startAt, index * 24)
    if (isWeekendInSeoul(dayPoint)) {
      weekendDays += 1
      discountPrice += unitPrices.weekend
    } else {
      weekdayDays += 1
      discountPrice += unitPrices.weekday
    }
  }

  return {
    weekdayDays,
    weekendDays,
    discountPrice,
  }
}

function calculateGroupPrice({ policy, searchWindow, deliveryPrice = 0 } = {}) {
  if (!policy) {
    throw new Error('price policy is required')
  }

  if (!searchWindow?.startAt || !searchWindow?.endAt) {
    throw new Error('search window is required')
  }

  const startAt = new Date(searchWindow.startAt)
  const endAt = new Date(searchWindow.endAt)
  const totalHours = ceilHours(startAt, endAt)
  if (!(totalHours > 0)) {
    throw new Error('invalid search window')
  }

  const durationBucket = getBucket(totalHours)
  const baseDailyPrice = Number(policy.base_daily_price || 0)

  if (durationBucket.startsWith('hour_')) {
    return {
      price: baseDailyPrice,
      discountPrice: calculateHourlyPrice(policy, totalHours, durationBucket),
      deliveryPrice: Number(deliveryPrice || 0),
      baseDailyPrice,
      appliedPolicyId: policy.price_policy_id || policy.id || null,
      appliedPolicyName: policy.policy_name || null,
      imsGroupId: Number(policy.ims_group_id || 0),
      durationBucket,
      billableDays: 1,
      weekdayDays: 0,
      weekendDays: 0,
    }
  }

  const billableDays = Math.ceil(totalHours / 24)
  const daily = calculateDailyPrice(policy, startAt, billableDays, durationBucket)

  return {
    price: baseDailyPrice * billableDays,
    discountPrice: daily.discountPrice,
    deliveryPrice: Number(deliveryPrice || 0),
    baseDailyPrice,
    appliedPolicyId: policy.price_policy_id || policy.id || null,
    appliedPolicyName: policy.policy_name || null,
    imsGroupId: Number(policy.ims_group_id || 0),
    durationBucket,
    billableDays,
    weekdayDays: daily.weekdayDays,
    weekendDays: daily.weekendDays,
  }
}

module.exports = {
  calculateGroupPrice,
  getBucket,
  isWeekendInSeoul,
}
