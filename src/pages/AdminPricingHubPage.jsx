import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { isAdminUser } from '../utils/adminAccess'
import {
  buildPricingHubPreview,
  getPricingHubPolicyEditor,
  listPricingHubGroups,
  savePricingHubOverride,
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
}

const EMPTY_RATE = {
  rateScope: 'common',
  fee6h: 0,
  fee12h: 0,
  fee24h: 0,
  fee1h: 0,
  discountPercent: '',
  discountAmount: '',
  week1Price: '',
  week2Price: '',
  month1Price: '',
  long24hPrice: '',
  long1hPrice: '',
  weekendDays: '',
}

const EMPTY_OVERRIDE = {
  targetType: 'ims_group',
  targetId: '',
  fieldName: 'fee_24h',
  overrideType: 'absolute',
  overrideValue: 0,
  startAt: '',
  endAt: '',
  priority: 100,
  reason: '',
  status: 'active',
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span className="field-note" style={{ fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}

function JsonBlock({ value }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 12,
        borderRadius: 12,
        background: '#0f172a',
        color: '#e2e8f0',
        fontSize: 12,
        overflowX: 'auto',
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  )
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
  const [overrideForm, setOverrideForm] = useState(EMPTY_OVERRIDE)
  const [previewResult, setPreviewResult] = useState(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasAdminHint = useMemo(() => isAdminUser(user) || isAdminUser(profile), [profile, user])
  const selectedGroup = groups.find((item) => item.carGroupId === selectedCarGroupId) || null
  const selectedPolicy = editor?.policies?.[0] || null
  const selectedPeriod = selectedPolicy?.periods?.[0] || null

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
        const fallbackTargetId = String(result?.group?.imsGroupId || result?.group?.carGroupId || '')
        setOverrideForm((prev) => ({ ...prev, targetId: fallbackTargetId }))
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
      await savePricingHubPeriod(session, {
        ...periodForm,
        pricePolicyId: selectedPolicy.pricePolicyId,
      })
      setPeriodForm(EMPTY_PERIOD)
      await refreshEditor()
      setSubmitMessage('기간 저장 완료')
    } catch (error) {
      setSubmitMessage(error.message || '기간 저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveRate() {
    if (!session?.access_token || !selectedPeriod?.id) return
    setSubmitting(true)
    setSubmitMessage('')
    try {
      await savePricingHubRate(session, {
        ...rateForm,
        pricingHubPeriodId: selectedPeriod.id,
      })
      setRateForm(EMPTY_RATE)
      await refreshEditor()
      setSubmitMessage('요율 저장 완료')
    } catch (error) {
      setSubmitMessage(error.message || '요율 저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveOverride() {
    if (!session?.access_token) return
    setSubmitting(true)
    setSubmitMessage('')
    try {
      await savePricingHubOverride(session, overrideForm)
      setOverrideForm((prev) => ({
        ...EMPTY_OVERRIDE,
        targetType: prev.targetType,
        targetId: prev.targetId,
      }))
      await refreshEditor()
      setSubmitMessage('예외 규칙 저장 완료')
    } catch (error) {
      setSubmitMessage(error.message || '예외 규칙 저장 실패')
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
                <p className="small-note" style={{ marginTop: 8 }}>운영 검색 가격은 건드리지 않고 분리된 허브 데이터만 관리합니다.</p>
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
                    <span style={{ fontSize: 12, opacity: 0.75 }}>P{item.hubPeriodsCount} / O{item.hubOverridesCount}</span>
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
                  <strong>기존 정책 기준값</strong>
                  {editorLoading ? <p className="field-note" style={{ margin: 0 }}>편집 데이터를 불러오는 중입니다.</p> : null}
                  {!editorLoading && selectedPolicy ? <JsonBlock value={selectedPolicy.legacyPolicy} /> : null}
                </div>

                <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                  <strong>기간 추가</strong>
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
                    <button className="btn btn-dark btn-md" type="button" disabled={submitting || !selectedPolicy} onClick={handleSavePeriod}>기간 저장</button>
                  </div>
                </div>

                <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                  <strong>요율 추가</strong>
                  <p className="field-note" style={{ margin: 0 }}>가장 최근 period 기준으로 저장합니다.</p>
                  <div className="form-grid">
                    <Field label="scope">
                      <select className="field-select" value={rateForm.rateScope} onChange={(e) => setRateForm((prev) => ({ ...prev, rateScope: e.target.value }))}>
                        <option value="common">common</option>
                        <option value="weekday">weekday</option>
                        <option value="weekend">weekend</option>
                        <option value="extended">extended</option>
                      </select>
                    </Field>
                    <Field label="6h"><input className="field-input" type="number" value={rateForm.fee6h} onChange={(e) => setRateForm((prev) => ({ ...prev, fee6h: e.target.value }))} /></Field>
                    <Field label="12h"><input className="field-input" type="number" value={rateForm.fee12h} onChange={(e) => setRateForm((prev) => ({ ...prev, fee12h: e.target.value }))} /></Field>
                    <Field label="24h"><input className="field-input" type="number" value={rateForm.fee24h} onChange={(e) => setRateForm((prev) => ({ ...prev, fee24h: e.target.value }))} /></Field>
                    <Field label="1h"><input className="field-input" type="number" value={rateForm.fee1h} onChange={(e) => setRateForm((prev) => ({ ...prev, fee1h: e.target.value }))} /></Field>
                    <Field label="weekend_days"><input className="field-input" value={rateForm.weekendDays} onChange={(e) => setRateForm((prev) => ({ ...prev, weekendDays: e.target.value }))} /></Field>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-dark btn-md" type="button" disabled={submitting || !selectedPeriod} onClick={handleSaveRate}>요율 저장</button>
                  </div>
                </div>

                <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                  <strong>예외 규칙 추가</strong>
                  <div className="form-grid">
                    <Field label="target type">
                      <select className="field-select" value={overrideForm.targetType} onChange={(e) => setOverrideForm((prev) => ({ ...prev, targetType: e.target.value }))}>
                        <option value="ims_group">ims_group</option>
                        <option value="vehicle">vehicle</option>
                        <option value="policy">policy</option>
                        <option value="zzimcar_model">zzimcar_model</option>
                      </select>
                    </Field>
                    <Field label="target id"><input className="field-input" value={overrideForm.targetId} onChange={(e) => setOverrideForm((prev) => ({ ...prev, targetId: e.target.value }))} /></Field>
                    <Field label="field"><input className="field-input" value={overrideForm.fieldName} onChange={(e) => setOverrideForm((prev) => ({ ...prev, fieldName: e.target.value }))} /></Field>
                    <Field label="type">
                      <select className="field-select" value={overrideForm.overrideType} onChange={(e) => setOverrideForm((prev) => ({ ...prev, overrideType: e.target.value }))}>
                        <option value="absolute">absolute</option>
                        <option value="adjustment">adjustment</option>
                        <option value="percentage">percentage</option>
                      </select>
                    </Field>
                    <Field label="value"><input className="field-input" type="number" value={overrideForm.overrideValue} onChange={(e) => setOverrideForm((prev) => ({ ...prev, overrideValue: e.target.value }))} /></Field>
                    <Field label="priority"><input className="field-input" type="number" value={overrideForm.priority} onChange={(e) => setOverrideForm((prev) => ({ ...prev, priority: e.target.value }))} /></Field>
                  </div>
                  <Field label="reason"><input className="field-input" value={overrideForm.reason} onChange={(e) => setOverrideForm((prev) => ({ ...prev, reason: e.target.value }))} /></Field>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-dark btn-md" type="button" disabled={submitting} onClick={handleSaveOverride}>예외 저장</button>
                    <button className="btn btn-outline btn-md" type="button" disabled={submitting || !selectedCarGroupId} onClick={handleBuildPreview}>미리보기 생성</button>
                  </div>
                </div>

                <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                  <strong>현재 허브 상태</strong>
                  <JsonBlock value={{ policies: editor?.policies || [], overrides: editor?.overrides || [] }} />
                </div>

                {previewResult ? (
                  <div className="panel-sub" style={{ display: 'grid', gap: 12 }}>
                    <strong>최근 preview</strong>
                    <JsonBlock value={previewResult} />
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
