import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { isAdminUser } from '../utils/adminAccess'
import {
  getPricingHubPolicyEditor,
  listPricingHubGroups,
} from '../services/adminPricingHubApi'

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span className="field-note" style={{ fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}

function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function roundAmount(value) {
  return Math.max(0, Math.round(toNumber(value, 0)))
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`
}

function computeRatios(legacyPolicy) {
  const base24 = toNumber(legacyPolicy?.baseDailyPrice, 0)
  if (base24 <= 0) {
    return {
      fee6h: 0.55,
      fee12h: 0.8,
      fee1h: 0.04,
      week1Price: 6.5,
      week2Price: 12.5,
      month1Price: 24,
      long24hPrice: 1,
      long1hPrice: 0.04,
    }
  }

  return {
    fee6h: toNumber(legacyPolicy?.hour6Price, base24 * 0.55) / base24,
    fee12h: toNumber(legacyPolicy?.hour12Price, base24 * 0.8) / base24,
    fee1h: toNumber(legacyPolicy?.hour1Price, base24 * 0.04) / base24,
    week1Price: toNumber(legacyPolicy?.weekday7dPlusPrice, base24 * 6.5) / base24,
    week2Price: toNumber(legacyPolicy?.weekend7dPlusPrice, base24 * 12.5) / base24,
    month1Price: 24,
    long24hPrice: 1,
    long1hPrice: toNumber(legacyPolicy?.hour1Price, base24 * 0.1) / base24,
  }
}

function buildComputedRate(legacyPolicy, base24Input, adjustedBase24hInput) {
  const originalBase24h = roundAmount(base24Input)
  const adjustedBase24h = roundAmount(adjustedBase24hInput)
  const ratios = computeRatios(legacyPolicy)
  const weekdayRatePercent = toNumber(legacyPolicy?.weekdayRatePercent, 100)
  const weekendRatePercent = toNumber(legacyPolicy?.weekendRatePercent, 100)
  const weekdayApplied24h = roundAmount(adjustedBase24h * (weekdayRatePercent / 100))
  const weekendApplied24h = roundAmount(adjustedBase24h * (weekendRatePercent / 100))

  return {
    originalBase24h,
    adjustedBase24h,
    weekdayApplied24h,
    weekendApplied24h,
    fee6h: roundAmount(weekdayApplied24h * ratios.fee6h),
    fee12h: roundAmount(weekdayApplied24h * ratios.fee12h),
    fee1h: roundAmount(weekdayApplied24h * ratios.fee1h),
    week1Price: roundAmount(weekdayApplied24h * ratios.week1Price),
    week2Price: roundAmount(weekendApplied24h * ratios.week2Price),
    month1Price: roundAmount(weekdayApplied24h * ratios.month1Price),
    long24hPrice: roundAmount(weekdayApplied24h * ratios.long24hPrice),
    long1hPrice: roundAmount(weekdayApplied24h * ratios.long1hPrice),
  }
}

const ADJUST_MODE_WEEKDAY = 'weekday'
const ADJUST_MODE_BASE24 = 'base24'

export default function AdminPricingHubPage() {
  const navigate = useNavigate()
  const { loading, isAuthenticated, session, user, profile } = useAuth()
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupsError, setGroupsError] = useState('')
  const [selectedCarGroupId, setSelectedCarGroupId] = useState('')
  const [editor, setEditor] = useState(null)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [base24hInput, setBase24hInput] = useState(0)
  const [adjustedBase24hInput, setAdjustedBase24hInput] = useState(0)
  const [adjustMode, setAdjustMode] = useState(ADJUST_MODE_WEEKDAY)
  const [submitMessage, setSubmitMessage] = useState('')
  const selectionCardRef = useRef(null)

  const hasAdminHint = useMemo(() => isAdminUser(user) || isAdminUser(profile), [profile, user])
  const selectedGroup = groups.find((item) => item.carGroupId === selectedCarGroupId) || null
  const selectedPolicy = editor?.policies?.[0] || null
  const computedPreview = useMemo(
    () => buildComputedRate(selectedPolicy?.legacyPolicy, base24hInput, adjustedBase24hInput),
    [selectedPolicy, base24hInput, adjustedBase24hInput],
  )

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login?redirectTo=/admin/pricing-hub', { replace: true })
    }
  }, [loading, isAuthenticated, navigate])

  useEffect(() => {
    if (!loading && isAuthenticated && !hasAdminHint) {
      navigate('/', { replace: true })
    }
  }, [loading, isAuthenticated, hasAdminHint, navigate])

  useEffect(() => {
    let ignore = false
    if (!session?.access_token || !hasAdminHint) {
      setGroupsLoading(false)
      return () => {
        ignore = true
      }
    }

    setGroupsLoading(true)
    listPricingHubGroups(session)
      .then((result) => {
        if (ignore) return
        const items = Array.isArray(result.items) ? result.items : []
        setGroups(items)
        setGroupsError('')
        if (!selectedCarGroupId && items[0]?.carGroupId) {
          setSelectedCarGroupId(items[0].carGroupId)
        }
      })
      .catch((error) => {
        if (ignore) return
        setGroups([])
        setGroupsError(error.message || '목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (ignore) return
        setGroupsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [session, hasAdminHint, selectedCarGroupId])

  useEffect(() => {
    let ignore = false
    if (!session?.access_token || !selectedCarGroupId) {
      setEditor(null)
      return () => {
        ignore = true
      }
    }

    setEditorLoading(true)
    getPricingHubPolicyEditor(session, selectedCarGroupId)
      .then((result) => {
        if (ignore) return
        setEditor(result)
        setEditorError('')
        const legacyPolicy = result?.policies?.[0]?.legacyPolicy || {}
        const nextBase24h = toNumber(legacyPolicy.baseDailyPrice, 0)
        setBase24hInput(nextBase24h)
        setAdjustedBase24hInput(nextBase24h)
      })
      .catch((error) => {
        if (ignore) return
        setEditor(null)
        setEditorError(error.message || '편집 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (ignore) return
        setEditorLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [session, selectedCarGroupId])

  useEffect(() => {
    if (!selectedCarGroupId || !selectionCardRef.current) return
    if (typeof window === 'undefined' || window.innerWidth > 960) return

    selectionCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedCarGroupId])

  function handleAdjustInputChange(value) {
    if (adjustMode === ADJUST_MODE_BASE24) {
      setAdjustedBase24hInput(value)
      return
    }

    const weekdayRatePercent = toNumber(selectedPolicy?.legacyPolicy?.weekdayRatePercent, 100)
    const weekdayTarget = roundAmount(value)
    if (weekdayRatePercent <= 0) {
      setAdjustedBase24hInput(0)
      return
    }

    const nextBase24h = roundAmount(weekdayTarget / (weekdayRatePercent / 100))
    setAdjustedBase24hInput(nextBase24h)
  }

  const adjustFieldLabel = adjustMode === ADJUST_MODE_WEEKDAY ? '주중 24시간 요금' : '조정 후 24시간 기준값'
  const adjustFieldValue = adjustMode === ADJUST_MODE_WEEKDAY ? computedPreview.weekdayApplied24h : adjustedBase24hInput

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0 }}>RENTCAR00 PRICING HUB</h1>
                <p className="small-note" style={{ marginTop: 8 }}>기준 24시간 금액은 잠그고, 기본은 주중 24시간 요금 기준으로 조정합니다.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn btn-outline btn-md" to="/admin/bookings">예약관리로</Link>
                <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
              </div>
            </div>

            {groupsError ? <p className="field-note" style={{ color: '#be123c', margin: 0 }}>{groupsError}</p> : null}
            {editorError ? <p className="field-note" style={{ color: '#be123c', margin: 0 }}>{editorError}</p> : null}
            {submitMessage ? <p className="field-note" style={{ margin: 0 }}>{submitMessage}</p> : null}

            <div className="pricing-hub-layout" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', alignItems: 'start' }}>
              <div className="panel-sub" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                <strong>IMS 그룹 / 정책 목록</strong>
                {groupsLoading ? <p className="field-note" style={{ margin: 0 }}>불러오는 중입니다.</p> : null}
                {!groupsLoading && groups.length === 0 ? <p className="field-note" style={{ margin: 0 }}>표시할 그룹이 없습니다.</p> : null}
                {groups.map((item) => (
                  <button
                    key={`${item.carGroupId}-${item.pricePolicyId}`}
                    type="button"
                    className={`btn btn-md ${selectedCarGroupId === item.carGroupId ? 'is-active' : ''}`}
                    style={{ justifyContent: 'space-between', textAlign: 'left' }}
                    onClick={() => setSelectedCarGroupId(item.carGroupId)}
                  >
                    <span>{item.groupName} · {item.policyName}</span>
                    <span style={{ fontSize: 12, opacity: 0.75 }}>P{item.hubPeriodsCount}</span>
                  </button>
                ))}
              </div>

              <div className="pricing-hub-editor-column" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
                <div ref={selectionCardRef} className="panel-sub" style={{ display: 'grid', gap: 8 }}>
                  <strong>선택 그룹</strong>
                  {selectedGroup ? (
                    <>
                      <div className="reservation-result-row"><span>IMS 그룹</span><strong>{selectedGroup.imsGroupId}</strong></div>
                      <div className="reservation-result-row"><span>그룹명</span><strong>{selectedGroup.groupName}</strong></div>
                      <div className="reservation-result-row"><span>기존 정책</span><strong>{selectedGroup.policyName}</strong></div>
                    </>
                  ) : (
                    <p className="field-note" style={{ margin: 0 }}>그룹을 선택하세요.</p>
                  )}
                </div>

                <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <strong>기준값 조정</strong>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className={`btn btn-md ${adjustMode === ADJUST_MODE_BASE24 ? 'btn-dark' : 'btn-outline'}`} onClick={() => setAdjustMode(ADJUST_MODE_BASE24)}>기준값수정</button>
                      <button type="button" className={`btn btn-md ${adjustMode === ADJUST_MODE_WEEKDAY ? 'btn-dark' : 'btn-outline'}`} onClick={() => setAdjustMode(ADJUST_MODE_WEEKDAY)}>주중요금수정</button>
                    </div>
                  </div>
                  {editorLoading ? <p className="field-note" style={{ margin: 0 }}>편집 데이터를 불러오는 중입니다.</p> : null}
                  <div style={{ display: 'grid', gap: 12 }}>
                    <Field label="기준 24시간 금액">
                      <input className="field-input" type="text" readOnly value={formatMoney(computedPreview.originalBase24h)} />
                    </Field>
                    <Field label={adjustFieldLabel}>
                      <input className="field-input" type="number" value={adjustFieldValue} onChange={(e) => handleAdjustInputChange(e.target.value)} />
                    </Field>
                  </div>
                  <div className="reservation-result-row"><span>조정 후 24시간 기준값</span><strong>{formatMoney(computedPreview.adjustedBase24h)}</strong></div>
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div className="reservation-result-row"><span>주중 24시간 요금</span><strong>{formatMoney(computedPreview.weekdayApplied24h)}</strong></div>
                    <div className="reservation-result-row"><span>주말 24시간 요금</span><strong>{formatMoney(computedPreview.weekendApplied24h)}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
