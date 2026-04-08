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

function mapCar(carInfo) {
  return {
    carId: carInfo.id,
    name: carInfo.name || '',
    capacity: carInfo.capacity || 0,
    imageUrl: carInfo.imageUrl || '',
    oilType: carInfo.oilType || '',
    minModelYear: carInfo.minModelYear || 0,
    maxModelYear: carInfo.maxModelYear || 0,
    insuranceAge: carInfo.insuranceAge || 0,
    options: Array.isArray(carInfo.options) ? carInfo.options : [],
    price: carInfo.price || 0,
    discountPrice: carInfo.discountPrice || 0,
    deliveryPrice: carInfo.deliveryPrice || 0,
  }
}

function mapPartnerSearchDto({ search, parsed }) {
  const company = mapCompany(parsed.companyInfo)
  const cars = parsed.carInfos.map(mapCar)

  return {
    search,
    company,
    totalCount: parsed.totalCount || cars.length,
    cars,
  }
}

module.exports = {
  mapPartnerSearchDto,
}
