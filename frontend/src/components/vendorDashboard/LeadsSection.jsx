import { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api'

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE_REGEX = /(?:\+?\d[\d()\-.\s]{6,}\d)/
const DATE_REGEX = /\d{4}-\d{2}-\d{2}/

const COUNTRY_OPTIONS = [
  'United States',
  'India',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Singapore',
  'United Arab Emirates',
]

const COUNTRY_ALIASES = [
  { label: 'United States', aliases: ['United States', 'USA', 'US'] },
  { label: 'United Kingdom', aliases: ['United Kingdom', 'UK', 'Great Britain'] },
  { label: 'United Arab Emirates', aliases: ['United Arab Emirates', 'UAE'] },
  { label: 'India', aliases: ['India'] },
  { label: 'Canada', aliases: ['Canada'] },
  { label: 'Australia', aliases: ['Australia'] },
  { label: 'Germany', aliases: ['Germany'] },
  { label: 'France', aliases: ['France'] },
  { label: 'Singapore', aliases: ['Singapore'] },
]

const PRODUCT_HINT_WORDS = new Set([
  'mg',
  'mcg',
  'g',
  'ml',
  'tablet',
  'tablets',
  'capsule',
  'capsules',
  'syrup',
  'injection',
  'cream',
  'ointment',
  'powder',
  'pack',
  'dose',
  'dosage',
  'pain',
])

function isLikelyMedicineProduct(value) {
  const text = normalizeWhitespace(value)
  if (!text) return false

  const lowered = text.toLowerCase()
  if (detectCountry(text).country && lowered.split(' ').length <= 3) {
    return false
  }

  if (/\b\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?\s?(mg|mcg|g|ml)\b/i.test(text)) {
    return true
  }

  for (const hint of PRODUCT_HINT_WORDS) {
    const pattern = new RegExp(`\\b${escapeRegExp(hint)}\\b`, 'i')
    if (pattern.test(text)) return true
  }

  return false
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
]

const PITCH_TEMPLATE = `Hi {{name}},
We received your inquiry for {{product}}.
We offer high-quality supply with fast delivery to {{country}}.
Let us know your required dosage and quantity.`

function statusBadgeClass(status) {
  if (status === 'converted') {
    return 'tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200'
  }
  if (status === 'contacted') {
    return 'tw-bg-amber-50 tw-text-amber-700 tw-border tw-border-amber-200'
  }
  return 'tw-bg-blue-50 tw-text-blue-700 tw-border tw-border-blue-200'
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function removeMatchedSegment(raw, matched) {
  if (!matched) return raw
  const escaped = escapeRegExp(matched)
  return raw.replace(new RegExp(escaped, 'i'), ' ').replace(/\s+/g, ' ').trim()
}

function titleCaseWords(value) {
  return normalizeWhitespace(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function looksLikeNameWord(token) {
  return /^[A-Za-z][A-Za-z'.-]*$/.test(token)
}

function digitCount(value) {
  return String(value || '').replace(/\D/g, '').length
}

function normalizePhone(value) {
  return normalizeWhitespace(String(value || '').replace(/\s+/g, ' '))
}

function pickBestPhone(raw) {
  const candidates = String(raw || '').match(new RegExp(PHONE_REGEX, 'g')) || []
  const valid = candidates
    .map((item) => normalizePhone(item))
    .filter((item) => {
      const digits = digitCount(item)
      return digits >= 7 && digits <= 15
    })

  if (!valid.length) return ''
  valid.sort((a, b) => digitCount(b) - digitCount(a))
  return valid[0]
}

function looksLikeAddress(value) {
  const text = String(value || '')
  if (!text.trim()) return false

  const lowered = text.toLowerCase()
  const addressHints = ['street', 'st', 'road', 'rd', 'avenue', 'ave', 'floor', 'apt', 'suite', 'blvd', 'lane', 'ln', 'city', 'ny']
  const hasHint = addressHints.some((hint) => new RegExp(`\\b${escapeRegExp(hint)}\\b`, 'i').test(lowered))
  const hasNumber = /\d/.test(text)
  const hasCommaOrNewline = /,|\n/.test(text)

  return hasNumber && (hasHint || hasCommaOrNewline)
}

function extractQuotedAddress(raw) {
  const source = String(raw || '')
  const quotedRegex = /"([\s\S]*?)"/g
  let match = quotedRegex.exec(source)

  while (match) {
    const candidate = normalizeWhitespace(match[1])
    if (looksLikeAddress(candidate)) {
      return {
        address: candidate,
        remaining: source.slice(0, match.index) + source.slice(match.index + match[0].length),
      }
    }
    match = quotedRegex.exec(source)
  }

  return { address: '', remaining: source }
}

function extractAddressFromLines(raw) {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return { address: '', remaining: raw }
  }

  const addressLines = lines.filter((line) => looksLikeAddress(line) && !EMAIL_REGEX.test(line) && !PHONE_REGEX.test(line))
  if (!addressLines.length) {
    return { address: '', remaining: raw }
  }

  const address = normalizeWhitespace(addressLines.join(', '))
  const remainingLines = lines.filter((line) => !addressLines.includes(line))
  return {
    address,
    remaining: remainingLines.join(' '),
  }
}

function defaultLeadForm() {
  return {
    name: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    product: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'new',
  }
}

function toDateInputValue(value) {
  if (!value) return new Date().toISOString().slice(0, 10)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function buildPitch(lead) {
  const name = lead?.name || 'there'
  const product = lead?.product || 'your requested product'
  const country = lead?.country || 'your location'

  return PITCH_TEMPLATE.replaceAll('{{name}}', name)
    .replaceAll('{{product}}', product)
    .replaceAll('{{country}}', country)
}

function detectCountry(raw) {
  for (const countryGroup of COUNTRY_ALIASES) {
    for (const alias of countryGroup.aliases) {
      const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i')
      if (pattern.test(raw)) {
        return { country: countryGroup.label, matchedAlias: alias }
      }
    }
  }
  return { country: '', matchedAlias: '' }
}

function parseLeadFromRaw(rawInput) {
  const rawText = String(rawInput || '').trim()
  const raw = normalizeWhitespace(rawInput)
  if (!raw) {
    return { ...defaultLeadForm(), date: new Date().toISOString().slice(0, 10) }
  }

  const tabColumns = rawText
    .split(/\t+/)
    .map((part) => normalizeWhitespace(part.replace(/^"|"$/g, '')))
    .filter(Boolean)

  const quotedAddressInfo = extractQuotedAddress(rawText)

  const emailMatch = raw.match(EMAIL_REGEX)
  const phoneValue = pickBestPhone(raw)
  const dateMatch = raw.match(DATE_REGEX)
  const countryInfo = detectCountry(rawText)

  let extractedAddress = ''

  if (quotedAddressInfo.address) {
    extractedAddress = quotedAddressInfo.address
  } else {
    const lineAddressInfo = extractAddressFromLines(rawText)
    extractedAddress = lineAddressInfo.address
  }

  if (!extractedAddress && tabColumns.length >= 4) {
    const tabAddress = tabColumns.find((part) => looksLikeAddress(part))
    if (tabAddress) extractedAddress = tabAddress
  }

  let remainder = raw
  if (emailMatch?.[0]) remainder = removeMatchedSegment(remainder, emailMatch[0])
  if (phoneValue) remainder = removeMatchedSegment(remainder, phoneValue)
  if (dateMatch?.[0]) remainder = removeMatchedSegment(remainder, dateMatch[0])
  if (countryInfo.matchedAlias) remainder = removeMatchedSegment(remainder, countryInfo.matchedAlias)
  if (extractedAddress) remainder = removeMatchedSegment(remainder, extractedAddress)

  const addressCountryInfo = detectCountry(extractedAddress)
  const effectiveCountry = countryInfo.country || addressCountryInfo.country
  if (addressCountryInfo.matchedAlias && extractedAddress) {
    extractedAddress = removeMatchedSegment(extractedAddress, addressCountryInfo.matchedAlias)
  }

  let tabName = ''
  let tabProduct = ''
  if (tabColumns.length >= 3) {
    const nameCandidate = tabColumns.find((part) => part && !EMAIL_REGEX.test(part) && !pickBestPhone(part) && !looksLikeAddress(part) && part.split(' ').length <= 4)
    if (nameCandidate) tabName = nameCandidate

    tabProduct = tabColumns
      .filter((part) => {
        if (!part) return false
        if (part === tabName) return false
        if (EMAIL_REGEX.test(part)) return false
        if (pickBestPhone(part)) return false
        if (looksLikeAddress(part)) return false
        if (detectCountry(part).country) return false
        return true
      })
      .slice(-1)[0] || ''
  }

  const tokens = normalizeWhitespace(remainder)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)

  let productStart = -1
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]
    const normalized = token.toLowerCase()
    const hasDigit = /\d/.test(token)
    if (hasDigit || PRODUCT_HINT_WORDS.has(normalized)) {
      productStart = index
      break
    }
  }

  if (productStart < 0 && tokens.length > 2) {
    productStart = 2
  }
  if (productStart < 0) {
    productStart = Math.max(1, tokens.length - 1)
  }

  let nameTokens = tokens.slice(0, productStart)
  if (nameTokens.some((token) => !looksLikeNameWord(token))) {
    nameTokens = nameTokens.filter(looksLikeNameWord)
  }
  if (nameTokens.length === 0 && tokens.length) {
    nameTokens = [tokens[0]]
  }

  const productTokens = tokens.slice(Math.max(0, nameTokens.length))
  const parsedName = titleCaseWords(nameTokens.join(' '))
  const tabParsedName = tabName ? titleCaseWords(tabName) : ''
  const parsedProduct = normalizeWhitespace(productTokens.join(' '))
  const tabParsedProduct = normalizeWhitespace(tabProduct)
  const mergedProduct = tabParsedProduct || parsedProduct
  const finalProduct = isLikelyMedicineProduct(mergedProduct) ? mergedProduct : ''

  return {
    name: tabParsedName || parsedName,
    email: normalizeWhitespace(emailMatch?.[0] || ''),
    phone: normalizePhone(phoneValue),
    address: normalizeWhitespace(extractedAddress),
    country: effectiveCountry,
    product: finalProduct,
    date: dateMatch?.[0] || new Date().toISOString().slice(0, 10),
    status: 'new',
  }
}

export function LeadsSection({ onLeadsChanged = () => Promise.resolve() }) {
  const [rawLead, setRawLead] = useState('')
  const [parsedLead, setParsedLead] = useState(defaultLeadForm)
  const [leads, setLeads] = useState([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [savingLead, setSavingLead] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')

  const [countryFilter, setCountryFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [toast, setToast] = useState({ type: '', message: '' })

  const [pitchModalLead, setPitchModalLead] = useState(null)
  const [pitchText, setPitchText] = useState('')
  const [sendingPitchEmail, setSendingPitchEmail] = useState(false)

  const [emailModalLead, setEmailModalLead] = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  const [invoiceLead, setInvoiceLead] = useState(null)
  const [invoicePrice, setInvoicePrice] = useState('')
  const [invoiceQty, setInvoiceQty] = useState('1')

  const [editLead, setEditLead] = useState(null)
  const [editLeadForm, setEditLeadForm] = useState(defaultLeadForm)
  const [updatingLead, setUpdatingLead] = useState(false)

  const canSaveLead = useMemo(() => {
    return Boolean(parsedLead.name && parsedLead.email && parsedLead.product && parsedLead.date)
  }, [parsedLead.date, parsedLead.email, parsedLead.name, parsedLead.product])

  const productOptions = useMemo(() => {
    const set = new Set(leads.map((item) => normalizeWhitespace(item.product)).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const countryOptions = useMemo(() => {
    const set = new Set([...COUNTRY_OPTIONS, ...leads.map((item) => normalizeWhitespace(item.country)).filter(Boolean)])
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (countryFilter !== 'all' && String(lead.country || '') !== countryFilter) return false
      if (productFilter !== 'all' && String(lead.product || '') !== productFilter) return false
      if (statusFilter !== 'all' && String(lead.status || '') !== statusFilter) return false
      return true
    })
  }, [countryFilter, leads, productFilter, statusFilter])

  const invoiceTotal = useMemo(() => {
    const qty = Number(invoiceQty)
    const price = Number(invoicePrice)
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0
    return qty * price
  }, [invoicePrice, invoiceQty])

  function showToast(type, message) {
    setToast({ type, message })
  }

  function syncParentLeads() {
    Promise.resolve(onLeadsChanged()).catch(() => {})
  }

  useEffect(() => {
    let active = true

    async function loadLeads() {
      try {
        setLoadingLeads(true)
        const data = await apiGet('/api/leads')
        if (!active) return
        setLeads(data?.leads || [])
      } catch (error) {
        if (!active) return
        showToast('error', error?.message || 'Failed to load leads')
      } finally {
        if (active) setLoadingLeads(false)
      }
    }

    loadLeads()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!toast.message) return undefined
    const timer = window.setTimeout(() => setToast({ type: '', message: '' }), 2500)
    return () => window.clearTimeout(timer)
  }, [toast.message])

  async function handleParseLead() {
    if (!normalizeWhitespace(rawLead)) {
      showToast('error', 'Paste lead data before parsing')
      return
    }

    setParsing(true)
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 220))
      const parsed = parseLeadFromRaw(rawLead)
      setParsedLead(parsed)
      showToast('success', 'Lead parsed successfully. Review and save.')
    } finally {
      setParsing(false)
    }
  }

  function handleClearRaw() {
    setRawLead('')
    setParsedLead(defaultLeadForm())
  }

  async function handleSaveLead() {
    if (!canSaveLead) {
      showToast('error', 'Please complete Name, Email, Product, and Date before saving')
      return
    }

    try {
      setSavingLead(true)
      const payload = {
        ...parsedLead,
        date: parsedLead.date,
      }
      const result = await apiPost('/api/leads', payload)
      setLeads((prev) => [result.lead, ...prev])
      setParsedLead(defaultLeadForm())
      setRawLead('')
      showToast('success', 'Lead saved successfully')
      syncParentLeads()
    } catch (error) {
      showToast('error', error?.message || 'Failed to save lead')
    } finally {
      setSavingLead(false)
    }
  }

  async function handleStatusChange(leadId, nextStatus) {
    try {
      setActionLoadingId(leadId)
      const result = await apiPut(`/api/leads/${leadId}`, { status: nextStatus })
      setLeads((prev) => prev.map((lead) => (lead._id === leadId ? result.lead : lead)))
      showToast('success', 'Lead status updated')
      syncParentLeads()
    } catch (error) {
      showToast('error', error?.message || 'Unable to update lead status')
    } finally {
      setActionLoadingId('')
    }
  }

  async function handleDeleteLead(leadId) {
    const confirmed = window.confirm('Delete this lead permanently?')
    if (!confirmed) return

    try {
      setActionLoadingId(leadId)
      await apiDelete(`/api/leads/${leadId}`)
      setLeads((prev) => prev.filter((lead) => lead._id !== leadId))
      showToast('success', 'Lead deleted')
      syncParentLeads()
    } catch (error) {
      showToast('error', error?.message || 'Unable to delete lead')
    } finally {
      setActionLoadingId('')
    }
  }

  function openPitchModal(lead) {
    setPitchModalLead(lead)
    setPitchText(buildPitch(lead))
  }

  function openEmailModal(lead, initialBody = '') {
    setEmailModalLead(lead)
    setEmailSubject(`Regarding your inquiry for ${lead.product || 'product'}`)
    setEmailBody(initialBody || buildPitch(lead))
  }

  async function handleSendLeadEmail(lead, subject, message, options = {}) {
    const trimSubject = normalizeWhitespace(subject)
    const trimMessage = normalizeWhitespace(message)

    if (!trimSubject) {
      showToast('error', 'Email subject is required')
      return false
    }

    if (trimMessage.length < 6) {
      showToast('error', 'Email message must be at least 6 characters')
      return false
    }

    try {
      if (options.fromPitch) setSendingPitchEmail(true)
      else setSendingEmail(true)

      const result = await apiPost(`/api/leads/${lead._id}/send-email`, {
        subject: trimSubject,
        message,
      })

      setLeads((prev) => prev.map((item) => (item._id === lead._id ? result.lead : item)))
      showToast('success', 'Email sent to lead successfully')
      syncParentLeads()
      return true
    } catch (error) {
      showToast('error', error?.message || 'Unable to send email')
      return false
    } finally {
      setSendingPitchEmail(false)
      setSendingEmail(false)
    }
  }

  async function handleSendFromPitch() {
    if (!pitchModalLead) return
    const ok = await handleSendLeadEmail(
      pitchModalLead,
      `Regarding your inquiry for ${pitchModalLead.product || 'product'}`,
      pitchText,
      { fromPitch: true },
    )
    if (ok) setPitchModalLead(null)
  }

  async function handleSendFromEmailModal() {
    if (!emailModalLead) return
    const ok = await handleSendLeadEmail(emailModalLead, emailSubject, emailBody)
    if (ok) setEmailModalLead(null)
  }

  function copyPitch() {
    if (!pitchText) return
    navigator.clipboard.writeText(pitchText)
    showToast('success', 'Pitch copied to clipboard')
  }

  function openInvoiceModal(lead) {
    setInvoiceLead(lead)
    setInvoicePrice('')
    setInvoiceQty('1')
  }

  function openEditModal(lead) {
    setEditLead(lead)
    setEditLeadForm({
      name: lead?.name || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      address: lead?.address || '',
      country: lead?.country || '',
      product: lead?.product || '',
      date: toDateInputValue(lead?.date),
      status: lead?.status || 'new',
    })
  }

  async function handleSaveEditedLead() {
    if (!editLead?._id) return

    const payload = {
      name: normalizeWhitespace(editLeadForm.name),
      email: normalizeWhitespace(editLeadForm.email),
      phone: normalizeWhitespace(editLeadForm.phone),
      address: normalizeWhitespace(editLeadForm.address),
      country: normalizeWhitespace(editLeadForm.country),
      product: normalizeWhitespace(editLeadForm.product),
      date: editLeadForm.date,
      status: editLeadForm.status,
    }

    if (!payload.name || !payload.email || !payload.product || !payload.date) {
      showToast('error', 'Name, Email, Product, and Date are required')
      return
    }

    try {
      setUpdatingLead(true)
      const result = await apiPut(`/api/leads/${editLead._id}`, payload)
      setLeads((prev) => prev.map((lead) => (lead._id === editLead._id ? result.lead : lead)))
      showToast('success', 'Lead updated successfully')
      setEditLead(null)
      syncParentLeads()
    } catch (error) {
      showToast('error', error?.message || 'Unable to update lead')
    } finally {
      setUpdatingLead(false)
    }
  }

  function downloadInvoice() {
    if (!invoiceLead) return
    const qty = Number(invoiceQty)
    const price = Number(invoicePrice)

    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      showToast('error', 'Enter valid price and quantity for invoice')
      return
    }

    const total = qty * price
    const invoiceNumber = `INV-${Date.now()}`
    const date = new Date().toISOString().slice(0, 10)

    const invoiceText = [
      'Trusty Lead Invoice',
      '===================',
      `Invoice Number: ${invoiceNumber}`,
      `Date: ${date}`,
      '',
      `Lead Name: ${invoiceLead.name || ''}`,
      `Email: ${invoiceLead.email || ''}`,
      `Country: ${invoiceLead.country || ''}`,
      `Product: ${invoiceLead.product || ''}`,
      '',
      `Quantity: ${qty}`,
      `Price: ${price.toFixed(2)}`,
      `Total: ${total.toFixed(2)}`,
    ].join('\n')

    const blob = new Blob([invoiceText], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${invoiceNumber}.txt`
    anchor.click()
    window.URL.revokeObjectURL(url)

    showToast('success', 'Invoice generated and downloaded')
    setInvoiceLead(null)
  }

  return (
    <section className="vdSection">
      <div className="tw-space-y-5">
        <div className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-soft">
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
            <div>
              <h2 className="tw-text-xl tw-font-semibold tw-text-slate-900">Paste Lead Data</h2>
              <p className="tw-mt-1 tw-text-sm tw-text-slate-500">Convert messy raw input into a structured, actionable lead record.</p>
            </div>
            {parsing ? (
              <span className="tw-inline-flex tw-items-center tw-rounded-full tw-bg-cyan-50 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-text-cyan-700">Parsing...</span>
            ) : null}
          </div>

          <div className="tw-mt-4">
            <textarea
              className="tw-min-h-36 tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-3 tw-text-sm tw-text-slate-800 focus:tw-border-cyan-500 focus:tw-bg-white focus:tw-outline-none"
              placeholder="Paste raw lead data here (e.g., date, phone, name, product, country, email)"
              value={rawLead}
              onChange={(event) => setRawLead(event.target.value)}
            />
          </div>

          <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
            <button type="button" className="btn" onClick={handleParseLead} disabled={parsing}>
              {parsing ? 'Parsing...' : 'Parse Lead'}
            </button>
            <button type="button" className="btn secondary" onClick={handleClearRaw}>
              Clear
            </button>
          </div>
        </div>

        <div className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-soft">
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
            <h3 className="tw-text-lg tw-font-semibold tw-text-slate-900">Parsed Preview</h3>
            {savingLead ? <span className="tw-text-xs tw-font-semibold tw-text-cyan-700">Saving...</span> : null}
          </div>

          <div className="tw-mt-4 tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-2">
            <label className="tw-space-y-1">
              <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Name</span>
              <input
                className="input"
                value={parsedLead.name}
                onChange={(event) => setParsedLead((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label className="tw-space-y-1">
              <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Email</span>
              <input
                className="input"
                value={parsedLead.email}
                onChange={(event) => setParsedLead((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="tw-space-y-1">
              <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Phone</span>
              <input
                className="input"
                value={parsedLead.phone}
                onChange={(event) => setParsedLead((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>
            <label className="tw-space-y-1 md:tw-col-span-2">
              <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Address</span>
              <input
                className="input"
                value={parsedLead.address}
                onChange={(event) => setParsedLead((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Street, city, postal code"
              />
            </label>
            <label className="tw-space-y-1">
              <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Country</span>
              <select
                className="input"
                value={parsedLead.country}
                onChange={(event) => setParsedLead((prev) => ({ ...prev, country: event.target.value }))}
              >
                <option value="">Select country</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </label>
            <label className="tw-space-y-1">
              <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Product</span>
              <input
                className="input"
                value={parsedLead.product}
                onChange={(event) => setParsedLead((prev) => ({ ...prev, product: event.target.value }))}
              />
            </label>
            <label className="tw-space-y-1">
              <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Date</span>
              <input
                className="input"
                type="date"
                value={parsedLead.date}
                onChange={(event) => setParsedLead((prev) => ({ ...prev, date: event.target.value }))}
              />
            </label>
          </div>

          <div className="tw-mt-4">
            <button type="button" className="btn" disabled={!canSaveLead || savingLead} onClick={handleSaveLead}>
              {savingLead ? 'Saving Lead...' : 'Save Lead'}
            </button>
          </div>
        </div>

        <div className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-soft">
          <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
            <h3 className="tw-text-lg tw-font-semibold tw-text-slate-900">Leads Dashboard</h3>
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              <select className="input" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
                <option value="all">All Countries</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              <select className="input" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                <option value="all">All Products</option>
                {productOptions.map((product) => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
              <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="tw-mt-4 tw-overflow-x-auto">
            <table className="tw-min-w-full tw-border-separate tw-border-spacing-0 tw-text-sm">
              <thead>
                <tr>
                  {['Name', 'Email', 'Phone', 'Product', 'Country', 'Status', 'Actions'].map((head) => (
                    <th key={head} className="tw-border-b tw-border-slate-200 tw-px-3 tw-py-2 tw-text-left tw-font-semibold tw-text-slate-600">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingLeads ? (
                  <tr>
                    <td colSpan={7} className="tw-p-6 tw-text-center tw-text-slate-500">Loading leads...</td>
                  </tr>
                ) : null}

                {!loadingLeads && filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="tw-p-6 tw-text-center tw-text-slate-500">No leads found for current filters.</td>
                  </tr>
                ) : null}

                {!loadingLeads && filteredLeads.map((lead) => (
                  <tr key={lead._id} className="tw-border-b tw-border-slate-100 hover:tw-bg-slate-50/70">
                    <td className="tw-px-3 tw-py-3 tw-font-medium tw-text-slate-800">{lead.name || 'N/A'}</td>
                    <td className="tw-px-3 tw-py-3 tw-text-slate-700">{lead.email || 'N/A'}</td>
                    <td className="tw-px-3 tw-py-3 tw-text-slate-700">{lead.phone || 'N/A'}</td>
                    <td className="tw-px-3 tw-py-3 tw-text-slate-700">{lead.product || 'N/A'}</td>
                    <td className="tw-px-3 tw-py-3 tw-text-slate-700">{lead.country || 'N/A'}</td>
                    <td className="tw-px-3 tw-py-3">
                      <select
                        className={`tw-rounded-full tw-px-2 tw-py-1 tw-text-xs tw-font-semibold ${statusBadgeClass(lead.status)}`}
                        value={lead.status || 'new'}
                        disabled={actionLoadingId === lead._id}
                        onChange={(event) => handleStatusChange(lead._id, event.target.value)}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={`${lead._id}-${status.value}`} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="tw-px-3 tw-py-3">
                      <div className="tw-flex tw-flex-wrap tw-gap-2">
                        <button type="button" className="btn secondary" onClick={() => openEditModal(lead)}>Edit</button>
                        <button type="button" className="btn secondary" onClick={() => openPitchModal(lead)}>Generate Pitch</button>
                        <button type="button" className="btn secondary" onClick={() => openEmailModal(lead)}>Send Email</button>
                        <button type="button" className="btn secondary" onClick={() => openInvoiceModal(lead)}>Generate Invoice</button>
                        <button type="button" className="btn secondary" disabled={actionLoadingId === lead._id} onClick={() => handleDeleteLead(lead._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {pitchModalLead ? (
        <div className="modalOverlay" role="presentation" onClick={() => setPitchModalLead(null)}>
          <div className="modalCard tw-w-full tw-max-w-3xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="tw-flex tw-items-start tw-justify-between tw-gap-4">
              <div>
                <h3 className="tw-text-lg tw-font-semibold tw-text-slate-900">Email Pitch Generator</h3>
                <p className="tw-text-sm tw-text-slate-500">Dynamic pitch for {pitchModalLead.name || 'lead'}.</p>
              </div>
              <button type="button" className="btn secondary" onClick={() => setPitchModalLead(null)}>Close</button>
            </div>

            <div className="tw-mt-4">
              <textarea className="textarea" rows={9} value={pitchText} onChange={(event) => setPitchText(event.target.value)} />
            </div>

            <div className="tw-mt-4 tw-flex tw-flex-wrap tw-gap-2">
              <button type="button" className="btn secondary" onClick={copyPitch}>Copy</button>
              <button type="button" className="btn secondary" onClick={() => openEmailModal(pitchModalLead, pitchText)}>Open Email Composer</button>
              <button type="button" className="btn" disabled={sendingPitchEmail} onClick={handleSendFromPitch}>
                {sendingPitchEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {emailModalLead ? (
        <div className="modalOverlay" role="presentation" onClick={() => setEmailModalLead(null)}>
          <div className="modalCard tw-w-full tw-max-w-3xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="tw-flex tw-items-start tw-justify-between tw-gap-4">
              <div>
                <h3 className="tw-text-lg tw-font-semibold tw-text-slate-900">Send Email</h3>
                <p className="tw-text-sm tw-text-slate-500">To: {emailModalLead.email}</p>
              </div>
              <button type="button" className="btn secondary" onClick={() => setEmailModalLead(null)}>Close</button>
            </div>

            <div className="tw-mt-4 tw-space-y-3">
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Subject</span>
                <input className="input" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Message</span>
                <textarea className="textarea" rows={9} value={emailBody} onChange={(event) => setEmailBody(event.target.value)} />
              </label>
            </div>

            <div className="tw-mt-4 tw-flex tw-gap-2">
              <button type="button" className="btn" onClick={handleSendFromEmailModal} disabled={sendingEmail}>
                {sendingEmail ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {invoiceLead ? (
        <div className="modalOverlay" role="presentation" onClick={() => setInvoiceLead(null)}>
          <div className="modalCard tw-w-full tw-max-w-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="tw-flex tw-items-start tw-justify-between tw-gap-4">
              <div>
                <h3 className="tw-text-lg tw-font-semibold tw-text-slate-900">Generate Invoice</h3>
                <p className="tw-text-sm tw-text-slate-500">Create invoice for {invoiceLead.name || 'lead'}.</p>
              </div>
              <button type="button" className="btn secondary" onClick={() => setInvoiceLead(null)}>Close</button>
            </div>

            <div className="tw-mt-4 tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-2">
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Product</span>
                <input className="input" value={invoiceLead.product || ''} disabled />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Price</span>
                <input className="input" type="number" min="0" value={invoicePrice} onChange={(event) => setInvoicePrice(event.target.value)} />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Quantity</span>
                <input className="input" type="number" min="1" value={invoiceQty} onChange={(event) => setInvoiceQty(event.target.value)} />
              </label>
              <div className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-3">
                <div className="tw-text-xs tw-font-semibold tw-text-slate-500">Total</div>
                <div className="tw-mt-1 tw-text-lg tw-font-bold tw-text-slate-900">{invoiceTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="tw-mt-4 tw-flex tw-gap-2">
              <button type="button" className="btn" onClick={downloadInvoice}>Download Invoice</button>
            </div>
          </div>
        </div>
      ) : null}

      {editLead ? (
        <div className="modalOverlay" role="presentation" onClick={() => setEditLead(null)}>
          <div className="modalCard tw-w-full tw-max-w-3xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="tw-flex tw-items-start tw-justify-between tw-gap-4">
              <div>
                <h3 className="tw-text-lg tw-font-semibold tw-text-slate-900">Edit Lead</h3>
                <p className="tw-text-sm tw-text-slate-500">Update lead details including name, email, address, and status.</p>
              </div>
              <button type="button" className="btn secondary" onClick={() => setEditLead(null)}>Close</button>
            </div>

            <div className="tw-mt-4 tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-2">
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Name</span>
                <input className="input" value={editLeadForm.name} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Email</span>
                <input className="input" value={editLeadForm.email} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, email: event.target.value }))} />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Phone</span>
                <input className="input" value={editLeadForm.phone} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Country</span>
                <select className="input" value={editLeadForm.country} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, country: event.target.value }))}>
                  <option value="">Select country</option>
                  {countryOptions.map((country) => (
                    <option key={`edit-${country}`} value={country}>{country}</option>
                  ))}
                </select>
              </label>
              <label className="tw-space-y-1 md:tw-col-span-2">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Address</span>
                <input
                  className="input"
                  value={editLeadForm.address}
                  onChange={(event) => setEditLeadForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Street, city, postal code"
                />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Product</span>
                <input className="input" value={editLeadForm.product} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, product: event.target.value }))} />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Date</span>
                <input className="input" type="date" value={editLeadForm.date} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, date: event.target.value }))} />
              </label>
              <label className="tw-space-y-1">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-500">Status</span>
                <select className="input" value={editLeadForm.status} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, status: event.target.value }))}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={`edit-status-${status.value}`} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="tw-mt-4 tw-flex tw-gap-2">
              <button type="button" className="btn" onClick={handleSaveEditedLead} disabled={updatingLead}>
                {updatingLead ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast.message ? (
        <div
          className={`tw-fixed tw-bottom-4 tw-right-4 tw-z-40 tw-rounded-lg tw-border tw-px-3 tw-py-2 tw-text-xs tw-font-semibold tw-shadow-lg ${
            toast.type === 'error'
              ? 'tw-border-rose-200 tw-bg-rose-50 tw-text-rose-700'
              : 'tw-border-emerald-200 tw-bg-emerald-50 tw-text-emerald-700'
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </section>
  )
}
