import { useEffect, useMemo, useState } from 'react'
import './RecordDrawer.css'
import { TemplateVariableModal } from '../../email/TemplateVariableModal'

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

function safeDateInput(value) {
  if (!value) return new Date().toISOString().slice(0, 10)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
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

function buildAutoTemplateData(record, form) {
  const name = String(form?.name || record?.name || '').trim()
  const firstName = name.split(' ')[0] || ''
  const product = String(form?.product || record?.product || '').trim()
  const quantity = record?.quantity ?? ''
  const orderAmount = record?.orderAmount ?? ''
  const trackingLink = record?.trackingRef || form?.trackingRef || ''

  return {
    name,
    firstName,
    email: String(form?.email || record?.email || '').trim(),
    phone: String(form?.phone || record?.phone || '').trim(),
    address: String(form?.address || record?.address || '').trim(),
    country: String(form?.country || record?.country || '').trim(),
    product,
    dosage: record?.dosage || '',
    quantity,
    price: record?.price ?? '',
    total_amount: orderAmount,
    payment_link: record?.paymentLink || '',
    tracking_link: trackingLink,
    trackingRef: trackingLink,
    order_id: record?._id || '',
    company: companyName(record),
    rep_name: record?.vendorName || '',
    date: new Date().toISOString().slice(0, 10),
  }
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

function supportsMonetaryStage(stage) {
  const key = String(stage || '').toLowerCase()
  return [
    'invoice_sent',
    'payment_pending',
    'payment_received',
    'order_processing',
    'shipped',
    'delivered',
    'feedback_retention',
  ].includes(key)
}

function supportsTopTrustStage(stage) {
  return String(stage || '').toLowerCase() === 'feedback_retention'
}

function supportsPitchModalStage(stage) {
  const key = String(stage || '').toLowerCase()
  return ['new_lead', 'contacted', 'negotiation_follow_up'].includes(key)
}

function buildClientPitches(record, aiSeed = '') {
  const name = String(record?.name || 'there').trim()
  const product = String(record?.product || 'the requested product').trim()
  const country = String(record?.country || 'your location').trim()
  const company = companyName(record)

  const emailSubject = `Quick update on ${product} for ${name}`
  const emailBody = [
    `Hi ${name},`,
    '',
    `Thanks again for your interest in ${product}. We can support delivery to ${country} and share a clear quote with timeline options based on your preferred quantity.`,
    '',
    `If helpful, we can send a same-day proposal with:`,
    '- pricing options',
    '- expected delivery window',
    '- quality and handling notes',
    '',
    'Reply with your required quantity and target delivery date, and we will prepare it right away.',
    '',
    `Best regards,`,
    `${company} Team`,
  ].join('\n')

  const smsBody = `Hi ${name}, this is ${company}. Thanks for your interest in ${product}. We can deliver to ${country}. Share your required quantity and preferred delivery date, and I will send pricing + timeline today.`

  const seed = String(aiSeed || '').trim()
  return {
    emailSubject,
    emailBody: seed || emailBody,
    smsBody,
  }
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

function DrawerIcon({ name, className = 'crmDrawerIcon' }) {
  if (name === 'email') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 7l7.5 5.7L19.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'phone' || name === 'call') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M6.5 4.8l2.1 2.8a1.8 1.8 0 01.2 1.9L8 11a12.8 12.8 0 005 5l1.5-.8a1.8 1.8 0 011.9.2l2.8 2.1a1.8 1.8 0 01.3 2.5l-1.1 1.5a2.6 2.6 0 01-2.6 1.1C9.8 21.5 2.5 14.2 1.4 8.3a2.6 2.6 0 011.1-2.6L4 4.5a1.8 1.8 0 012.5.3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M20 15.8a3 3 0 01-3 3H9l-4 2.8V6.8a3 3 0 013-3h9a3 3 0 013 3v9z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'invoice') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M7 3.5h7l4 4V20a1 1 0 01-1 1H7a1 1 0 01-1-1v-15a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M14 3.5V8h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 13h6M9 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'paid') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3.5" y="6.5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    )
  }

  if (name === 'tracking') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M3.5 8.5h10v7h-10zM13.5 11.5h3l2 2v2h-5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }

  if (name === 'country') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.8 12h16.4M12 3.8c2.4 2.3 3.8 5.1 3.8 8.2S14.4 18 12 20.2C9.6 18 8.2 15.2 8.2 12S9.6 6 12 3.8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'address') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 21s6-5.1 6-10a6 6 0 10-12 0c0 4.9 6 10 6 10z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }

  if (name === 'product') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M4.5 7.5l7.5-4 7.5 4-7.5 4-7.5-4zM4.5 7.5V16.5l7.5 4 7.5-4V7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'quantity') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'followUp') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 3.5v4M16 3.5v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'building') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M4 20.5h16M5.5 20.5v-12h7v12M12.5 20.5v-9h6v9M8 5.5h2M8 9h2M8 12.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return null
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
  const [smsBody, setSmsBody] = useState('')
  const [pitchModalOpen, setPitchModalOpen] = useState(false)
  const [showTextMessageFormat, setShowTextMessageFormat] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateModalPayload, setTemplateModalPayload] = useState({ subject: '', body: '' })
  const autoTemplateData = useMemo(
    () => buildAutoTemplateData(record, form),
    [record, form],
  )

  useEffect(() => {
    if (!record) return
    setForm({
      name: String(record?.name || ''),
      email: String(record?.email || ''),
      phone: String(record?.phone || ''),
      address: String(record?.address || ''),
      country: String(record?.country || ''),
      product: String(record?.product || ''),
      date: safeDateInput(record?.date),
      status: record?.status || 'new',
      crmStage: record?.crmStage || 'new_lead',
      priority: record?.priority || 'medium',
      paymentStatus: record?.paymentStatus || 'not_started',
      deliveryStatus: record?.deliveryStatus || 'not_started',
      followUpAt: localDateTimeInput(record?.followUpAt),
      trustScore: record?.trustScore ?? '',
      sentiment: record?.sentiment || '',
      nextPurchaseProbability: record?.nextPurchaseProbability ?? '',
      trackingRef: String(record?.trackingRef || ''),
    })
    setNoteText('')
    const seed = onGeneratePitch(record)
    const pitches = buildClientPitches(record, seed)
    setEmailSubject(pitches.emailSubject)
    setEmailBody(pitches.emailBody)
    setSmsBody(pitches.smsBody)
    setPitchModalOpen(false)
    setShowTextMessageFormat(false)
  }, [record, onGeneratePitch])

  if (!open || !record || !form) return null

  const notes = Array.isArray(record?.notes) ? [...record.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []
  const activity = Array.isArray(record?.activityLog) ? [...record.activityLog].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []
  const currentStageLabel = stageLabel(stageMap, form.crmStage)
  const upcomingStage = nextStage(stageMap, form.crmStage)
  const isArchived = Boolean(record?.deletedAt)
  const showMonetaryControls = supportsMonetaryStage(form.crmStage)
  const showTopTrust = supportsTopTrustStage(form.crmStage)
  const showPitchComposerAction = supportsPitchModalStage(form.crmStage)

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
    const text = encodeURIComponent(String(smsBody || '').trim())
    window.open(`https://wa.me/${phone.replace(/^\+/, '')}${text ? `?text=${text}` : ''}`, '_blank', 'noopener,noreferrer')
  }

  function handleGeneratePitch() {
    const snapshot = { ...record, ...form }
    const seed = onGeneratePitch(snapshot)
    const pitches = buildClientPitches(snapshot, seed)
    setEmailSubject(pitches.emailSubject)
    setEmailBody(pitches.emailBody)
    setSmsBody(pitches.smsBody)
  }

  function handleOpenPitchModal() {
    handleGeneratePitch()
    setPitchModalOpen(true)
    setShowTextMessageFormat(true)
  }

  function handleOpenEmailModal() {
    setPitchModalOpen(true)
    setShowTextMessageFormat(false)
  }

  function handleOpenEmailComposer() {
    const subject = encodeURIComponent(String(emailSubject || '').trim())
    const body = encodeURIComponent(String(emailBody || '').trim())
    window.open(`mailto:${encodeURIComponent(String(form.email || ''))}?subject=${subject}&body=${body}`, '_self')
  }

  function handleOpenTemplateModal() {
    setTemplateModalPayload({ subject: emailSubject, body: emailBody })
    setTemplateModalOpen(true)
  }

  async function copyToClipboard(textInput) {
    const text = String(textInput || '').trim()
    if (!text) return

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
    } catch {
      // Fallback path for browsers/environments where clipboard API fails.
    }

    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', 'true')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
  }

  return (
    <div className="crmDrawerOverlay" role="presentation" onClick={onClose}>
      <aside className="crmDrawerPanel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="crmDrawerClose" onClick={onClose} aria-label="Close drawer">×</button>

        <div className="crmDrawerHeader">
          <div>
            <p className="crmDrawerRecordId">{recordIdText(record)}</p>
            <h3 className="crmDrawerName">{String(record?.name || 'CRM Record')}</h3>
            <p className="crmDrawerCompany"><DrawerIcon name="building" className="crmDrawerCompanyIcon" />{companyName(record)}</p>
          </div>
          {showMonetaryControls || showTopTrust ? (
            <div className="crmDrawerAmountWrap">
              {showMonetaryControls ? <div className="crmDrawerAmount">{currency(record?.orderAmount || 0)}</div> : null}
              {showTopTrust ? <div className="crmDrawerTrust">{trustBadgeText(form.trustScore)}</div> : null}
            </div>
          ) : null}
        </div>

        <div className="crmDrawerStageRow">
          <span className={`crmDrawerStageBadge is-${stageTone(form.crmStage)}`}>{currentStageLabel}</span>
          <button type="button" className="crmDrawerAdvanceBtn" disabled={!upcomingStage || saving} onClick={handleAdvanceStage}>
            {upcomingStage ? `Advance to ${upcomingStage.label}` : 'Final Stage'}
          </button>
        </div>

        <div className="crmDrawerBody">
          <div className="crmDrawerActionGrid">
            {showPitchComposerAction ? (
              <button type="button" className="crmDrawerActionBtn" disabled={saving} onClick={handleOpenPitchModal}><DrawerIcon name="email" className="crmDrawerActionBtnIcon" />Generate Pitch</button>
            ) : (
              <button type="button" className="crmDrawerActionBtn" disabled={saving} onClick={handleOpenEmailModal}><DrawerIcon name="email" className="crmDrawerActionBtnIcon" />Email</button>
            )}
            <button type="button" className="crmDrawerActionBtn" onClick={handleCall}><DrawerIcon name="call" className="crmDrawerActionBtnIcon" />Call</button>
            <button type="button" className="crmDrawerActionBtn" onClick={handleWhatsApp}><DrawerIcon name="whatsapp" className="crmDrawerActionBtnIcon" />WhatsApp</button>
            <button type="button" className="crmDrawerActionBtn" disabled={saving} onClick={() => onGenerateInvoice(record)}><DrawerIcon name="invoice" className="crmDrawerActionBtnIcon" />Generate Invoice</button>
            <button
              type="button"
              className="crmDrawerActionBtn"
              disabled={saving || !showMonetaryControls}
              onClick={() => onUpdatePayment(record, form.paymentStatus === 'paid' ? 'pending' : 'paid')}
            >
              <DrawerIcon name="paid" className="crmDrawerActionBtnIcon" />
              Mark Paid
            </button>
            <button
              type="button"
              className="crmDrawerActionBtn"
              disabled={saving || !showMonetaryControls}
              onClick={() => onAddTracking(record, form.trackingRef)}
            >
              <DrawerIcon name="tracking" className="crmDrawerActionBtnIcon" />
              Add Tracking
            </button>
          </div>

          <section className="crmDrawerSection">
            <h4 className="crmDrawerSectionTitle">Contact & Order</h4>
            <div className="crmDrawerInfoGrid">
              <div>
                <span className="crmDrawerLabel crmDrawerLabelRow"><DrawerIcon name="email" className="crmDrawerLabelIcon" />Email</span>
                <p className="crmDrawerValue crmDrawerValue--underLabel">{form.email || 'N/A'}</p>
              </div>
              <div>
                <span className="crmDrawerLabel crmDrawerLabelRow"><DrawerIcon name="phone" className="crmDrawerLabelIcon" />Phone</span>
                <p className="crmDrawerValue crmDrawerValue--underLabel">{form.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="crmDrawerLabel crmDrawerLabelRow"><DrawerIcon name="country" className="crmDrawerLabelIcon" />Country</span>
                <p className="crmDrawerValue crmDrawerValue--underLabel">{form.country || 'N/A'}</p>
              </div>
              <div>
                <span className="crmDrawerLabel crmDrawerLabelRow"><DrawerIcon name="address" className="crmDrawerLabelIcon" />Address</span>
                <p className="crmDrawerValue crmDrawerValue--underLabel">{form.address || 'N/A'}</p>
              </div>
              <div>
                <span className="crmDrawerLabel crmDrawerLabelRow"><DrawerIcon name="product" className="crmDrawerLabelIcon" />Product</span>
                <p className="crmDrawerValue crmDrawerValue--underLabel">{form.product || 'N/A'}</p>
              </div>
              <div>
                <span className="crmDrawerLabel crmDrawerLabelRow"><DrawerIcon name="quantity" className="crmDrawerLabelIcon" />Quantity</span>
                <p className="crmDrawerValue crmDrawerValue--underLabel">{String(record?.quantity || 'N/A')}</p>
              </div>
              <div className="crmDrawerInfoWide">
                <span className="crmDrawerLabel crmDrawerLabelRow"><DrawerIcon name="followUp" className="crmDrawerLabelIcon" />Follow-up</span>
                <p className="crmDrawerValue crmDrawerValue--underLabel">{relativeFollowUpText(form.followUpAt)}</p>
              </div>
            </div>
          </section>

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
        </div>

      </aside>

      {pitchModalOpen ? (
        <div
          className="crmPitchModalOverlay"
          role="presentation"
          onClick={(event) => {
            event.stopPropagation()
            setPitchModalOpen(false)
          }}
        >
          <div className="crmPitchModalCard" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="crmPitchModalHead">
              <div>
                <h3>Email Pitch Generator</h3>
                <p>Dynamic pitch for {String(record?.name || 'lead')}.</p>
              </div>
              <button type="button" className="btn secondary" onClick={() => setPitchModalOpen(false)}>Close</button>
            </div>

            <textarea
              className="textarea"
              rows={10}
              value={emailBody}
              onChange={(event) => setEmailBody(event.target.value)}
            />

            {showTextMessageFormat ? (
              <div>
                <p className="crmPitchModalTextLabel">Text Message Format</p>
                <textarea
                  className="textarea"
                  rows={4}
                  value={smsBody}
                  onChange={(event) => setSmsBody(event.target.value)}
                />
              </div>
            ) : null}

            <div className="crmPitchModalActions">
              <button type="button" className="btn secondary" onClick={() => copyToClipboard(emailBody)}>Copy</button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowTextMessageFormat((prev) => !prev)}
              >
                Text Message Format
              </button>
              {showTextMessageFormat ? (
                <button type="button" className="btn secondary" onClick={() => copyToClipboard(smsBody)}>Copy Text Message</button>
              ) : null}
              <button type="button" className="btn secondary" onClick={handleOpenEmailComposer}>Open Email Composer</button>
              <button
                type="button"
                className="btn"
                disabled={saving || !String(emailBody || '').trim()}
                onClick={handleOpenTemplateModal}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TemplateVariableModal
        open={templateModalOpen}
        templateSubject={templateModalPayload.subject}
        templateBody={templateModalPayload.body}
        autoData={autoTemplateData}
        clientKey={String(form?.email || record?.email || record?._id || '').trim()}
        onClose={() => setTemplateModalOpen(false)}
        onSend={async (finalSubject, finalBody) => {
          await onSendEmail(record, finalSubject, finalBody)
          setTemplateModalOpen(false)
        }}
      />
    </div>
  )
}
