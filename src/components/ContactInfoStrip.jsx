import { useEffect, useMemo, useState } from 'react'
import { kakaoSdkConfig } from '../data/landing'

const KAKAO_JS_SDK_SRC = 'https://developers.kakao.com/sdk/js/kakao.min.js'
const KAKAO_MAP_SDK_SRC = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoSdkConfig.javascriptKey}&autoload=false`
const KAKAO_MAP_CONTAINER_ID = 'landing-kakao-map'

function loadScriptOnce(src, test) {
  return new Promise((resolve, reject) => {
    if (test()) {
      resolve()
      return
    }

    const existingScript = document.querySelector(`script[src="${src}"]`)
    const handleLoad = () => resolve()
    const handleError = () => reject(new Error(`failed to load script: ${src}`))

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.body.appendChild(script)
  })
}

async function openKakaoChat(channelPublicId, fallbackHref) {
  try {
    await loadScriptOnce(KAKAO_JS_SDK_SRC, () => Boolean(window.Kakao))
    if (!window.Kakao?.isInitialized?.()) {
      window.Kakao.init(kakaoSdkConfig.javascriptKey)
    }
    window.Kakao.Channel.chat({ channelPublicId })
  } catch (error) {
    console.error(error)
    if (fallbackHref) {
      window.open(fallbackHref, '_blank', 'noopener,noreferrer')
    }
  }
}

export default function ContactInfoStrip({ items }) {
  const [modalState, setModalState] = useState(null)
  const [mapError, setMapError] = useState('')

  const activeModal = useMemo(() => {
    if (!modalState) return null
    if (modalState.type === 'hours') {
      return {
        title: modalState.item.label,
        lines: modalState.item.detailLines || [],
      }
    }
    if (modalState.type === 'map') {
      return {
        title: modalState.item.label,
        lines: ['아래 지도에서 위치를 확인할 수 있습니다.'],
      }
    }
    return null
  }, [modalState])

  useEffect(() => {
    if (modalState?.type !== 'map') return

    let cancelled = false
    let resizeTimer = null

    async function renderMap() {
      try {
        setMapError('')
        await loadScriptOnce(KAKAO_MAP_SDK_SRC, () => Boolean(window.kakao?.maps))
        if (cancelled) return

        window.kakao.maps.load(() => {
          if (cancelled) return

          const container = document.getElementById(KAKAO_MAP_CONTAINER_ID)
          if (!container) return

          const coords = modalState.item.mapCoords
          if (!coords?.x || !coords?.y) {
            setMapError('지도를 불러오지 못했습니다. 아래 버튼으로 카카오맵을 열어 주세요.')
            return
          }

          container.innerHTML = ''
          const position = new window.kakao.maps.Coords(Number(coords.x), Number(coords.y)).toLatLng()
          const map = new window.kakao.maps.Map(container, {
            center: position,
            level: 3,
          })

          new window.kakao.maps.Marker({
            map,
            position,
            title: '빵빵카',
          })

          const relayout = () => {
            map.relayout()
            map.setCenter(position)
          }

          requestAnimationFrame(relayout)
          resizeTimer = window.setTimeout(relayout, 180)
        })
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setMapError('지도를 불러오지 못했습니다. 아래 버튼으로 카카오맵을 열어 주세요.')
        }
      }
    }

    renderMap()
    return () => {
      cancelled = true
      if (resizeTimer) {
        window.clearTimeout(resizeTimer)
      }
    }
  }, [modalState])

  function handleItemClick(item) {
    if (item.actionType === 'phone') {
      window.location.href = `tel:${String(item.value || '').replace(/[^\d+]/g, '')}`
      return
    }

    if (item.actionType === 'kakao') {
      openKakaoChat(item.channelPublicId, item.href)
      return
    }

    if (item.actionType === 'map' || item.actionType === 'hours') {
      setModalState({ type: item.actionType, item })
      return
    }
  }

  function closeModal() {
    setModalState(null)
    setMapError('')
  }

  return (
    <section className="landing-contact-section" id="landing-contact">
      <div className="container landing-section-stack">
        <div className="landing-contact-grid">
          {items.map((item) => (
            <button key={item.label} type="button" className="landing-contact-card" onClick={() => handleItemClick(item)}>
              <span className="field-label">{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </button>
          ))}
        </div>
      </div>

      {activeModal ? (
        <div className="delivery-modal-backdrop" onClick={closeModal}>
          <div
            className="search-guard-modal panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={activeModal.title}
            style={modalState?.type === 'map' ? { width: 'min(720px, 100%)' } : undefined}
          >
            <strong>{activeModal.title}</strong>
            <div className="field-note" style={{ display: 'grid', gap: 6 }}>
              {activeModal.lines.map((line) => (
                <p key={line} style={{ margin: 0 }}>{line}</p>
              ))}
            </div>
            {modalState?.type === 'map' ? (
              <>
                <p className="field-note" style={{ margin: 0 }}>{modalState.item.value}</p>
                <div id={KAKAO_MAP_CONTAINER_ID} className="landing-kakao-map" />
                {mapError ? <p className="field-note" style={{ margin: 0 }}>{mapError}</p> : null}
                <div className="search-guard-actions" style={{ justifyContent: 'space-between' }}>
                  <a className="btn btn-outline btn-md" href={modalState.item.href} target="_blank" rel="noreferrer">카카오맵에서 열기</a>
                  <button className="btn btn-dark btn-md" type="button" onClick={closeModal}>닫기</button>
                </div>
              </>
            ) : (
              <div className="search-guard-actions">
                <button className="btn btn-dark btn-md" type="button" onClick={closeModal}>닫기</button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
