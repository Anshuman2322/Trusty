import * as React from 'react'
import { ChevronDown, Mail, MessageCircle, Send, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Textarea } from '../../components/ui/textarea'
import { TemplateVariableModal } from '../../components/email/TemplateVariableModal'
import { SENDER_ACCOUNTS, TEMPLATES } from './templates'
import type { Channel } from './templates'
import type { CrmRecord } from '../types'
import { renderTemplate } from '../templateVariables'

const VENDOR_TEMPLATE_STORAGE_KEY = 'trusty.vendor.templates.v1'

type ChannelDraft = {
  senderId: string
  templateId: string
  subject: string
  body: string
}

type DraftMeta = {
  isTemplateSynced: boolean
  lastRecordId: string
  lastTemplateId: string
  lastSenderId: string
}

type ComposerTemplate = {
  id: string
  name: string
  description?: string
  subject?: string
  body: string
}

function buildComposerTemplateData(record: CrmRecord, sender: { name: string; address?: string } | null) {
  const name = String(record.basicInfo.name || '').trim()
  const firstName = name.split(' ')[0] || ''
  return {
    name,
    firstName,
    product: record.product.name || '',
    quantity: record.product.quantity ?? '',
    price: record.dealValue ?? '',
    total_amount: record.dealValue ?? '',
    email: record.basicInfo.email || '',
    phone: record.basicInfo.phone || '',
    company: record.basicInfo.company || '',
    country: record.basicInfo.country || '',
    senderName: sender?.name ?? '',
    rep_name: sender?.name ?? '',
    rep_email: sender?.address ?? '',
    date: new Date().toISOString().slice(0, 10),
  }
}

const CHANNEL_META: Array<{ key: Channel; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'sms', label: 'SMS', icon: Smartphone },
]

function buildInitialDraft(channel: Channel): ChannelDraft {
  const sender = SENDER_ACCOUNTS.find((account) => account.channel === channel)
  const template = TEMPLATES[channel][0]
  return {
    senderId: sender?.id || '',
    templateId: template?.id || '',
    subject: template?.subject || '',
    body: template?.body || '',
  }
}

function readTemplatesFromVendorStudio(channel: Channel): ComposerTemplate[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(VENDOR_TEMPLATE_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item) => item && item.channel === channel && typeof item.body === 'string' && item.body.trim())
      .map((item, index) => ({
        id: `vendor-${channel}-${item.id || index}`,
        name: typeof item.name === 'string' && item.name.trim() ? item.name : `Custom ${channel} template ${index + 1}`,
        description: typeof item.description === 'string' ? item.description : 'From Templates section',
        subject: typeof item.subject === 'string' ? item.subject : '',
        body: String(item.body || ''),
      }))
  } catch {
    return []
  }
}

