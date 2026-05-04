import { useEffect, useMemo, useState } from 'react'
import { Mail, MessageCircle, Plus, Search, Smartphone, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'

const STORAGE_KEY = 'trusty.vendor.templates.v1'

const CHANNELS = [
  { value: 'all', label: 'All' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
]

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'sales-focused', label: 'Sales-focused' },
]

const VARIABLE_CHIPS = [
  { label: 'Name', token: '{{name}}' },
  { label: 'Email', token: '{{email}}' },
  { label: 'Phone', token: '{{phone}}' },
  { label: 'Company Name', token: '{{company_name}}' },
  { label: 'Product', token: '{{product}}' },
  { label: 'Dosage', token: '{{dosage}}' },
  { label: 'Quantity', token: '{{quantity}}' },
  { label: 'Price', token: '{{price}}' },
  { label: 'Currency', token: '{{currency}}' },
  { label: 'Total Amount', token: '{{total_amount}}' },
  { label: 'Country', token: '{{country}}' },
  { label: 'Shipping Address', token: '{{shipping_address}}' },
  { label: 'City', token: '{{city}}' },
  { label: 'Postal Code', token: '{{postal_code}}' },
  { label: 'Payment Link', token: '{{payment_link}}' },
  { label: 'Invoice ID', token: '{{invoice_id}}' },
  { label: 'Invoice Link', token: '{{invoice_link}}' },
  { label: 'Rep Name', token: '{{rep_name}}' },
  { label: 'Rep Email', token: '{{rep_email}}' },
  { label: 'Tracking Link', token: '{{tracking_link}}' },
  { label: 'Tracking ID', token: '{{tracking_id}}' },
  { label: 'Order ID', token: '{{order_id}}' },
  { label: 'Lead ID', token: '{{lead_id}}' },
  { label: 'Status', token: '{{status}}' },
  { label: 'Date', token: '{{date}}' },
  { label: 'Expected Delivery', token: '{{expected_delivery}}' },
  { label: 'Follow-up Date', token: '{{followup_date}}' },
  { label: 'Feedback Link', token: '{{feedback_link}}' },
  { label: 'Rating Link', token: '{{rating_link}}' },
]

const SAMPLE_REPS = [
  { id: 'david', label: 'David Cohen', email: 'david@pharmaexports.co', phone: '+1 555 010 7788' },
  { id: 'henry', label: 'Henry Park', email: 'henry@pharmaexports.co', phone: '+1 555 014 9910' },
]

const SAMPLE_LEADS = [
  { id: 'lead-1', name: 'Gary Gilbert', email: 'gary.gilbert@kingbee.co', phone: '+1 615 479 4124', country: 'United States', product: 'Tadalafil Tablets-100 Strip', dosage: '10mg', quantity: '100', price: '$1,280', order_id: 'ORD-1042' },
  { id: 'lead-2', name: 'Brandon Henry', email: 'brandon@bhpharma.com', phone: '+1 318 265 0840', country: 'United States', product: 'Alerte Modafinil 100 Mg', dosage: '100mg', quantity: '250', price: '$2,450', order_id: 'ORD-1043' },
  { id: 'lead-3', name: 'Yusuf Khan', email: 'yusuf@meditrade.qa', phone: '+974 5550 1886', country: 'Qatar', product: 'Clopidogrel 75mg', dosage: '75mg', quantity: '500', price: '$3,850', order_id: 'ORD-1044' },
]

const DEFAULT_TEMPLATES = buildDefaultTemplates()

function getInitialTemplates() {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_TEMPLATES
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEMPLATES
  } catch {
    return DEFAULT_TEMPLATES
  }
}

