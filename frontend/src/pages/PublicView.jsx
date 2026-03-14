import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { FeedbackExplanation } from '../components/FeedbackExplanation'
import { getDeviceFingerprintHash, getOrCreateSessionId } from '../lib/device'

function formatTrustLevel(level) {
  if (!level) return '—'
  return level.charAt(0) + level.slice(1).toLowerCase()
}

function reviewTrustTone(score) {
  const n = Number(score || 0)
  if (n >= 71) return 'high'
  if (n >= 40) return 'medium'
  return 'low'
}

function reviewTrustPillClass(score) {
  const tone = reviewTrustTone(score)
  if (tone === 'high') return 'publicTrustPill publicTrustPill--high'
  if (tone === 'medium') return 'publicTrustPill publicTrustPill--medium'
  return 'publicTrustPill publicTrustPill--low'
}

function reviewTrustLabel(score) {
  const tone = reviewTrustTone(score)
  if (tone === 'high') return 'High Trust'
  if (tone === 'medium') return 'Medium Trust'
  return 'Low Trust'
}

function TrustPillIcon() {
  return (
    <span className="publicTrustIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
        <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.7 11.8l2.1 2.1 4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function reviewScoreRingClass(score) {
  const tone = reviewTrustTone(score)
  if (tone === 'high') return 'reviewScoreRing reviewScoreRing--high'
  if (tone === 'medium') return 'reviewScoreRing reviewScoreRing--medium'
  return 'reviewScoreRing reviewScoreRing--low'
}

function clampReviewScore(score) {
  const n = Number(score || 0)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function formatReviewDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function roleTagMeta(tag) {
  if (tag === 'AI Verified') return { label: 'AI Verified', className: 'pill pill--ai', iconKind: 'ai' }
  if (tag === 'Blockchain Anchored' || tag === 'Blockchain Verified') {
    return { label: 'Blockchain Verified', className: 'pill pill--blockchain', iconKind: 'blockchain' }
  }
  if (tag === 'Payment Verified') return { label: 'Payment Verified', className: 'pill pill--payment', iconKind: 'payment' }
  if (tag === 'Delivered') return { label: 'Delivered', className: 'pill pill--delivered', iconKind: 'delivered' }
  return { label: tag, className: 'pill', iconKind: 'generic' }
}

function RoleTagIcon({ kind }) {
  if (kind === 'ai') {
    return (
      <span className="tagRoleIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <rect x="6" y="8" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M10 12h4M9 15h6M12 6V4M4 11h2M18 11h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'blockchain') {
    return (
      <span className="tagRoleIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M9.5 8.5l2.3-2.3a3.2 3.2 0 014.5 4.5l-2.2 2.2M14.5 15.5l-2.3 2.3a3.2 3.2 0 11-4.5-4.5l2.2-2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 15l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'payment') {
    return (
      <span className="tagRoleIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <rect x="3.5" y="6" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M3.5 10h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'delivered') {
    return (
      <span className="tagRoleIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M12 3l7 4-7 4-7-4 7-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M5 7v8l7 4 7-4V7M12 11v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  return (
    <span className="tagRoleIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    </span>
  )
}

function formatLocationText(location) {
  if (!location) return 'Location unavailable'
  const parts = [location.city, location.state, location.country || location.countryCode]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : 'Location unavailable'
}

export function PublicView({ vendors, defaultVendorId }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const vendorFromUrl = searchParams.get('vendor')
  const codeFromUrl = searchParams.get('code')

  const [vendorId, setVendorId] = useState(vendorFromUrl || defaultVendorId)
  const [profile, setProfile] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState(codeFromUrl ? 'verified' : 'anonymous')
  const [code, setCode] = useState(codeFromUrl || '')
  const [codeCheck, setCodeCheck] = useState({ checking: false, valid: null, order: null })

  const [text, setText] = useState('')
  const [notReceived, setNotReceived] = useState(false)
  const typingStartRef = useRef(null)
  const editCountRef = useRef(0)
  const firstInputRef = useRef(null)
  const lastLengthRef = useRef(0)
  const maxDeltaCharsRef = useRef(0)
  const lastInputTsRef = useRef(null)
  const intervalsRef = useRef([])

  const [submitState, setSubmitState] = useState({ submitting: false, result: null, warning: '' })

  const vendorOptions = useMemo(() => vendors || [], [vendors])

  useEffect(() => {
    if (!vendorId && defaultVendorId) setVendorId(defaultVendorId)
  }, [defaultVendorId, vendorId])

  useEffect(() => {
    if (!vendorId) return
    const next = new URLSearchParams(searchParams)
    next.set('vendor', vendorId)
    if (codeFromUrl) next.set('code', codeFromUrl)
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  async function refresh() {
    if (!vendorId) return
    try {
      setLoading(true)
      setError('')
      const [p, f] = await Promise.all([
        apiGet(`/api/public/vendor/${vendorId}`),
        apiGet(`/api/public/vendor/${vendorId}/feedbacks`),
      ])
      setProfile(p.vendor)
      setFeedbacks(f.feedbacks || [])
    } catch (e) {
      setError(e?.message || 'Failed to load vendor data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (mode !== 'verified' || !vendorId) return
      const c = code.trim()
      if (!c) {
        setCodeCheck({ checking: false, valid: null, order: null })
        return
      }
      try {
        setCodeCheck((s) => ({ ...s, checking: true }))
        const data = await apiGet(`/api/public/vendor/${vendorId}/verify-code/${encodeURIComponent(c)}`)
        if (cancelled) return
        setCodeCheck({ checking: false, valid: Boolean(data.valid), order: data.order || null })
      } catch {
        if (cancelled) return
        setCodeCheck({ checking: false, valid: false, order: null })
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [code, mode, vendorId])

  async function onSubmit(e) {
    e.preventDefault()
    if (!vendorId) return

    const trimmed = text.trim()
    if (!trimmed) {
      setSubmitState({ submitting: false, result: null, warning: 'Feedback text is required.' })
      return
    }

    try {
      setSubmitState({ submitting: true, result: null, warning: '' })

      const deviceHash = await getDeviceFingerprintHash()
      const sessionId = getOrCreateSessionId()
      const typingTimeMs = typingStartRef.current ? Date.now() - typingStartRef.current : 0
      const editCount = editCountRef.current
      const firstInputGapMs = firstInputRef.current ? Date.now() - firstInputRef.current : 0
      const maxDeltaChars = maxDeltaCharsRef.current
      const intervals = intervalsRef.current || []
      const typingIntervalsCount = intervals.length
      let typingIntervalMeanMs = 0
      let typingIntervalVarianceMs2 = 0

      if (typingIntervalsCount >= 2) {
        const sum = intervals.reduce((acc, v) => acc + v, 0)
        typingIntervalMeanMs = sum / typingIntervalsCount
        const varianceSum = intervals.reduce((acc, v) => acc + Math.pow(v - typingIntervalMeanMs, 2), 0)
        typingIntervalVarianceMs2 = varianceSum / typingIntervalsCount
      }

      const body = {
        text: trimmed,
        code: mode === 'verified' ? code.trim() : '',
        deviceHash,
        sessionId,
        behavior: {
          typingTimeMs,
          editCount,
          maxDeltaChars,
          firstInputGapMs,
          typingIntervalsCount,
          typingIntervalMeanMs,
          typingIntervalVarianceMs2,
        },
        notReceived,
      }

      const data = await apiPost(`/api/public/vendor/${vendorId}/feedbacks`, body)
      setSubmitState({
        submitting: false,
        result: data.result,
        warning: data.result?.code?.provided && !data.result?.code?.valid ? 'Code is invalid; treated as anonymous.' : '',
      })

      // Reset signals for next submission
      typingStartRef.current = null
      editCountRef.current = 0
      firstInputRef.current = null
      lastLengthRef.current = 0
      maxDeltaCharsRef.current = 0
      lastInputTsRef.current = null
      intervalsRef.current = []
      setText('')
      setNotReceived(false)
      await refresh()
    } catch (e2) {
      setSubmitState({ submitting: false, result: null, warning: e2?.message || 'Submit failed' })
    }
  }

  function onTextChange(next) {
    if (!typingStartRef.current) typingStartRef.current = Date.now()
    if (!firstInputRef.current) firstInputRef.current = Date.now()
    editCountRef.current += 1

    const now = Date.now()
    if (lastInputTsRef.current) {
      const delta = now - lastInputTsRef.current
      if (delta > 0 && delta <= 5000) {
        intervalsRef.current.push(delta)
        if (intervalsRef.current.length > 200) intervalsRef.current.shift()
      }
    }
    lastInputTsRef.current = now

    const prevLen = lastLengthRef.current || 0
    const delta = Math.abs((next || '').length - prevLen)
    if (delta > maxDeltaCharsRef.current) maxDeltaCharsRef.current = delta
    lastLengthRef.current = (next || '').length

    setText(next)
  }

  return (
    <div className="grid2">
      <section className="card">
        <div className="cardTitle">Vendor Public Profile (read-only)</div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label>Vendor</label>
          <select className="select" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            {vendorOptions.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name}{v.category ? ` — ${v.category}` : ''}
              </option>
            ))}
          </select>
        </div>

        {loading ? <div className="muted">Loading…</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        {profile ? (
          <div className="kvs">
            <div className="kv">
              <div className="k">Vendor Name</div>
              <div className="v">{profile.name}</div>
            </div>
            <div className="kv">
              <div className="k">Average Trust Score</div>
              <div className="v">{profile.averageTrustScore}</div>
            </div>
            <div className="kv">
              <div className="k">Total Feedbacks</div>
              <div className="v">{profile.totalFeedbacks}</div>
            </div>
            <div className="kv">
              <div className="k">Status Badge</div>
              <div className="v">{profile.statusBadge}</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="cardTitle">Submit Feedback (anonymous or optional code)</div>
        <div className="muted">
          Privacy by design: raw IP is never stored. The system keeps only a hashed IP plus coarse country/state/city metadata and behavior signals.
        </div>

        <div style={{ height: 10 }} />

        <form onSubmit={onSubmit} className="list">
          <div className="row">
            <div className="field">
              <label>Mode</label>
              <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="anonymous">Anonymous Feedback</option>
                <option value="verified">Verified Feedback (via code)</option>
              </select>
            </div>
            <div className="field">
              <label>Unique feedback/order code (optional)</label>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Example: TL-DEMO2026"
                disabled={mode !== 'verified'}
              />
              {mode === 'verified' ? (
                <div className="muted" style={{ marginTop: 4 }}>
                  {codeCheck.checking
                    ? 'Checking code…'
                    : codeCheck.valid === true
                      ? 'Code is valid: order details auto-filled.'
                      : codeCheck.valid === false
                        ? 'Code is invalid: you can still submit anonymously.'
                        : 'Enter code to verify.'}
                </div>
              ) : null}
            </div>
          </div>

          {mode === 'verified' && codeCheck.valid && codeCheck.order ? (
            <div className="card" style={{ background: '#fbfcff' }}>
              <div className="cardTitle">Auto-filled order details</div>
              <div className="kvs">
                <div className="kv">
                  <div className="k">Product</div>
                  <div className="v">{codeCheck.order.productDetails}</div>
                </div>
                <div className="kv">
                  <div className="k">Price</div>
                  <div className="v">₹{codeCheck.order.price}</div>
                </div>
                <div className="kv">
                  <div className="k">Payment</div>
                  <div className="v">{codeCheck.order.paymentStatus}</div>
                </div>
                <div className="kv">
                  <div className="k">Delivery</div>
                  <div className="v">{codeCheck.order.deliveryStatus}</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="field">
            <label>Feedback text</label>
            <textarea
              className="textarea"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Write honest feedback. No edit/delete after submission in this demo."
            />
          </div>

          <div className="field">
            <label>
              <input type="checkbox" checked={notReceived} onChange={(e) => setNotReceived(e.target.checked)} />{' '}
              Mark as “Not Received”
            </label>
          </div>

          {submitState.warning ? <div className="alert error">{submitState.warning}</div> : null}

          <button className="btn" type="submit" disabled={submitState.submitting}>
            {submitState.submitting ? 'Submitting…' : 'Submit feedback & compute trust score'}
          </button>
        </form>

        {submitState.result ? (
          <div style={{ marginTop: 12 }} className="card">
            <div className="cardTitle">Trust Result</div>
            <div className="kvs">
              <div className="kv">
                <div className="k">Trust Score</div>
                <div className="v">{submitState.result.trustScore}</div>
              </div>
              <div className="kv">
                <div className="k">Trust Level</div>
                <div className="v">{formatTrustLevel(submitState.result.trustLevel)}</div>
              </div>
              <div className="kv">
                <div className="k">Blockchain TX Ref</div>
                <div className="v">{submitState.result.blockchain?.txRef}</div>
              </div>
              <div className="kv">
                <div className="k">Anchored Hash</div>
                <div className="v">{submitState.result.blockchain?.hash?.slice(0, 12)}…</div>
              </div>
              <div className="kv">
                <div className="k">Detected Location</div>
                <div className="v">{formatLocationText(submitState.result.location)}</div>
              </div>
              <div className="kv">
                <div className="k">Location Risk</div>
                <div className="v">{submitState.result.ipRiskLevel || 'UNKNOWN'}</div>
              </div>
            </div>

            <div style={{ height: 10 }} />
            <FeedbackExplanation feedback={submitState.result} buttonLabel="Why this score and tags?" />
          </div>
        ) : null}
      </section>

      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="cardTitle">Public Reviews (read-only)</div>
        <div className="muted">Transparency over censorship: nothing can be edited or deleted in this demo.</div>

        <div style={{ height: 10 }} />
        <div className="list">
          {feedbacks.length === 0 ? <div className="muted">No feedbacks yet.</div> : null}
          {feedbacks.map((f) => {
            const score = clampReviewScore(f.trustScore)
            return (
              <div key={f._id} className="card publicReviewCard">
                <div className="publicReviewLayout">
                  <div className={reviewScoreRingClass(score)} style={{ '--ring-progress': `${score}%` }}>
                    <span className="reviewScoreRingValue">{score}</span>
                  </div>
                  <div className="publicReviewContent">
                    <div className="publicReviewMeta">
                      <span className={reviewTrustPillClass(score)}>
                        <TrustPillIcon />
                        <span>{reviewTrustLabel(score)}</span>
                      </span>
                      <span className="publicReviewDate">{formatReviewDate(f.createdAt)}</span>
                    </div>
                    <div className="publicReviewText">{f.text}</div>
                    <div className="pillRow reviewTags">
                      {(f.tags || []).map((t, idx) => {
                        const tagMeta = roleTagMeta(t)
                        return (
                          <span key={`${t}-${idx}`} className={tagMeta.className}>
                            <RoleTagIcon kind={tagMeta.iconKind} />
                            <span>{tagMeta.label}</span>
                          </span>
                        )
                      })}
                    </div>
                    <FeedbackExplanation feedback={f} buttonLabel="Why this score and explanation" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
