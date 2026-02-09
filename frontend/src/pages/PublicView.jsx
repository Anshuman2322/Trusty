import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { getDeviceFingerprintHash, getOrCreateSessionId } from '../lib/device'

function formatTrustLevel(level) {
  if (!level) return '—'
  return level.charAt(0) + level.slice(1).toLowerCase()
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

      const body = {
        text: trimmed,
        code: mode === 'verified' ? code.trim() : '',
        deviceHash,
        sessionId,
        behavior: { typingTimeMs, editCount, maxDeltaChars, firstInputGapMs },
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
          Privacy by design: no IP/GPS/identity stored. Only a hashed device fingerprint + behavior signals.
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
            </div>

            <div style={{ height: 10 }} />
            <div className="cardTitle">Trust breakdown (explainable)</div>
            <div className="list">
              {(() => {
                const r = submitState.result || {}
                const legacy = Array.isArray(r.trustBreakdown) ? r.trustBreakdown : Array.isArray(r.trustBreakdownList) ? r.trustBreakdownList : []
                const obj = r.trustBreakdown && !Array.isArray(r.trustBreakdown) ? r.trustBreakdown : null

                if (obj) {
                  const rows = [
                    { label: 'Token Verification', v: obj.tokenVerification },
                    { label: 'Payment Proof', v: obj.paymentProof },
                    { label: 'AI Behavior Score', v: obj.aiBehavior },
                    { label: 'Device Pattern Score', v: obj.devicePattern },
                    { label: 'Context Depth Score', v: obj.contextDepth },
                  ]
                  return rows.map((row) => (
                    <div key={row.label} className="kv">
                      <div>
                        <div className="k">{row.label}</div>
                        <div className="muted">{row.v?.explanation}</div>
                      </div>
                      <div className="v">
                        {row.v?.score}/{row.v?.maxScore}
                      </div>
                    </div>
                  ))
                }

                return legacy.map((b, idx) => (
                  <div key={idx} className="kv">
                    <div>
                      <div className="k">{b.signal}</div>
                      <div className="muted">{b.reason}</div>
                    </div>
                    <div className="v">{b.points}</div>
                  </div>
                ))
              })()}
            </div>

            <div style={{ height: 10 }} />
            <div className="cardTitle">Explanation</div>
            <div className="muted">{submitState.result.explanation}</div>
          </div>
        ) : null}
      </section>

      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="cardTitle">Public Reviews (read-only)</div>
        <div className="muted">Transparency over censorship: nothing can be edited or deleted in this demo.</div>

        <div style={{ height: 10 }} />
        <div className="list">
          {feedbacks.length === 0 ? <div className="muted">No feedbacks yet.</div> : null}
          {feedbacks.map((f) => (
            <div key={f._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div className="badge">Trust Score: {f.trustScore}</div>
                <div className="badge">Trust Level: {formatTrustLevel(f.trustLevel)}</div>
              </div>
              <div style={{ height: 8 }} />
              <div>{f.text}</div>
              <div style={{ height: 8 }} />
              <div className="pillRow">
                {(f.tags || []).map((t) => (
                  <span key={t} className="pill">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
