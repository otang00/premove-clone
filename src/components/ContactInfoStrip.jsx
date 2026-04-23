import { useEffect, useMemo, useRef, useState } from 'react'
import { kakaoSdkConfig } from '../data/landing'

const KAKAO_JS_SDK_SRC = 'https://developers.kakao.com/sdk/js/kakao.min.js'
const DAUM_ROUGHMAP_SRC = 'https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js'
const ROUGHMAP_TIMESTAMP = '1776919951083'
const ROUGHMAP_KEY = '2aqu8keznbw6'
const ROUGHMAP_CONTAINER_ID = `daumRoughmapContainer${ROUGHMAP_TIMESTAMP}`

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

function RoughMapEmbed() {
  const renderedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function renderMap() {
      try {
        await loadScriptOnce(DAUM_ROUGHMAP_SRC, () => Boolean(window.daum?.roughmap?.Lander))
        if (cancelled || renderedRef.current) return

        const container = document.getElementById(ROUGHMAP_CONTAINER_ID)
        if (!container) return

        container.innerHTML = ''
        new window.daum.roughmap.Lander({
          timestamp: ROUGHMAP_TIMESTAMP,
          key: ROUGHMAP_KEY,
          mapWidth: '640',
          mapHeight: '360',
        }).render()
        renderedRef.current = true
      } catch (error) {
        console.error(error)
      }
    }

    renderMap()

    return () => {
      cancelled = true
      renderedRef.current = false
      const container = document.getElementById(ROUGHMAP_CONTAINER_ID)
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [])

  return (
    <div
      id={ROUGHMAP_CONTAINER_ID}
      className="root_daum_roughmap root_daum_roughmap_landing"
      style={{ width: '100%', minHeight: 360, borderRadius: 12, overflow: 'hidden', background: '#f4f8fb', border: '1px solid #dfe7ef' }}
    />
  )
}

export default function ContactInfoStrip({ items }) {
  const [modalState, setModalState] = useState(null)

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
                <RoughMapEmbed />
                <div className="search-guard-actions" style={{ justifyContent: 'flex-end' }}>
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
