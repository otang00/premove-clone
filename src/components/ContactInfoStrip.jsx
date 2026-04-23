import { useMemo, useState } from 'react'

const modalCopy = {
  kakao: {
    title: '카카오톡 채널 연결 준비 중',
    lines: ['카카오톡 채널 연결은 아직 준비 중입니다.', '준비가 끝나면 바로 연결되도록 붙이겠습니다.'],
  },
  map: {
    title: '지도 연결 준비 중',
    lines: ['지도 앱 바로 연결은 아직 준비 중입니다.', '현재 방문 주소를 먼저 확인해 주세요.'],
  },
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
    return modalCopy[modalState.type] || null
  }, [modalState])

  function handleItemClick(item) {
    if (item.actionType === 'phone') {
      window.location.href = `tel:${String(item.value || '').replace(/[^\d+]/g, '')}`
      return
    }

    if (item.actionType === 'hours') {
      setModalState({ type: 'hours', item })
      return
    }

    setModalState({ type: item.actionType, item })
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
            {modalState?.type === 'map' ? <p className="field-note" style={{ margin: 0 }}>{modalState.item.value}</p> : null}
            {modalState?.type === 'kakao' ? <p className="field-note" style={{ margin: 0 }}>카카오톡 ID: {modalState.item.value}</p> : null}
            <div className="search-guard-actions">
              <button className="btn btn-dark btn-md" type="button" onClick={closeModal}>닫기</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
