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
log('has.kakao', !!window.kakao)
log('has.kakao.maps', !!window.kakao?.maps)
log('mapCtor', typeof window.kakao?.maps?.Map)
log('latLngCtor', typeof window.kakao?.maps?.LatLng)

try {
  if (typeof window.kakao?.maps?.Map !== 'function' || typeof window.kakao?.maps?.LatLng !== 'function') {
    log('result', 'FAIL: constructors unavailable')
    document.title = 'FAIL - Kakao Map Basic Test'
  } else {
    const position = new window.kakao.maps.LatLng(37.506151, 127.006526)
    const map = new window.kakao.maps.Map(document.getElementById('map'), {
      center: position,
      level: 3,
    })
    new window.kakao.maps.Marker({ map, position })
    log('map.childElementCount', document.getElementById('map').childElementCount)
    log('result', 'OK: map rendered')
    document.title = 'OK - Kakao Map Basic Test'
  }
} catch (error) {
  log('exception.name', error?.name || 'unknown')
  log('exception.message', error?.message || String(error))
  log('result', 'FAIL: exception')
  document.title = 'FAIL - Kakao Map Basic Test'
}
