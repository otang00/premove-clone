import { useMemo, useState } from 'react'
import { kakaoSdkConfig } from '../data/landing'

const KAKAO_JS_SDK_SRC = 'https://developers.kakao.com/sdk/js/kakao.min.js'

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

function buildKakaoMapEmbedUrl(address) {
  const query = encodeURIComponent(address || '')
  return `https://map.kakao.com/?q=${query}`
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
                <div style={{ width: '100%', minHeight: 360, borderRadius: 12, overflow: 'hidden', background: '#f4f8fb', border: '1px solid #dfe7ef' }}>
                  <iframe
                    title="카카오맵 위치"
                    src={buildKakaoMapEmbedUrl(modalState.item.mapAddress || modalState.item.value)}
                    style={{ width: '100%', height: 360, border: 0, display: 'block' }}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <div className="search-guard-actions" style={{ justifyContent: 'space-between' }}>
                  <a className="btn btn-outline btn-md" href={buildKakaoMapEmbedUrl(modalState.item.mapAddress || modalState.item.value)} target="_blank" rel="noreferrer">카카오맵에서 열기</a>
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
