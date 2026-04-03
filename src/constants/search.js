export const SEARCH_QUERY_KEYS = [
  'deliveryDateTime',
  'returnDateTime',
  'pickupOption',
  'driverAge',
  'order',
  'dongId',
  'deliveryAddress',
]

export const PICKUP_OPTIONS = ['pickup', 'delivery']
export const ORDER_OPTIONS = ['lower', 'higher', 'newer']
export const DRIVER_AGE_OPTIONS = [21, 26]

export const DEFAULT_SEARCH_STATE = {
  deliveryDateTime: '2026-04-02 10:00',
  returnDateTime: '2026-04-03 10:00',
  pickupOption: 'pickup',
  driverAge: 26,
  order: 'lower',
  dongId: null,
  deliveryAddress: '',
}
