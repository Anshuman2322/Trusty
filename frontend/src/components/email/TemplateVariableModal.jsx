import { useEffect, useMemo, useRef, useState } from 'react'
import { extractVariables, renderTemplate } from '../../crm/templateVariables'
import { apiGet, apiPut } from '../../lib/api'
import './TemplateVariableModal.css'

function humanizeVariable(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function TemplateVariableModal({
  open,
  title = 'Edit & Complete Email Details',
  templateSubject = '',
  templateBody = '',
  autoData = {},
  clientKey = '',
  onClose,
  onSend,
}) {
  const fieldRefs = useRef({})
  const previewRef = useRef(null)
  const didAutoFocus = useRef(false)
  const dirtyRef = useRef(false)
  const initializedKeyRef = useRef('')
  const cacheRef = useRef({})
  const templateVariables = useMemo(
    () => extractVariables([templateSubject, templateBody].filter(Boolean).join('\n')),
    [templateSubject, templateBody],
  )

  const [formData, setFormData] = useState({})
  const [savedData, setSavedData] = useState(null)
  const [savedReady, setSavedReady] = useState(false)

  function readLocalStore() {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(window.localStorage.getItem('trusty.client-email-data.v1') || '{}')
    } catch {
      return {}
    }
  }

  function writeLocalStore(next) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trusty.client-email-data.v1', JSON.stringify(next))
  }

  function mergeVariableData(saved, auto) {
    const nextData = {}
    const keySet = new Set([
      ...Object.keys(saved || {}),
      ...Object.keys(auto || {}),
      ...templateVariables,
    ])

    for (const key of keySet) {
      const savedValue = saved?.[key]
      const autoValue = auto?.[key]
      const resolved = savedValue !== undefined && savedValue !== null && String(savedValue).trim()
        ? savedValue
        : autoValue !== undefined && autoValue !== null
          ? autoValue
          : ''
      nextData[key] = String(resolved)
    }
    return nextData
  }

  async function fetchSavedData(nextClientKey) {
    if (!nextClientKey) {
      setSavedData(null)
      setSavedReady(true)
      return
    }

    const localCache = readLocalStore()
    if (localCache[nextClientKey]?.data) {
      cacheRef.current[nextClientKey] = localCache[nextClientKey].data
      setSavedData(localCache[nextClientKey].data)
      setSavedReady(true)
    }

    try {
      const result = await apiGet(`/api/client-email-data/${encodeURIComponent(nextClientKey)}`)
      const data = result?.data?.data || null
      if (data && typeof data === 'object') {
        cacheRef.current[nextClientKey] = data
        localCache[nextClientKey] = { data, updatedAt: new Date().toISOString() }
        writeLocalStore(localCache)
        setSavedData(data)
      }
    } catch {
      // fallback uses local storage only
    } finally {
      setSavedReady(true)
    }
  }

  useEffect(() => {
    if (!open) return
    setSavedReady(false)
    fetchSavedData(String(clientKey || '').trim())
    dirtyRef.current = false
    initializedKeyRef.current = ''
    didAutoFocus.current = false
  }, [open, clientKey])

  useEffect(() => {
    if (!open) return
    if (!savedReady) return
    if (dirtyRef.current) return

    const resolvedKey = String(clientKey || '').trim() || '__no_client__'
    if (initializedKeyRef.current === resolvedKey) return

    const nextData = mergeVariableData(savedData, autoData)
    setFormData(nextData)
    initializedKeyRef.current = resolvedKey
    didAutoFocus.current = false
  }, [open, savedReady, savedData, autoData, clientKey, templateVariables])

  const allKeys = useMemo(
    () => Object.keys(formData || {}).sort((a, b) => a.localeCompare(b)),
    [formData],
  )

  const missingVariables = useMemo(
    () => allKeys.filter((key) => !String(formData?.[key] || '').trim()),
    [allKeys, formData],
  )

  const previewSubject = useMemo(
    () => renderTemplate(templateSubject, formData),
    [templateSubject, formData],
  )

  const previewBody = useMemo(
    () => renderTemplate(templateBody, formData),
    [templateBody, formData],
  )

  const groupedVariables = useMemo(() => {
    const groups = {
      'Client Info': [],
      'Order Details': [],
      'Shipping Info': [],
      'Payment Info': [],
      'Tracking Info': [],
      'System Info': [],
    }

    const matchers = [
      {
        name: 'Client Info',
        test: (key) => /(name|first_name|firstname|last_name|lastname|email|phone|company|client|buyer|customer)/.test(key),
      },
      {
        name: 'Order Details',
        test: (key) => /(product|item|sku|dosage|quantity|qty|order_id|orderid)/.test(key),
      },
      {
        name: 'Shipping Info',
        test: (key) => /(address|city|state|zip|postal|country|shipping|delivery|expected|eta)/.test(key),
      },
      {
        name: 'Payment Info',
        test: (key) => /(payment|paid|invoice|price|amount|total|currency)/.test(key),
      },
      {
        name: 'Tracking Info',
        test: (key) => /(tracking|track|awb|courier|carrier)/.test(key),
      },
    ]

    for (const key of allKeys) {
      const normalized = String(key || '').toLowerCase()
      const match = matchers.find((group) => group.test(normalized))
      const bucket = match ? match.name : 'System Info'
      groups[bucket].push(key)
    }

    return Object.entries(groups)
      .filter(([, keys]) => keys.length > 0)
      .map(([label, keys]) => ({ label, keys }))
  }, [allKeys])

  useEffect(() => {
    if (!open) return
    if (didAutoFocus.current) return

    const firstMissing = missingVariables[0]
    const target = firstMissing ? fieldRefs.current[firstMissing] : null
    if (target?.focus) {
      target.focus()
      didAutoFocus.current = true
    }
  }, [open, missingVariables])

  async function persistClientData(nextData) {
    const resolvedKey = String(clientKey || '').trim()
    if (!resolvedKey) return

    const payload = { clientKey: resolvedKey, data: nextData }
    const localCache = readLocalStore()

    try {
      const result = await apiPut('/api/client-email-data', payload)
      const data = result?.data?.data || payload.data
      cacheRef.current[resolvedKey] = data
      localCache[resolvedKey] = { data, updatedAt: new Date().toISOString() }
      writeLocalStore(localCache)
    } catch {
      cacheRef.current[resolvedKey] = payload.data
      localCache[resolvedKey] = { data: payload.data, updatedAt: new Date().toISOString() }
      writeLocalStore(localCache)
    }
  }

  if (!open) return null

  const hasMissing = missingVariables.length > 0

  return (
    <div className="tvmOverlay" role="presentation" onClick={onClose}>
      <div
        className="tvmCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tvm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="tvmHeader">
          <div>
            <p className="tvmOverline">Smart Variable Validation</p>
            <h3 id="tvm-title">{title}</h3>
            <p className="tvmSubtitle">{hasMissing ? `${missingVariables.length} field${missingVariables.length === 1 ? '' : 's'} missing` : 'All fields complete'}</p>
          </div>
          <button type="button" className="tvmClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="tvmBody">
          <section className="tvmPanel tvmFormPanel">
            <div className="tvmPanelHead">
              <div>
                <h4>Fields</h4>
                <p>Review, edit, and complete every field before sending.</p>
              </div>
              <span className="tvmFieldCount">{allKeys.length} fields</span>
            </div>

            <div className="tvmFormScroll">
              {groupedVariables.map((group) => (
                <div key={group.label} className="tvmGroup">
                  <div className="tvmGroupHead">
                    <h5>{group.label}</h5>
                    <span>{group.keys.length} fields</span>
                  </div>
                  <div className="tvmFieldGrid">
                    {group.keys.map((key) => {
                      const value = formData?.[key] || ''
                      const isMissing = !String(value).trim()
                      const autoValue = autoData?.[key] === undefined || autoData?.[key] === null ? '' : String(autoData[key])
                      const isAuto = Boolean(String(autoValue || '').trim()) && String(value) === String(autoValue)
                      return (
                        <label key={key} className={`tvmField ${isMissing ? 'is-missing' : ''}`}>
                          <div className="tvmFieldHead">
                            <span>{humanizeVariable(key)}</span>
                            <div className="tvmFieldTags">
                              {isMissing ? <span className="tvmTag tvmTagMissing">Missing</span> : null}
                              {!isMissing && isAuto ? <span className="tvmTag">Auto</span> : null}
                            </div>
                          </div>
                          <input
                            ref={(node) => {
                              if (node) fieldRefs.current[key] = node
                            }}
                            value={value}
                            placeholder={isMissing ? 'Required' : 'Enter value'}
                            onChange={(event) =>
                              setFormData((prev) => {
                                dirtyRef.current = true
                                return {
                                  ...prev,
                                  [key]: event.target.value,
                                }
                              })
                            }
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {hasMissing ? (
              <div className="tvmAlert">{missingVariables.length} field{missingVariables.length === 1 ? '' : 's'} still missing.</div>
            ) : null}
          </section>

          <section ref={previewRef} className="tvmPanel tvmPreview">
            <div className="tvmPanelHead">
              <div>
                <h4>Preview</h4>
                <p>Final message after variable replacement.</p>
              </div>
            </div>

            {templateSubject ? (
              <div className="tvmPreviewBlock">
                <p className="tvmPreviewLabel">Subject</p>
                <div className="tvmPreviewBox">{previewSubject || '(empty subject)'}</div>
              </div>
            ) : null}

            <div className="tvmPreviewBlock">
              <p className="tvmPreviewLabel">Body</p>
              <pre className="tvmPreviewBox tvmPreviewBody">{previewBody || '(empty body)'}</pre>
            </div>
          </section>
        </div>

        <footer className="tvmFooter">
          <button type="button" className="tvmGhostBtn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="tvmGhostBtn"
            onClick={() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Preview
          </button>
          <button
            type="button"
            className="tvmPrimaryBtn"
            disabled={hasMissing}
            onClick={async () => {
              await persistClientData(formData)
              await onSend(previewSubject, previewBody, formData)
            }}
          >
            Send Email
          </button>
        </footer>
      </div>
    </div>
  )
}
