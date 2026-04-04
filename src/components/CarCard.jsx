import { Link, useLocation } from 'react-router-dom'

export default function CarCard({ car }) {
  const location = useLocation()

  return (
    <Link
      className="car-card panel"
      to={`/cars/${car.id}${location.search}`}
      state={{ carSummary: car }}
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
