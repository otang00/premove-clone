const logEl = document.getElementById('log')
const lines = []
const log = (label, value) => {
  lines.push(`${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
  logEl.textContent = lines.join('\n')
}

window.addEventListener('error', (event) => {
  log('window.error', event.message)
})

log('location.href', window.location.href)
log('document.domain', document.domain)
log('userAgent', navigator.userAgent)

function finish(status, extra) {
  document.title = `${status} - Kakao Map Minimal Test`
  if (extra) log('result', extra)
  log('done', status)
}

log('has.kakao', !!window.kakao)
log('has.kakao.maps.beforeLoad', !!window.kakao?.maps)

if (!window.kakao?.maps?.load) {
  finish('FAIL', 'kakao.maps.load missing')
} else {
  window.kakao.maps.load(() => {
    try {
      const state = {
        hasMaps: !!window.kakao?.maps,
        mapCtor: typeof window.kakao?.maps?.Map,
        latLngCtor: typeof window.kakao?.maps?.LatLng,
        markerCtor: typeof window.kakao?.maps?.Marker,
        services: typeof window.kakao?.maps?.services,
      }
      log('state.afterLoad', state)

      if (typeof window.kakao?.maps?.Map !== 'function' || typeof window.kakao?.maps?.LatLng !== 'function') {
        finish('FAIL', 'constructors unavailable after load')
        return
      }

      const position = new window.kakao.maps.LatLng(37.506151, 127.006526)
      const map = new window.kakao.maps.Map(document.getElementById('map'), {
        center: position,
        level: 3,
      })
      new window.kakao.maps.Marker({ map, position })
      log('map.childElementCount', document.getElementById('map').childElementCount)
      finish('OK', 'map rendered')
    } catch (error) {
      log('exception.name', error?.name || 'unknown')
      log('exception.message', error?.message || String(error))
      finish('FAIL', 'exception while rendering')
    }
  })
}
