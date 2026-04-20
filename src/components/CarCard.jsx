import { Link, useLocation } from 'react-router-dom'

function buildDetailSearch(search, detailToken) {
  const params = new URLSearchParams(search || '')

  if (detailToken) {
    params.set('detailToken', detailToken)
  }

  const nextQuery = params.toString()
  return nextQuery ? `?${nextQuery}` : ''
}

export default function CarCard({ car }) {
  const location = useLocation()
  const detailSearch = buildDetailSearch(location.search, car.detailToken)

  return (
    <Link
      className="car-card panel"
      to={`/cars/${car.id}${detailSearch}`}
    >
      <div className="car-thumb-wrap">
        <img src={car.image} alt={car.name} />
      </div>
      <div className="car-body">
        <div className="car-head">
          <div>
            <h3>{car.name}</h3>
            <div className="inline-meta">{car.yearLabel}</div>
            <div className="mini-tags">
              <span>{car.ageLabel}</span>
              <span>{car.fuelType}</span>
              <span>{car.seats}</span>
            </div>
          </div>
          <div className="prices refined-price">
            <strong>{car.dayPrice}</strong>
            <span>{car.totalPrice}</span>
          </div>
        </div>
        <p className="feature-line">{car.features.join(', ')}</p>
      </div>
    </Link>
  )
}
