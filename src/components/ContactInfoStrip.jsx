import { useEffect, useMemo, useState } from 'react'

const KAKAO_ROUGHMAP_SCRIPT = 'https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js'

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
        lines: ['아래 지도에서 위치를 바로 확인할 수 있습니다.'],
      }
    }
    return null
  }, [modalState])

  useEffect(() => {
    if (modalState?.type !== 'map') return

    const mapConfig = modalState.item.mapEmbed
    const containerId = `daumRoughmapContainer${mapConfig.timestamp}`

    function renderMap() {
      const container = document.getElementById(containerId)
      if (!container || !window.daum?.roughmap?.Lander) return
      if (container.dataset.rendered === 'true') return
      container.innerHTML = ''
      new window.daum.roughmap.Lander({
        timestamp: mapConfig.timestamp,
        key: mapConfig.key,
        mapWidth: mapConfig.mapWidth,
        mapHeight: mapConfig.mapHeight,
      }).render()
      container.dataset.rendered = 'true'
    }

    const existingScript = document.querySelector(`script[src="${KAKAO_ROUGHMAP_SCRIPT}"]`)
    if (existingScript) {
      if (window.daum?.roughmap?.Lander) renderMap()
      else existingScript.addEventListener('load', renderMap, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = KAKAO_ROUGHMAP_SCRIPT
    script.async = true
    script.charset = 'UTF-8'
    script.addEventListener('load', renderMap, { once: true })
    document.body.appendChild(script)
  }, [modalState])

  function handleItemClick(item) {
    if (item.actionType === 'phone') {
      window.location.href = `tel:${String(item.value || '').replace(/[^\d+]/g, '')}`
      return
    }

    if (item.actionType === 'kakao' && item.href) {
      window.open(item.href, '_blank', 'noopener,noreferrer')
      return
    }

    if (item.actionType === 'hours' || item.actionType === 'map') {
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
                <div id={`daumRoughmapContainer${modalState.item.mapEmbed.timestamp}`} className="root_daum_roughmap root_daum_roughmap_landing" style={{ width: '100%', minHeight: 360 }} />
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
