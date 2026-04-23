import { useMemo, useState } from 'react'

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
    return null
  }, [modalState])

  function handleItemClick(item) {
    if (item.actionType === 'phone') {
      window.location.href = `tel:${String(item.value || '').replace(/[^\d+]/g, '')}`
      return
    }

    if ((item.actionType === 'kakao' || item.actionType === 'map') && item.href) {
      window.open(item.href, '_blank', 'noopener,noreferrer')
      return
    }

    if (item.actionType === 'hours') {
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
          <div className="search-guard-modal panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={activeModal.title}>
            <strong>{activeModal.title}</strong>
            <div className="field-note" style={{ display: 'grid', gap: 6 }}>
              {activeModal.lines.map((line) => (
                <p key={line} style={{ margin: 0 }}>{line}</p>
              ))}
            </div>
            <div className="search-guard-actions">
              <button className="btn btn-dark btn-md" type="button" onClick={closeModal}>닫기</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