export function OutreachComposer({
  record,
  onSend,
}: {
  record: CrmRecord
  onSend: (payload: {
    channel: Channel
    subject: string
    body: string
    senderId: string
    senderAddress: string
    senderLabel: string
    formData?: Record<string, string>
  }) => void | Promise<void>
}) {
  const [channel, setChannel] = React.useState<Channel>('email')
  const [openMenu, setOpenMenu] = React.useState<null | 'sender' | 'template'>(null)
  const menuRootRef = React.useRef<HTMLDivElement | null>(null)
  const [vendorTemplates, setVendorTemplates] = React.useState<Record<Channel, ComposerTemplate[]>>({
    email: [],
    whatsapp: [],
    sms: [],
  })
  const [drafts, setDrafts] = React.useState<Record<Channel, ChannelDraft>>({
    email: buildInitialDraft('email'),
    whatsapp: buildInitialDraft('whatsapp'),
    sms: buildInitialDraft('sms'),
  })
  const [draftMeta, setDraftMeta] = React.useState<Record<Channel, DraftMeta>>({
    email: { isTemplateSynced: true, lastRecordId: '', lastTemplateId: '', lastSenderId: '' },
    whatsapp: { isTemplateSynced: true, lastRecordId: '', lastTemplateId: '', lastSenderId: '' },
    sms: { isTemplateSynced: true, lastRecordId: '', lastTemplateId: '', lastSenderId: '' },
  })
  const [templateModalOpen, setTemplateModalOpen] = React.useState(false)

  const draft = drafts[channel]

  const senders = React.useMemo(
    () => SENDER_ACCOUNTS.filter((account) => account.channel === channel),
    [channel],
  )

  const sender = React.useMemo(
    () => senders.find((item) => item.id === draft.senderId) || senders[0] || null,
    [draft.senderId, senders],
  )

  React.useEffect(() => {
    const refreshVendorTemplates = () => {
      setVendorTemplates({
        email: readTemplatesFromVendorStudio('email'),
        whatsapp: readTemplatesFromVendorStudio('whatsapp'),
        sms: readTemplatesFromVendorStudio('sms'),
      })
    }

    refreshVendorTemplates()
    window.addEventListener('storage', refreshVendorTemplates)
    return () => {
      window.removeEventListener('storage', refreshVendorTemplates)
    }
  }, [])

  const templates = React.useMemo(() => {
    const base = TEMPLATES[channel]
    const custom = vendorTemplates[channel]
    if (!custom.length) return base

    const seenIds = new Set(base.map((item) => item.id))
    const merged: ComposerTemplate[] = [...base]

    for (const item of custom) {
      const nextId = seenIds.has(item.id) ? `${item.id}-${Math.random().toString(36).slice(2, 6)}` : item.id
      seenIds.add(nextId)
      merged.push({ ...item, id: nextId })
    }

    return merged
  }, [channel, vendorTemplates])

  const selectedTemplate = React.useMemo(
    () => templates.find((item) => item.id === draft.templateId) || templates[0] || null,
    [draft.templateId, templates],
  )

  const templateAutoData = React.useMemo(
    () => buildComposerTemplateData(record, sender),
    [record, sender],
  )

  const renderedBody = React.useMemo(
    () => renderTemplate(draft.body || '', templateAutoData),
    [draft.body, templateAutoData],
  )

  function updateDraft(next: Partial<ChannelDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        ...next,
      },
    }))
  }

  function updateDraftMeta(next: Partial<DraftMeta>) {
    setDraftMeta((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        ...next,
      },
    }))
  }

  function applyTemplateToDraft(template: ComposerTemplate | null, options?: { keepTemplateId?: boolean }) {
    if (!template) return
    const nextSubject = template.subject ? renderTemplate(template.subject, templateAutoData) : ''
    const nextBody = renderTemplate(template.body, templateAutoData)

    updateDraft({
      templateId: options?.keepTemplateId ? draft.templateId : template.id,
      subject: nextSubject,
      body: nextBody,
    })

    updateDraftMeta({
      isTemplateSynced: true,
      lastTemplateId: template.id,
      lastSenderId: sender?.id || '',
      lastRecordId: record.id,
    })
  }

  React.useEffect(() => {
    const firstTemplate = templates[0]
    if (!firstTemplate) return

    if (!draft.body.trim() || draftMeta[channel].lastRecordId !== record.id) {
      applyTemplateToDraft(selectedTemplate || firstTemplate)
    }
  }, [channel, record.id, templates, selectedTemplate, draft.body, draftMeta[channel].lastRecordId])

  React.useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!menuRootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', onDocumentClick)
    return () => {
      document.removeEventListener('mousedown', onDocumentClick)
    }
  }, [])

  function onTemplateChange(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    applyTemplateToDraft(template)
  }

  function onSenderChange(senderId: string) {
    const nextSender = senders.find((account) => account.id === senderId) || null
    const nextTemplateData = buildComposerTemplateData(record, nextSender)
    updateDraft({ senderId })
    updateDraftMeta({ lastSenderId: senderId })
    const nextSubject = renderTemplate(draft.subject || '', nextTemplateData)
    const nextBody = renderTemplate(draft.body || '', nextTemplateData)
    updateDraft({ subject: nextSubject, body: nextBody })
    setOpenMenu(null)
  }

  function onPreview() {
    setTemplateModalOpen(true)
  }

  function onSaveDraft() {
    toast.success('Draft saved')
  }

  return (
    <div ref={menuRootRef} className="tw-space-y-3 tw-pt-1">
      <Tabs value={channel} onValueChange={(value) => setChannel(value as Channel)}>
        <TabsList className="tw-grid tw-h-12 tw-w-full tw-grid-cols-3 tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-1">
          {CHANNEL_META.map((item) => {
            const Icon = item.icon
            return (
              <TabsTrigger key={item.key} value={item.key} className="tw-h-10 tw-rounded-xl tw-border tw-border-transparent tw-text-sm tw-font-medium tw-shadow-none">
                <Icon className="tw-h-3.5 tw-w-3.5" />
                {item.label}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <div className="tw-grid tw-grid-cols-1 tw-gap-2 lg:tw-grid-cols-2">
        <div className="tw-relative tw-space-y-1">
          <button
            type="button"
            className="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-between tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-text-left"
            onClick={() => setOpenMenu((prev) => (prev === 'template' ? null : 'template'))}
          >
            <span className="tw-text-sm tw-font-medium tw-text-slate-800">{selectedTemplate?.name || 'Choose template'}</span>
            <ChevronDown className="tw-h-4 tw-w-4 tw-text-slate-500" />
          </button>
          {openMenu === 'template' ? (
            <div className="tw-absolute tw-z-30 tw-mt-1 tw-w-[360px] tw-max-w-[calc(100vw-4rem)] tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-1 tw-shadow-lg">
              {templates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTemplateChange(item.id)
                    setOpenMenu(null)
                  }}
                  className="tw-w-full tw-rounded-xl tw-border-0 tw-bg-transparent tw-px-3 tw-py-1.5 tw-text-left tw-shadow-none tw-outline-none hover:tw-bg-slate-50"
                >
                  <p className="tw-m-0 tw-text-base tw-font-semibold tw-leading-5 tw-text-slate-800">{item.name}</p>
                  {item.description ? <p className="tw-m-0 tw-mt-0.5 tw-text-sm tw-leading-5 tw-text-slate-500">{item.description}</p> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="tw-relative tw-space-y-1">
          <button
            type="button"
            className="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-between tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3"
            onClick={() => setOpenMenu((prev) => (prev === 'sender' ? null : 'sender'))}
          >
            <span className="tw-flex tw-items-center tw-gap-2">
              <span className={`tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-rounded-md tw-text-xs tw-font-semibold tw-text-white ${sender?.toneColor || 'tw-bg-indigo-500'}`}>
                {sender?.initials || sender?.name.slice(0, 2).toUpperCase() || '--'}
              </span>
              <span className="tw-text-sm tw-font-medium tw-text-slate-800">{sender?.address || 'Choose sender'}</span>
            </span>
            <ChevronDown className="tw-h-4 tw-w-4 tw-text-slate-500" />
          </button>
          {openMenu === 'sender' ? (
            <div className="tw-absolute tw-z-30 tw-mt-1 tw-w-[360px] tw-max-w-[calc(100vw-4rem)] tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-1 tw-shadow-lg">
              {senders.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => onSenderChange(account.id)}
                  className="tw-flex tw-w-full tw-items-start tw-gap-3 tw-rounded-xl tw-border-0 tw-bg-transparent tw-px-3 tw-py-2 tw-text-left tw-shadow-none tw-outline-none hover:tw-bg-slate-50"
                >
                  <span className={`tw-mt-0.5 tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-md tw-text-xs tw-font-semibold tw-text-white ${account.toneColor || 'tw-bg-indigo-500'}`}>
                    {account.initials || account.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="tw-min-w-0">
                    <span className="tw-block tw-truncate tw-text-base tw-font-medium tw-text-slate-800">{account.name}</span>
                    <span className="tw-block tw-truncate tw-text-sm tw-text-slate-500">{account.address}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {channel === 'email' ? (
        <div className="tw-space-y-1">
          <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-500">Subject</p>
          <Input
            className="tw-h-11 tw-rounded-xl tw-border-slate-200 tw-text-[16px] tw-text-base"
            value={draft.subject}
            onChange={(event) => {
              updateDraft({ subject: event.target.value })
              updateDraftMeta({ isTemplateSynced: false })
            }}
          />
        </div>
      ) : null}

      <div className="tw-space-y-1">
        <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-500">Message</p>
        <Textarea
          className="tw-min-h-[240px] tw-rounded-xl tw-border-slate-200 tw-text-[15px] tw-leading-7"
          value={draft.body}
          onChange={(event) => {
            updateDraft({ body: event.target.value })
            updateDraftMeta({ isTemplateSynced: false })
          }}
        />
        <p className="tw-text-[11px] tw-text-slate-500">Preview: {renderedBody || 'Type message to preview token interpolation.'}</p>
      </div>

      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
        <div className="tw-flex tw-items-center tw-gap-2">
          <Button variant="ghost" onClick={onSaveDraft}>Save draft</Button>
          <Button onClick={onPreview}>
            <Send className="tw-h-4 tw-w-4" />
            Preview
          </Button>
        </div>
      </div>

      <TemplateVariableModal
        open={templateModalOpen}
        templateSubject={draft.subject}
        templateBody={draft.body}
        autoData={templateAutoData}
        clientKey={String(record.basicInfo.email || record.id || '').trim()}
        onClose={() => setTemplateModalOpen(false)}
        onSend={async (finalSubject, finalBody, formData) => {
          const fallbackSubject = String(finalBody || '').slice(0, 40)
          const subject = channel === 'email' ? String(finalSubject || '').trim() || fallbackSubject : fallbackSubject
          const body = String(finalBody || '').trim()

          if (!body) {
            toast.error('Message body is required')
            return
          }

          await onSend({
            channel,
            subject,
            body,
            senderId: sender?.id || '',
            senderAddress: sender?.address || '',
            senderLabel: sender ? `${sender.name} <${sender.address}>` : 'Unknown sender',
            formData,
          })

          setTemplateModalOpen(false)
          updateDraft({ templateId: '', subject: '', body: '' })
        }}
      />
    </div>
  )
}
