const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; premove-clone/0.1; +https://vercel.app)',
  'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

async function fetchPartnerCarDetail(url, options = {}) {
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs || 15000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = new Error(`partner detail fetch failed with status ${response.status}`)
      error.status = response.status
      throw error
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`partner detail fetch timeout after ${timeoutMs}ms`)
      timeoutError.code = 'PARTNER_DETAIL_FETCH_TIMEOUT'
      throw timeoutError
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = {
  fetchPartnerCarDetail,
}