function buildDefaultTemplates() {
  const now = Date.now()
  return [
    {
      id: 'tpl-inquiry',
      name: 'Initial inquiry follow-up',
      description: 'Quick response for fresh inbound leads.',
      category: 'Default Templates',
      channel: 'email',
      tone: 'professional',
      subject: 'Re: {{product}} inquiry - quick question',
      body:
        'Hi {{name}},\n\nThanks for reaching out about {{product}} ({{dosage}}). We supply this regularly to clients in {{country}}.\n\nCould you confirm the quantity you\'re looking for? I\'ll prepare a quote with shipping and customs included.\n\nBest,\n{{rep_name}}',
      tags: ['Follow-up', 'Sales'],
      usageCount: 24,
      lastUsedAt: now - 2 * 60 * 60 * 1000,
      savedAt: now - 18 * 60 * 60 * 1000,
      conditions: [
        { id: 'c1', field: 'country', operator: 'equals', value: 'USA', message: 'Add a fast-shipping note for USA destinations.' },
        { id: 'c2', field: 'quantity', operator: 'greater-than', value: '100', message: 'Offer a volume discount above 100 units.' },
      ],
      versions: [],
    },
    {
      id: 'tpl-price',
      name: 'Price-based pitch',
      description: 'Lead with value and volume pricing.',
      category: 'Default Templates',
      channel: 'email',
      tone: 'sales-focused',
      subject: 'Best wholesale pricing on {{product}}',
      body:
        'Hello {{name}},\n\nWe can offer competitive pricing for {{product}} with flexible volume tiers for {{quantity}} units or more.\n\nIf you share your target price, I\'ll return a sharper quote and delivery plan today.\n\nRegards,\n{{rep_name}}',
      tags: ['Sales', 'Follow-up'],
      usageCount: 31,
      lastUsedAt: now - 5 * 60 * 60 * 1000,
      savedAt: now - 22 * 60 * 60 * 1000,
      conditions: [
        { id: 'c3', field: 'quantity', operator: 'greater-than', value: '100', message: 'Highlight a bulk discount line.' },
      ],
      versions: [],
    },
    {
      id: 'tpl-whatsapp',
      name: 'WhatsApp soft intro',
      description: 'Compact intro for quick chat outreach.',
      category: 'Default Templates',
      channel: 'whatsapp',
      tone: 'friendly',
      body: 'Hi {{name}}, this is {{rep_name}}. Saw your interest in {{product}} for {{country}} and wanted to share a quick quote.',
      tags: ['Follow-up', 'Sales'],
      usageCount: 18,
      lastUsedAt: now - 90 * 60 * 1000,
      savedAt: now - 6 * 60 * 60 * 1000,
      conditions: [],
      versions: [],
    },
    {
      id: 'tpl-payment',
      name: 'Payment reminder',
      description: 'Polite reminder for open invoices.',
      category: 'Default Templates',
      channel: 'sms',
      tone: 'professional',
      body: 'Hi {{name}}, your invoice {{order_id}} for {{product}} is pending. Please confirm payment so we can continue shipping.',
      tags: ['Payment', 'Sales'],
      usageCount: 12,
      lastUsedAt: now - 12 * 60 * 60 * 1000,
      savedAt: now - 25 * 60 * 60 * 1000,
      conditions: [],
      versions: [],
    },
    {
      id: 'tpl-invoice',
      name: 'Invoice send',
      description: 'Send invoice and payment instructions.',
      category: 'Default Templates',
      channel: 'email',
      tone: 'professional',
      subject: 'Invoice for {{product}} - {{order_id}}',
      body:
        'Hello {{name}},\n\nAttached is the invoice for {{product}}. The total is {{price}} for {{quantity}} units.\n\nPlease review the details and reply if you need any changes before processing.\n\nBest,\n{{rep_name}}',
      tags: ['Payment', 'Sales'],
      usageCount: 21,
      lastUsedAt: now - 4 * 60 * 60 * 1000,
      savedAt: now - 8 * 60 * 60 * 1000,
      conditions: [],
      versions: [],
    },
    {
      id: 'tpl-address',
      name: 'Address confirmation',
      description: 'Confirm consignee details before dispatch.',
      category: 'Default Templates',
      channel: 'email',
      tone: 'friendly',
      subject: 'Please confirm your shipping address',
      body:
        'Hi {{name}},\n\nBefore we dispatch {{product}}, please confirm the consignee address and contact number.\n\nThis helps us avoid delays at shipping and customs.\n\nThanks,\n{{rep_name}}',
      tags: ['Shipping', 'Post-sale'],
      usageCount: 14,
      lastUsedAt: now - 7 * 60 * 60 * 1000,
      savedAt: now - 19 * 60 * 60 * 1000,
      conditions: [
        { id: 'c4', field: 'country', operator: 'equals', value: 'Qatar', message: 'Mention local customs docs for Qatar shipments.' },
      ],
      versions: [],
    },
    {
      id: 'tpl-dispatch',
      name: 'Dispatch update',
      description: 'Notify dispatch and packing progress.',
      category: 'Default Templates',
      channel: 'sms',
      tone: 'professional',
      body: 'Good news {{name}} - {{product}} for {{order_id}} is now dispatched. Tracking: {{tracking_link}}',
      tags: ['Shipping'],
      usageCount: 16,
      lastUsedAt: now - 45 * 60 * 1000,
      savedAt: now - 30 * 60 * 60 * 1000,
      conditions: [],
      versions: [],
    },
    {
      id: 'tpl-tracking',
      name: 'Tracking update',
      description: 'Keep the customer posted with tracking details.',
      category: 'Default Templates',
      channel: 'whatsapp',
      tone: 'friendly',
      body: 'Hi {{name}}, your tracking link for {{product}} is ready: {{tracking_link}}',
      tags: ['Shipping', 'Post-sale'],
      usageCount: 19,
      lastUsedAt: now - 3 * 60 * 60 * 1000,
      savedAt: now - 10 * 60 * 60 * 1000,
      conditions: [],
      versions: [],
    },
    {
      id: 'tpl-delivery',
      name: 'Delivery confirmation',
      description: 'Confirm delivery and next step.',
      category: 'Default Templates',
      channel: 'email',
      tone: 'professional',
      subject: 'Delivery confirmed for {{order_id}}',
      body:
        'Hi {{name}},\n\nYour order {{order_id}} has been delivered successfully. We\'d love to know if everything arrived as expected.\n\nBest,\n{{rep_name}}',
      tags: ['Shipping', 'Post-sale'],
      usageCount: 9,
      lastUsedAt: now - 26 * 60 * 60 * 1000,
      savedAt: now - 2 * 24 * 60 * 60 * 1000,
      conditions: [],
      versions: [],
    },
    {
      id: 'tpl-feedback',
      name: 'Feedback request',
      description: 'Close the loop and collect a response.',
      category: 'Default Templates',
      channel: 'sms',
      tone: 'friendly',
      body: 'Hi {{name}}, thanks again for choosing us. How was your experience with {{product}}? Reply with 1-5 feedback.',
      tags: ['Post-sale'],
      usageCount: 7,
      lastUsedAt: now - 28 * 60 * 60 * 1000,
      savedAt: now - 3 * 24 * 60 * 60 * 1000,
      conditions: [],
      versions: [],
    },
  ].map((template) => {
    const version = makeVersion({ ...template, versions: [], conditions: [] }, 'Initial version')
    return {
      ...template,
      versions: [version],
    }
  })
}

