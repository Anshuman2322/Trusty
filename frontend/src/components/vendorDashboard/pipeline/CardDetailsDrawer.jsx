import { useEffect, useState } from 'react'
import './RecordDrawer.css'

const DELIVERY_STATUS_OPTIONS = [
  'not_started',
  'processing',
  'dispatched',
  'in_transit',
  'in_customs',
  'out_of_customs',
  'out_for_delivery',
  'delivered',
]

const PRIORITY_OPTIONS = ['high', 'medium', 'low']
const PAYMENT_OPTIONS = ['not_started', 'pending', 'paid']
const SENTIMENT_OPTIONS = ['', 'positive', 'neutral', 'negative']

function stageLabel(stageMap, stageKey) {
  const found = stageMap.find((stage) => stage.key === stageKey)
  return found ? found.label : stageKey
}

function localDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

function currency(value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return 'US$0.00'
  return `US$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function trustBadgeText(score) {
  const num = Number(score)
  if (!Number.isFinite(num)) return 'Trust N/A'
  return `Trust ${Math.round(num)}`
}

function stageTone(stage) {
  const key = String(stage || '').toLowerCase()
  if (['delivered', 'feedback_retention', 'payment_received'].includes(key)) return 'good'
  if (['payment_pending', 'invoice_sent', 'negotiation_follow_up', 'contacted'].includes(key)) return 'warn'
  return 'neutral'
}

function recordIdText(record) {
  const id = String(record?._id || '').trim()
  if (!id) return 'REC-0000'
  return `REC-${id.slice(-4).toUpperCase()}`
}

function companyName(record) {
  const explicit = String(record?.companyName || '').trim()
  if (explicit) return explicit
  const email = String(record?.email || '').trim()
  if (!email.includes('@')) return 'Customer organization'
  const domain = email.split('@')[1] || ''
  const raw = domain.split('.')[0] || 'Customer'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function nextStage(stageMap, current) {
  const index = stageMap.findIndex((item) => item.key === current)
  if (index < 0 || index >= stageMap.length - 1) return null
  return stageMap[index + 1]
}

function statusFromStage(stage) {
  if (['contacted', 'negotiation_follow_up', 'invoice_sent', 'payment_pending'].includes(stage)) return 'contacted'
  if (['payment_received', 'order_processing', 'shipped', 'delivered', 'feedback_retention'].includes(stage)) return 'converted'
  return 'new'
}

function relativeFollowUpText(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  const diffMs = Date.now() - date.getTime()
  const absHours = Math.floor(Math.abs(diffMs) / (60 * 60 * 1000))
  if (absHours < 1) return `${date.toLocaleString()} (just now)`
  const suffix = diffMs >= 0 ? 'ago' : 'from now'
  return `${date.toLocaleString()} (${absHours} hours ${suffix})`
}

function titleCaseWords(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatEventValue(field, value, stageMap) {
  if (value === null || value === undefined || value === '') return 'Not set'

  if (field === 'crmStage') return stageLabel(stageMap, String(value))
  if (field === 'deliveryStatus' || field === 'paymentStatus' || field === 'status') return titleCaseWords(String(value))
  if (field === 'followUpAt') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleString()
  }

  return String(value)
}

function deriveActivityEntry(item, stageMap) {
  const type = String(item?.type || '').toLowerCase()
  const field = String(item?.meta?.field || '')
  const fromText = formatEventValue(field, item?.meta?.from, stageMap)
  const toText = formatEventValue(field, item?.meta?.to, stageMap)

  if (type === 'field_update' && field) {
    if (field === 'crmStage') {
      return {
        title: 'Stage updated',
        detail: fromText === 'Not set' ? `Moved to ${toText}` : `${fromText} -> ${toText}`,
        tone: 'info',
      }
    }

    if (field === 'deliveryStatus') {
      return {
        title: 'Delivery updated',
        detail: fromText === 'Not set' ? toText : `${fromText} -> ${toText}`,
        tone: 'info',
      }
    }

    if (field === 'paymentStatus') {
      return {
        title: 'Payment status updated',
        detail: fromText === 'Not set' ? toText : `${fromText} -> ${toText}`,
        tone: 'warn',
      }
    }

    if (field === 'trackingRef') {
      return {
        title: 'Tracking updated',
        detail: toText,
        tone: 'info',
      }
    }

    if (field === 'status') {
      return {
        title: 'Lead status updated',
        detail: fromText === 'Not set' ? toText : `${fromText} -> ${toText}`,
        tone: 'neutral',
      }
    }

    return {
      title: `Updated ${titleCaseWords(field)}`,
      detail: fromText === 'Not set' ? toText : `${fromText} -> ${toText}`,
      tone: 'neutral',
    }
  }

  if (type === 'email_sent') {
    return {
      title: 'Email sent',
      detail: String(item?.meta?.subject || item?.message || 'Sent email update'),
      tone: 'info',
    }
  }

  if (type === 'note_added') {
    return {
      title: 'Note added',
      detail: 'A note was added to this record.',
      tone: 'good',
    }
  }

  if (type === 'soft_deleted') {
    return {
      title: 'Record archived',
      detail: 'Moved to archived leads.',
      tone: 'warn',
    }
  }

  if (type === 'unarchived') {
    return {
      title: 'Record restored',
      detail: 'Unarchived and returned to active leads.',
      tone: 'good',
    }
  }

  if (type === 'created') {
    return {
      title: 'Lead captured',
      detail: 'Lead created in CRM pipeline.',
      tone: 'good',
    }
  }

  return {
    title: String(item?.message || 'Activity update'),
    detail: field ? titleCaseWords(field) : '',
    tone: 'neutral',
  }
}

function actorLabel(item) {
  const type = String(item?.type || '').toLowerCase()
  if (type === 'note_added') return 'You'
  return 'System'
}

export function CardDetailsDrawer({
  open,
  record,
  stageMap,
  saving,
  onClose,
  onSave,
  onAddNote,
  onGeneratePitch,
  onSendEmail,
  onGenerateInvoice,
  onUpdatePayment,
  onUpdateDelivery,
  onAddTracking,
  onSoftDelete,
  onUnarchive,
}) {
  const [form, setForm] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!record) return
    setForm({
      name: record?.name || '',
      email: record?.email || '',
      phone: record?.phone || '',
      address: record?.address || '',
      country: record?.country || '',
      product: record?.product || '',
      date: record?.date ? new Date(record.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: record?.status || 'new',
      crmStage: record?.crmStage || 'new_lead',
      priority: record?.priority || 'medium',
      paymentStatus: record?.paymentStatus || 'not_started',
      deliveryStatus: record?.deliveryStatus || 'not_started',
      followUpAt: localDateTimeInput(record?.followUpAt),
      trustScore: record?.trustScore ?? '',
      sentiment: record?.sentiment || '',
      nextPurchaseProbability: record?.nextPurchaseProbability ?? '',
      trackingRef: record?.trackingRef || '',
    })
    setNoteText('')
    setEmailSubject(`Regarding your inquiry for ${record?.product || 'product'}`)
    setEmailBody(onGeneratePitch(record))
    setActiveTab('overview')
  }, [record, onGeneratePitch])

  if (!open || !record || !form) return null

  const notes = Array.isArray(record?.notes) ? [...record.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []
  const activity = Array.isArray(record?.activityLog) ? [...record.activityLog].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []
  const currentStageLabel = stageLabel(stageMap, form.crmStage)
  const upcomingStage = nextStage(stageMap, form.crmStage)
  const isArchived = Boolean(record?.deletedAt)

  async function handleAdvanceStage() {
    if (!upcomingStage) return
    await onSave(record, {
      ...form,
      crmStage: upcomingStage.key,
      status: statusFromStage(upcomingStage.key),
    })
  }

  function handleCall() {
    const phone = String(form.phone || '').trim()
    if (!phone) return
    window.open(`tel:${phone}`, '_self')
  }

  function handleWhatsApp() {
    const phone = String(form.phone || '').replace(/[^\d+]/g, '')
    if (!phone) return
    window.open(`https://wa.me/${phone.replace(/^\+/, '')}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="crmDrawerOverlay" role="presentation" onClick={onClose}>
      <aside className="crmDrawerPanel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="crmDrawerClose" onClick={onClose} aria-label="Close drawer">×</button>

        <div className="crmDrawerHeader">
          <div>
            <p className="crmDrawerRecordId">{recordIdText(record)}</p>
            <h3 className="crmDrawerName">{record.name || 'CRM Record'}</h3>
            <p className="crmDrawerCompany">{companyName(record)}</p>
          </div>
          <div className="crmDrawerAmountWrap">
            <div className="crmDrawerAmount">{currency(record?.orderAmount || 0)}</div>
            <div className="crmDrawerTrust">{trustBadgeText(form.trustScore)}</div>
          </div>
        </div>

        <div className="crmDrawerStageRow">
          <span className={`crmDrawerStageBadge is-${stageTone(form.crmStage)}`}>{currentStageLabel}</span>
          <button type="button" className="crmDrawerAdvanceBtn" disabled={!upcomingStage || saving} onClick={handleAdvanceStage}>
            {upcomingStage ? `Advance to ${upcomingStage.label}` : 'Final Stage'}
          </button>
        </div>

        <div className="crmDrawerTabs" role="tablist" aria-label="Record details tabs">
          <button type="button" className={activeTab === 'overview' ? 'is-active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
          <button type="button" className={activeTab === 'timeline' ? 'is-active' : ''} onClick={() => setActiveTab('timeline')}>Timeline</button>
          <button type="button" className={activeTab === 'actions' ? 'is-active' : ''} onClick={() => setActiveTab('actions')}>Actions</button>
          <button type="button" className={activeTab === 'feedback' ? 'is-active' : ''} onClick={() => setActiveTab('feedback')}>Feedback</button>
        </div>

        <div className="crmDrawerBody">
          {activeTab === 'overview' ? (
            <>
              <section className="crmDrawerSection">
                <h4 className="crmDrawerSectionTitle">Contact</h4>
                <div className="crmDrawerInfoGrid">
                  <div>
                    <span className="crmDrawerLabel">Email</span>
                    <p className="crmDrawerValue">{form.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="crmDrawerLabel">Phone</span>
                    <p className="crmDrawerValue">{form.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="crmDrawerLabel">Country</span>
                    <p className="crmDrawerValue">{form.country || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="crmDrawerLabel">Address</span>
                    <p className="crmDrawerValue">{form.address || 'N/A'}</p>
                  </div>
                </div>
              </section>

              <section className="crmDrawerSection">
                <h4 className="crmDrawerSectionTitle">Product</h4>
                <div className="crmDrawerInfoGrid">
                  <div>
                    <span className="crmDrawerLabel">Product</span>
                    <p className="crmDrawerValue">{form.product || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="crmDrawerLabel">Quantity</span>
                    <p className="crmDrawerValue">{record?.quantity || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="crmDrawerLabel">Unit Price</span>
                    <p className="crmDrawerValue">{currency(record?.unitPrice || 0)}</p>
                  </div>
                  <div>
                    <span className="crmDrawerLabel">Order #</span>
                    <p className="crmDrawerValue">{record?.orderNumber || 'N/A'}</p>
                  </div>
                </div>
              </section>

              <section className="crmDrawerSection">
                <h4 className="crmDrawerSectionTitle">Status</h4>
                <div className="crmDrawerStatusGrid">
                  <div className="crmDrawerStatusCard">
                    <span className="crmDrawerLabel">Payment</span>
                    <p className="crmDrawerValue">{titleCaseWords(form.paymentStatus)}</p>
                  </div>
                  <div className="crmDrawerStatusCard">
                    <span className="crmDrawerLabel">Delivery</span>
                    <p className="crmDrawerValue">{titleCaseWords(form.deliveryStatus)}</p>
                  </div>
                  <div className="crmDrawerStatusCard">
                    <span className="crmDrawerLabel">Trust Score</span>
                    <p className="crmDrawerValue">{Number(form.trustScore || 0)}/100</p>
                  </div>
                  <div className="crmDrawerStatusCard">
                    <span className="crmDrawerLabel">Follow-up</span>
                    <p className="crmDrawerValue">{relativeFollowUpText(form.followUpAt)}</p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeTab === 'timeline' ? (
            <>
              <section className="crmDrawerSection">
                <h4 className="crmDrawerSectionTitle">Notes</h4>
                <textarea
                  className="textarea"
                  rows={3}
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Add a note about this record..."
                />
                <div className="crmDrawerSectionActions">
                  <button
                    type="button"
                    className="btn"
                    disabled={saving}
                    onClick={() => {
                      onAddNote(record, noteText)
                      setNoteText('')
                    }}
                  >
                    Add Note
                  </button>
                </div>

                <div className="crmDrawerTimeline">
                  {notes.length === 0 ? <p className="crmDrawerEmpty">No notes yet.</p> : null}
                  {notes.map((note, index) => (
                    <article key={`${note.createdAt}-${index}`} className="crmDrawerTimelineItem">
                      <div className="crmDrawerTimelineHead">
                        <strong>{note?.createdBy || 'You'}</strong>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p>{note.text}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="crmDrawerSection">
                <h4 className="crmDrawerSectionTitle">Activity Timeline</h4>
                <div className="crmActivityTimeline">
                  {activity.length === 0 ? <p className="crmDrawerEmpty">No activity yet.</p> : null}
                  {activity.map((item, index) => {
                    const event = deriveActivityEntry(item, stageMap)
                    return (
                      <article key={`${item.createdAt}-${index}`} className="crmActivityItem">
                        <div className={`crmActivityIcon is-${event.tone}`} aria-hidden="true">•</div>
                        <div className="crmActivityContent">
                          <strong>{event.title}</strong>
                          {event.detail ? <p>{event.detail}</p> : null}
                          <span>{new Date(item.createdAt).toLocaleString()} · {actorLabel(item)}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            </>
          ) : null}

          {activeTab === 'actions' ? (
            <>
              <div className="crmDrawerActionGrid">
                <button type="button" className="crmDrawerActionBtn" disabled={saving} onClick={() => onSendEmail(record, emailSubject, emailBody)}>Email</button>
                <button type="button" className="crmDrawerActionBtn" onClick={handleCall}>Call</button>
                <button type="button" className="crmDrawerActionBtn" onClick={handleWhatsApp}>WhatsApp</button>
                <button type="button" className="crmDrawerActionBtn" disabled={saving} onClick={() => onGenerateInvoice(record)}>Generate Invoice</button>
                <button
                  type="button"
                  className="crmDrawerActionBtn"
                  disabled={saving}
                  onClick={() => onUpdatePayment(record, form.paymentStatus === 'paid' ? 'pending' : 'paid')}
                >
                  Mark Paid
                </button>
                <button type="button" className="crmDrawerActionBtn" disabled={saving} onClick={() => onAddTracking(record, form.trackingRef)}>Add Tracking</button>
              </div>

              <section className="crmDrawerSection crmDrawerSection--compact">
                <h4 className="crmDrawerSectionTitle">Record Controls</h4>
                <div className="crmDrawerControlGrid">
                  <label className="tw-space-y-1">
                    <span className="crmDrawerLabel">Pipeline Stage</span>
                    <select className="input" value={form.crmStage} onChange={(event) => setForm((prev) => ({ ...prev, crmStage: event.target.value }))}>
                      {stageMap.map((stage) => (
                        <option key={stage.key} value={stage.key}>{stage.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="tw-space-y-1">
                    <span className="crmDrawerLabel">Priority</span>
                    <select className="input" value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="tw-space-y-1">
                    <span className="crmDrawerLabel">Payment Status</span>
                    <select className="input" value={form.paymentStatus} onChange={(event) => setForm((prev) => ({ ...prev, paymentStatus: event.target.value }))}>
                      {PAYMENT_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="tw-space-y-1">
                    <span className="crmDrawerLabel">Delivery Status</span>
                    <select className="input" value={form.deliveryStatus} onChange={(event) => setForm((prev) => ({ ...prev, deliveryStatus: event.target.value }))}>
                      {DELIVERY_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="tw-space-y-1">
                    <span className="crmDrawerLabel">Tracking Reference</span>
                    <input className="input" value={form.trackingRef} onChange={(event) => setForm((prev) => ({ ...prev, trackingRef: event.target.value }))} />
                  </label>

                  <label className="tw-space-y-1">
                    <span className="crmDrawerLabel">Follow-up Date & Time</span>
                    <input className="input" type="datetime-local" value={form.followUpAt} onChange={(event) => setForm((prev) => ({ ...prev, followUpAt: event.target.value }))} />
                  </label>
                </div>

                <div className="crmDrawerSectionActions">
                  <button type="button" className="btn" disabled={saving} onClick={() => onSave(record, form)}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn secondary" disabled={saving} onClick={() => onUpdateDelivery(record, form.deliveryStatus, form.trackingRef)}>
                    Update Delivery
                  </button>
                  {isArchived ? (
                    <button type="button" className="btn secondary" disabled={saving} onClick={() => onUnarchive(record)}>
                      Unarchive
                    </button>
                  ) : (
                    <button type="button" className="btn secondary" disabled={saving} onClick={() => onSoftDelete(record)}>
                      Archive
                    </button>
                  )}
                </div>
              </section>
            </>
          ) : null}

          {activeTab === 'feedback' ? (
            <section className="crmDrawerSection">
              <h4 className="crmDrawerSectionTitle">Feedback Insights</h4>
              <div className="crmDrawerControlGrid">
                <label className="tw-space-y-1">
                  <span className="crmDrawerLabel">Trust Score</span>
                  <input className="input" type="number" min="0" max="100" value={form.trustScore} onChange={(event) => setForm((prev) => ({ ...prev, trustScore: event.target.value }))} />
                </label>

                <label className="tw-space-y-1">
                  <span className="crmDrawerLabel">Sentiment</span>
                  <select className="input" value={form.sentiment} onChange={(event) => setForm((prev) => ({ ...prev, sentiment: event.target.value }))}>
                    {SENTIMENT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option || 'none'}</option>
                    ))}
                  </select>
                </label>

                <label className="tw-space-y-1">
                  <span className="crmDrawerLabel">Next Purchase Probability (%)</span>
                  <input className="input" type="number" min="0" max="100" value={form.nextPurchaseProbability} onChange={(event) => setForm((prev) => ({ ...prev, nextPurchaseProbability: event.target.value }))} />
                </label>
              </div>

              <div className="crmDrawerSectionActions">
                <button type="button" className="btn" disabled={saving} onClick={() => onSave(record, form)}>
                  {saving ? 'Saving...' : 'Save Feedback Fields'}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
