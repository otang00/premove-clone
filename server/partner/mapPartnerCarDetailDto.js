function normalizeOptionLabel(option) {
  const optionMap = {
    navigation: '네비게이션',
    bluetooth: '블루투스',
    rear_sensor: '후방센서',
    heated_handle: '핸들열선',
    rear_camera: '후방카메라',
    smart_key: '스마트키',
    heated_seat: '열선시트',
    dash_cam: '블랙박스',
    driver_airbag: '운전석 에어백',
    passenger_airbag: '조수석 에어백',
    non_smoking: '금연 차량',
  }

  return optionMap[option] || option
}

function mapDeliveryTimes(companyInfo) {
  if (!Array.isArray(companyInfo.deliveryTimes)) return []

  return companyInfo.deliveryTimes.map((item) => ({
    dayOfWeek: item.dayOfWeek || '',
    startAt: item.startAt || '',
    endAt: item.endAt || '',
    holiday: Boolean(item.holiday),
  }))
}

function mapDeliveryCostList(companyInfo) {
  if (!Array.isArray(companyInfo.deliveryCostList)) return []

  return companyInfo.deliveryCostList.map((province) => ({
    id: province.id,
    name: province.name || '',
    isAll: Boolean(province.isAll),
    cities: Array.isArray(province.cities)
      ? province.cities.map((city) => ({
          id: city.id,
          name: city.name || '',
          isAll: Boolean(city.isAll),
          dongs: Array.isArray(city.dongs)
            ? city.dongs.map((dong) => ({
                id: dong.id,
                name: dong.name || '',
                oneWay: Number(dong.oneWay || 0),
                roundTrip: Number(dong.roundTrip || 0),
                fullLabel: [province.name, city.name, dong.name].filter(Boolean).join(' '),
              }))
            : [],
        }))
      : [],
  }))
}

function mapCompany(companyInfo) {
  return {
    companyId: companyInfo.companyId,
    companyName: String(companyInfo.companyName || '').trim(),
    companyTel: companyInfo.companyTel || '',
    fullGarageAddress: companyInfo.fullGarageAddress || '',
    garageLat: Number(companyInfo.garageLat || 0),
    garageLng: Number(companyInfo.garageLng || 0),
    deliveryTimes: mapDeliveryTimes(companyInfo),
    deliveryCostList: mapDeliveryCostList(companyInfo),
  }
}

function mapInsurance(carDetailInfo) {
  const generalInsurance = Array.isArray(carDetailInfo.insurance?.carInsurance)
    ? carDetailInfo.insurance.carInsurance[0] || null
    : null

  const fullInsurance = carDetailInfo.insurance?.fullInsurance || null

  return {
    general: generalInsurance
      ? {
          category: generalInsurance.category || 'general',
          fee: generalInsurance.fee || 0,
          coverage: generalInsurance.coverage || 0,
          indemnificationFee: generalInsurance.indemnificationFee || 0,
        }
      : null,
    full: fullInsurance
      ? {
          personLimit: fullInsurance.personLimit || '',
          personIndemnificationFee: fullInsurance.personIndemnificationFee || 0,
          objectLimit: fullInsurance.objectLimit || 0,
          objectIndemnificationFee: fullInsurance.objectIndemnificationFee || 0,
          selfLimit: fullInsurance.selfLimit || 0,
          selfIndemnificationFee: fullInsurance.selfIndemnificationFee || 0,
          selfCriticalLimit: fullInsurance.selfCriticalLimit || 0,
          selfCriticalIndemnificationFee: fullInsurance.selfCriticalIndemnificationFee || 0,
        }
      : null,
  }
}

function mapCar(carDetailInfo) {
  return {
    carId: carDetailInfo.id,
    name: carDetailInfo.submodel?.name || carDetailInfo.name || '',
    displayName: carDetailInfo.name || '',
    imageUrl: carDetailInfo.submodel?.imageUrl || '',
    fuelType: carDetailInfo.fuelType || '',
    capacity: carDetailInfo.seater || 0,
    minModelYear: carDetailInfo.minModelYear || 0,
    maxModelYear: carDetailInfo.maxModelYear || 0,
    manufacturerName: carDetailInfo.manufacturerName || '',
    model: carDetailInfo.model || '',
    rentAge: carDetailInfo.rentAge || 0,
    drivingYears: carDetailInfo.drivingYears || 0,
    options: Array.isArray(carDetailInfo.options)
      ? carDetailInfo.options.map(normalizeOptionLabel)
      : [],
  }
}

function mapPricing(carDetailInfo, search) {
  const rentalCost = Number(carDetailInfo.rentalCost || 0)
  const originCost = Number(carDetailInfo.originCost || 0)
  const insurancePrice = Number(carDetailInfo.insurance?.carInsurance?.[0]?.fee || 0)
  const deliveryOneWay = Number(carDetailInfo.delivery?.oneWay || 0)
  const deliveryRoundTrip = Number(carDetailInfo.delivery?.roundTrip || 0)
  const deliveryPrice = search.pickupOption === 'delivery' ? deliveryRoundTrip : 0
  const finalPrice = rentalCost + insurancePrice + deliveryPrice

  return {
    rentalCost,
    originCost,
    insurancePrice,
    delivery: {
      oneWay: deliveryOneWay,
      roundTrip: deliveryRoundTrip,
    },
    finalPrice,
  }
}

function mapPartnerCarDetailDto({ search, parsed }) {
  return {
    search,
    company: mapCompany(parsed.companyInfo),
    car: mapCar(parsed.carDetailInfo),
    pricing: mapPricing(parsed.carDetailInfo, search),
    insurance: mapInsurance(parsed.carDetailInfo),
  }
}

module.exports = {
  mapPartnerCarDetailDto,
}