function makeVersion(template, label = 'Saved version') {
  return {
    id: `ver-${template.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    savedAt: template.savedAt || Date.now(),
    name: template.name,
    channel: template.channel,
    subject: template.subject || '',
    body: template.body || '',
    tone: template.tone || 'professional',
    tags: template.tags || [],
  }
}

function channelMeta(channel) {
  if (channel === 'whatsapp') return { label: 'WhatsApp', icon: MessageCircle }
  if (channel === 'sms') return { label: 'SMS', icon: Smartphone }
  return { label: 'Email', icon: Mail }
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function compactText(text, limit = 90) {
  const value = normalizeWhitespace(text)
  if (!value) return ''
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1))}…`
}


function mergeTemplateById(list, templateId, updater) {
  return list.map((item) => (item.id === templateId ? updater(item) : item))
}

export function TemplatesStudio() {
  const [templates, setTemplates] = useState(() => getInitialTemplates())
  const [selectedId, setSelectedId] = useState(() => getInitialTemplates()[0]?.id || DEFAULT_TEMPLATES[0].id)
  const [searchQuery, setSearchQuery] = useState('')
  const [saveState, setSaveState] = useState('All changes saved')

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }, [templates])

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) || templates[0],
    [selectedId, templates],
  )

  const filteredTemplates = useMemo(() => {
    const q = normalizeWhitespace(searchQuery).toLowerCase()
    if (!q) return templates

    return templates.filter((template) => {
      const content = [template.name, template.subject, template.body, template.channel].join(' ').toLowerCase()
      return content.includes(q)
    })
  }, [searchQuery, templates])

  function updateSelectedTemplate(patch) {
    if (!selectedTemplate) return
    setTemplates((current) =>
      mergeTemplateById(current, selectedTemplate.id, (template) => ({
        ...template,
        ...patch,
        updatedAt: Date.now(),
      })),
    )
    setSaveState('Unsaved changes')
  }

  function createTemplate() {
    const now = Date.now()
    const created = {
      id: `tpl-custom-${now}`,
      name: 'New template',
      description: 'Draft template',
      category: 'Default Templates',
      channel: 'email',
      tone: 'professional',
      subject: 'Re: {{product}} inquiry',
      body: 'Hi {{name}},\n\nThanks for your inquiry regarding {{product}}.\n\nBest,\n{{rep_name}}',
      tags: ['Follow-up'],
      usageCount: 0,
      lastUsedAt: null,
      savedAt: now,
      updatedAt: now,
      conditions: [],
      versions: [],
    }

    const firstVersion = makeVersion(created, 'Initial version')
    const templateWithVersion = {
      ...created,
      versions: [firstVersion],
    }

    setTemplates((current) => [templateWithVersion, ...current])
    setSelectedId(templateWithVersion.id)
    setSaveState('Unsaved changes')
  }

  function deleteTemplate() {
    if (!selectedTemplate || templates.length <= 1) return
    const nextTemplates = templates.filter((template) => template.id !== selectedTemplate.id)
    setTemplates(nextTemplates)
    setSelectedId(nextTemplates[0].id)
    setSaveState('All changes saved')
  }

  function saveChanges() {
    if (!selectedTemplate) return
    const snapshot = makeVersion({ ...selectedTemplate, savedAt: Date.now() }, 'Manual save')
    setTemplates((current) =>
      mergeTemplateById(current, selectedTemplate.id, (template) => ({
        ...template,
        versions: [snapshot, ...(template.versions || [])].slice(0, 10),
        savedAt: snapshot.savedAt,
      })),
    )
    setSaveState('All changes saved')
  }

  return (
    <section className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-[#f4f5f8] tw-p-4 tw-shadow-sm">
      <div className="tw-grid tw-gap-4 xl:tw-grid-cols-[300px_minmax(0,1fr)]">
        <aside className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-shadow-sm">
          <div className="tw-mb-3 tw-flex tw-items-center tw-justify-between tw-gap-2">
            <h2 className="tw-text-[34px] tw-font-medium tw-leading-none tw-text-slate-800">Templates</h2>
            <Button type="button" className="tw-h-9 tw-rounded-xl tw-bg-indigo-600 tw-px-3 hover:tw-bg-indigo-700" onClick={createTemplate}>
              <Plus className="tw-h-4 tw-w-4" />New
            </Button>
          </div>

          <label className="tw-relative tw-mb-3 tw-block">
            <Search className="tw-pointer-events-none tw-absolute tw-left-3 tw-top-1/2 tw-h-4 tw-w-4 -tw-translate-y-1/2 tw-text-slate-400" />
            <Input
              className="tw-h-10 tw-rounded-xl tw-border-slate-200 tw-bg-slate-50 tw-pl-9"
              placeholder="Search templates"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <div className="tw-max-h-[610px] tw-space-y-1 tw-overflow-y-auto tw-pr-1">
            {filteredTemplates.map((template) => {
              const meta = channelMeta(template.channel)
              const Icon = meta.icon
              const previewLine = template.channel === 'email'
                ? template.subject || compactText(template.body, 48)
                : compactText(template.body, 48)
              const isActive = template.id === selectedTemplate?.id

              return (
                <button
                  key={template.id}
                  type="button"
                  className={[
                    'tw-flex tw-w-full tw-items-start tw-gap-2 tw-rounded-xl tw-border tw-p-3 tw-text-left tw-transition-colors',
                    isActive
                      ? 'tw-border-slate-300 tw-bg-slate-100'
                      : 'tw-border-transparent hover:tw-border-slate-200 hover:tw-bg-slate-50',
                  ].join(' ')}
                  onClick={() => {
                    setSelectedId(template.id)
                    setSaveState('All changes saved')
                  }}
                >
                  <span className="tw-mt-0.5 tw-inline-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-text-slate-500">
                    <Icon className="tw-h-4 tw-w-4" />
                  </span>
                  <div className="tw-min-w-0">
                    <p className="tw-truncate tw-text-[28px] tw-leading-none tw-text-slate-800 sm:tw-text-base sm:tw-font-semibold">{template.name}</p>
                    <p className="tw-mt-1 tw-truncate tw-text-[13px] tw-text-slate-500">{previewLine}</p>
                  </div>
                </button>
              )
            })}

            {filteredTemplates.length === 0 ? (
              <div className="tw-rounded-xl tw-border tw-border-dashed tw-border-slate-300 tw-bg-slate-50 tw-p-6 tw-text-center tw-text-sm tw-text-slate-500">
                No templates match your search.
              </div>
            ) : null}
          </div>
        </aside>

        <main className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-sm">
          {!selectedTemplate ? null : (
            <div className="tw-space-y-5">
              <div className="tw-grid tw-gap-4 md:tw-grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
                <label className="tw-space-y-2">
                  <span className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500">Name</span>
                  <Input
                    className="tw-h-11 tw-rounded-xl tw-border-slate-200 tw-bg-slate-50"
                    value={selectedTemplate.name}
                    onChange={(event) => updateSelectedTemplate({ name: event.target.value })}
                  />
                </label>

                <label className="tw-space-y-2">
                  <span className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500">Channel</span>
                  <select
                    className="tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-text-sm tw-text-slate-800 focus:tw-outline-none"
                    value={selectedTemplate.channel}
                    onChange={(event) => updateSelectedTemplate({ channel: event.target.value })}
                  >
                    {CHANNELS.filter((item) => item.value !== 'all').map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="tw-space-y-2">
                <span className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500">Subject</span>
                <Input
                  className="tw-h-11 tw-rounded-xl tw-border-slate-200 tw-bg-slate-50"
                  value={selectedTemplate.subject || ''}
                  disabled={selectedTemplate.channel !== 'email'}
                  placeholder={selectedTemplate.channel === 'email' ? 'Re: {{product}} inquiry' : 'Subject is used for Email templates only'}
                  onChange={(event) => updateSelectedTemplate({ subject: event.target.value })}
                />
              </label>

              <label className="tw-space-y-2">
                <span className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500">
                  Body - use dynamic variables shown below
                </span>
                <div className="tw-flex tw-flex-wrap tw-gap-2">
                  {VARIABLE_CHIPS.map((item) => (
                    <span
                      key={item.token}
                      className="tw-rounded-md tw-border tw-border-slate-200 tw-bg-white tw-px-2 tw-py-1 tw-text-[11px] tw-font-medium tw-text-slate-600"
                    >
                      {item.token}
                    </span>
                  ))}
                </div>
                <Textarea
                  className="tw-min-h-[370px] tw-rounded-xl tw-border-slate-200 tw-bg-slate-50 tw-font-medium tw-leading-7"
                  value={selectedTemplate.body || ''}
                  onChange={(event) => updateSelectedTemplate({ body: event.target.value })}
                />
              </label>

              <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
                <button
                  type="button"
                  className="tw-inline-flex tw-items-center tw-gap-2 tw-text-sm tw-font-semibold tw-text-rose-600 hover:tw-text-rose-700"
                  onClick={deleteTemplate}
                  disabled={templates.length <= 1}
                >
                  <Trash2 className="tw-h-4 tw-w-4" />Delete
                </button>

                <div className="tw-flex tw-items-center tw-gap-3">
                  <p className="tw-text-xs tw-text-slate-500">{saveState}</p>
                  <Button
                    type="button"
                    className="tw-h-10 tw-rounded-xl tw-bg-indigo-600 tw-px-5 tw-font-semibold hover:tw-bg-indigo-700"
                    onClick={saveChanges}
                  >
                    Save changes
                  </Button>
                </div>
              </div>

              <div className="tw-grid tw-gap-2 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-3 sm:tw-grid-cols-3">
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-slate-600">
                  <Mail className="tw-h-4 tw-w-4" />Email ready
                </div>
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-slate-600">
                  <MessageCircle className="tw-h-4 tw-w-4" />WhatsApp ready
                </div>
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-slate-600">
                  <Smartphone className="tw-h-4 tw-w-4" />SMS ready
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  )
}
