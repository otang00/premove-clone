const { IMS_API_BASE_URL, getAuthorizationHeader, loginToIms } = require('./lib/ims-auth');

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildReservationsQuery(params = {}) {
  const today = params.baseDate ? new Date(params.baseDate) : new Date();
  const startDate = params.start ? new Date(params.start) : today;
  const windowDays = Number.isFinite(Number(params.windowDays)) ? Number(params.windowDays) : Number(process.env.IMS_SYNC_WINDOW_DAYS || 30);
  const endDate = params.end ? new Date(params.end) : addDays(startDate, windowDays);

  const query = new URLSearchParams({
    page: String(params.page || 1),
    base_date: formatDate(today),
    rental_type: params.rentalType || 'all',
    status: params.status || 'all',
    exclude_returned: String(params.excludeReturned ?? false),
    date_option: params.dateOption || 'end_at',
    start: formatDate(startDate),
    end: formatDate(endDate),
  });

  if (params.option) {
    query.set('option', params.option);
  }

  return query;
}

async function fetchReservationsPage({ authorization, page = 1, ...rest } = {}) {
  const authHeader = authorization || (await loginToIms()).authorization;
  const query = buildReservationsQuery({ page, ...rest });
  const response = await fetch(`${IMS_API_BASE_URL}/v2/company-car-schedules/reservations?${query.toString()}`, {
    headers: {
      Authorization: authHeader,
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'premove-clone/ims-sync',
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const detail = data?.error_name || data?.message || `HTTP ${response.status}`;
    const error = new Error(`IMS reservations fetch failed: ${detail}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return {
    page,
    query: Object.fromEntries(query.entries()),
    schedules: Array.isArray(data.schedules) ? data.schedules : [],
    totalPage: Number(data.total_page || 1),
    defaultInfo: data.defaultInfo || null,
    raw: data,
  };
}

async function fetchAllReservations(options = {}) {
  const authHeader = options.authorization || (await loginToIms()).authorization;
  const pages = [];
  let page = Number(options.page || 1);

  while (true) {
    const current = await fetchReservationsPage({ ...options, authorization: authHeader, page });
    pages.push(current);

    const isLastPage = current.schedules.length === 0 || page >= current.totalPage;
    if (isLastPage) break;
    page += 1;
  }

  return {
    authorization: authHeader,
    pages,
    schedules: pages.flatMap((entry) => entry.schedules),
    totalPagesFetched: pages.length,
  };
}

module.exports = {
  buildReservationsQuery,
  fetchReservationsPage,
  fetchAllReservations,
};
