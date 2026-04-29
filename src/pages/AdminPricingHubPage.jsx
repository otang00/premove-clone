import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { isAdminUser } from '../utils/adminAccess'
import {
  buildPricingHubPreview,
  getPricingHubPolicyEditor,
  listPricingHubGroups,
  savePricingHubPeriod,
  savePricingHubRate,
} from '../services/adminPricingHubApi'

const EMPTY_PERIOD = {
  periodName: '',
  startAt: '',
  endAt: '',
  applyMon: true,
  applyTue: true,
  applyWed: true,
  applyThu: true,
  applyFri: true,
  applySat: true,
  applySun: true,
  active: true,
  percentAdjustment: 0,
}

const EMPTY_RATE = {
  rateScope: 'common',
  fee6h: 0,
  fee12h: 0,
  fee24h: 0,
  fee1h: 0,
  week1Price: 0,
  week2Price: 0,
  month1Price: 0,
  long24hPrice: 0,
  long1hPrice: 0,
  weekendDays: '',
}

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

function buildComputedRate(legacyPolicy, base24Input, percentAdjustment) {
  const base24 = roundAmount(base24Input)
  const percent = toNumber(percentAdjustment, 0)
  const applied24h = roundAmount(base24 * (1 + percent / 100))
  const ratios = computeRatios(legacyPolicy)

  return {
    base24h: base24,
    percentAdjustment: percent,
    applied24h,
    fee6h: roundAmount(applied24h * ratios.fee6h),
    fee12h: roundAmount(applied24h * ratios.fee12h),
    fee1h: roundAmount(applied24h * ratios.fee1h),
    week1Price: roundAmount(applied24h * ratios.week1Price),
    week2Price: roundAmount(applied24h * ratios.week2Price),
    month1Price: roundAmount(applied24h * ratios.month1Price),
    long24hPrice: roundAmount(applied24h * ratios.long24hPrice),
    long1hPrice: roundAmount(applied24h * ratios.long1hPrice),
  }
}

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
  const [periodForm, setPeriodForm] = useState(EMPTY_PERIOD)
  const [rateForm, setRateForm] = useState(EMPTY_RATE)
  const [previewResult, setPreviewResult] = useState(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasAdminHint = useMemo(() => isAdminUser(user) || isAdminUser(profile), [profile, user])
  const selectedGroup = groups.find((item) => item.carGroupId === selectedCarGroupId) || null
  const selectedPolicy = editor?.policies?.[0] || null
  const computedPreview = useMemo(
    () => buildComputedRate(selectedPolicy?.legacyPolicy, rateForm.fee24h, periodForm.percentAdjustment),
    [selectedPolicy, rateForm.fee24h, periodForm.percentAdjustment],
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
        setRateForm((prev) => ({
          ...prev,
          fee24h: toNumber(legacyPolicy.baseDailyPrice, 0),
          fee6h: toNumber(legacyPolicy.hour6Price, 0),
          fee12h: toNumber(legacyPolicy.hour12Price, 0),
          fee1h: toNumber(legacyPolicy.hour1Price, 0),
        }))
        setPeriodForm((prev) => ({
          ...prev,
          percentAdjustment: 0,
        }))
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

  async function refreshEditor() {
    if (!session?.access_token || !selectedCarGroupId) return
    const result = await getPricingHubPolicyEditor(session, selectedCarGroupId)
    setEditor(result)
  }

  async function handleSavePeriod() {
    if (!session?.access_token || !selectedPolicy?.pricePolicyId) return
    setSubmitting(true)
    setSubmitMessage('')
    try {
      const savedPeriod = await savePricingHubPeriod(session, {
        ...periodForm,
        pricePolicyId: selectedPolicy.pricePolicyId,
        metadata: {
          percentAdjustment: toNumber(periodForm.percentAdjustment, 0),
        },
      })

      await savePricingHubRate(session, {
        ...EMPTY_RATE,
        pricingHubPeriodId: savedPeriod?.item?.id,
        fee24h: computedPreview.applied24h,
        fee6h: computedPreview.fee6h,
        fee12h: computedPreview.fee12h,
        fee1h: computedPreview.fee1h,
        week1Price: computedPreview.week1Price,
        week2Price: computedPreview.week2Price,
        month1Price: computedPreview.month1Price,
        long24hPrice: computedPreview.long24hPrice,
        long1hPrice: computedPreview.long1hPrice,
      })

      setPeriodForm((prev) => ({ ...EMPTY_PERIOD, percentAdjustment: prev.percentAdjustment }))
      await refreshEditor()
      setSubmitMessage('기간 정책 저장 완료')
    } catch (error) {
      setSubmitMessage(error.message || '기간 정책 저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBuildPreview() {
    if (!session?.access_token || !selectedCarGroupId) return
    setSubmitting(true)
    setSubmitMessage('')
    try {
      const result = await buildPricingHubPreview(session, { carGroupId: selectedCarGroupId })
      setPreviewResult(result)
      setSubmitMessage('미리보기 생성 완료')
    } catch (error) {
      setSubmitMessage(error.message || '미리보기 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <section className="section-bg">
        <div className="container detail-layout" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <article className="detail-card panel" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0 }}>RENTCAR00 PRICING HUB</h1>
                <p className="small-note" style={{ marginTop: 8 }}>24시간 기준금액과 기간 % 정책만 입력하고, 실제 적용 금액을 바로 확인합니다.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn btn-outline btn-md" to="/admin/bookings">예약관리로</Link>
                <Link className="btn btn-outline btn-md" to="/">메인으로</Link>
              </div>
            </div>

            {groupsError ? <p className="field-note" style={{ color: '#be123c', margin: 0 }}>{groupsError}</p> : null}
            {editorError ? <p className="field-note" style={{ color: '#be123c', margin: 0 }}>{editorError}</p> : null}
            {submitMessage ? <p className="field-note" style={{ margin: 0 }}>{submitMessage}</p> : null}

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)' }}>
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

              <div style={{ display: 'grid', gap: 16 }}>
                <div className="panel-sub" style={{ display: 'grid', gap: 8 }}>
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
                  <strong>기준값 입력</strong>
                  {editorLoading ? <p className="field-note" style={{ margin: 0 }}>편집 데이터를 불러오는 중입니다.</p> : null}
                  <div className="form-grid">
                    <Field label="기존 24시간 기준값">
                      <input className="field-input" type="number" value={rateForm.fee24h} onChange={(e) => setRateForm((prev) => ({ ...prev, fee24h: e.target.value }))} />
                    </Field>
                    <Field label="기간 조정률(%)">
                      <input className="field-input" type="number" value={periodForm.percentAdjustment} onChange={(e) => setPeriodForm((prev) => ({ ...prev, percentAdjustment: e.target.value }))} />
                    </Field>
                  </div>
                  <p className="field-note" style={{ margin: 0 }}>1h/일수별은 기존 비율을 유지하고, 6h/12h는 legacy 우선·없으면 55%/80% fallback으로 계산합니다.</p>
                </div>

                <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                  <strong>기간 정책 추가</strong>
                  <div className="form-grid">
                    <Field label="기간명"><input className="field-input" value={periodForm.periodName} onChange={(e) => setPeriodForm((prev) => ({ ...prev, periodName: e.target.value }))} /></Field>
                    <Field label="시작"><input className="field-input" type="datetime-local" value={periodForm.startAt} onChange={(e) => setPeriodForm((prev) => ({ ...prev, startAt: e.target.value }))} /></Field>
                    <Field label="종료"><input className="field-input" type="datetime-local" value={periodForm.endAt} onChange={(e) => setPeriodForm((prev) => ({ ...prev, endAt: e.target.value }))} /></Field>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      ['applyMon', '월'], ['applyTue', '화'], ['applyWed', '수'], ['applyThu', '목'], ['applyFri', '금'], ['applySat', '토'], ['applySun', '일'],
                    ].map(([key, label]) => (
                      <label key={key} className="field-note" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={periodForm[key]} onChange={(e) => setPeriodForm((prev) => ({ ...prev, [key]: e.target.checked }))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-dark btn-md" type="button" disabled={submitting || !selectedPolicy} onClick={handleSavePeriod}>기간 정책 저장</button>
                    <button className="btn btn-outline btn-md" type="button" disabled={submitting || !selectedCarGroupId} onClick={handleBuildPreview}>저장된 허브 preview</button>
                  </div>
                </div>

                <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                  <strong>실제 적용 금액 미리보기</strong>
                  <div className="reservation-result-row"><span>기본 24시간</span><strong>{formatMoney(computedPreview.base24h)}</strong></div>
                  <div className="reservation-result-row"><span>기간 조정률</span><strong>{toNumber(periodForm.percentAdjustment, 0)}%</strong></div>
                  <div className="reservation-result-row"><span>적용 24시간</span><strong>{formatMoney(computedPreview.applied24h)}</strong></div>
                  <div className="form-grid">
                    <div className="reservation-result-row"><span>1시간</span><strong>{formatMoney(computedPreview.fee1h)}</strong></div>
                    <div className="reservation-result-row"><span>6시간</span><strong>{formatMoney(computedPreview.fee6h)}</strong></div>
                    <div className="reservation-result-row"><span>12시간</span><strong>{formatMoney(computedPreview.fee12h)}</strong></div>
                    <div className="reservation-result-row"><span>1주</span><strong>{formatMoney(computedPreview.week1Price)}</strong></div>
                    <div className="reservation-result-row"><span>2주</span><strong>{formatMoney(computedPreview.week2Price)}</strong></div>
                    <div className="reservation-result-row"><span>1개월</span><strong>{formatMoney(computedPreview.month1Price)}</strong></div>
                  </div>
                  <div className="reservation-result-row"><span>IMS 반영 예상 24h</span><strong>{formatMoney(computedPreview.applied24h)}</strong></div>
                  <div className="reservation-result-row"><span>찜카 반영 예상 24h</span><strong>{formatMoney(computedPreview.applied24h)}</strong></div>
                </div>

                {selectedPolicy?.periods?.length ? (
                  <div className="panel-sub" style={{ display: 'grid', gap: 10 }}>
                    <strong>저장된 기간 정책</strong>
                    {selectedPolicy.periods.map((period) => (
                      <div key={period.id} className="reservation-result-row">
                        <span>{period.period_name || '-'}</span>
                        <strong>{toNumber(period.metadata?.percentAdjustment, 0)}%</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                {previewResult ? (
                  <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                    <strong>저장된 허브 preview 결과</strong>
                    <div className="reservation-result-row"><span>preview id</span><strong>{previewResult.previewId || '-'}</strong></div>
                    <div className="reservation-result-row"><span>항목 수</span><strong>{previewResult.itemCount || 0}</strong></div>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
