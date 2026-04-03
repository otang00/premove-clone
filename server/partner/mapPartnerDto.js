function mapCompany(companyInfo) {
  return {
    companyId: companyInfo.companyId,
    companyName: String(companyInfo.companyName || '').trim(),
    companyTel: companyInfo.companyTel || '',
    fullGarageAddress: companyInfo.fullGarageAddress || '',
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
