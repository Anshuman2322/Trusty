import * as React from 'react'
import { Activity, Clock3, Mail, MapPin, MoreHorizontal, Package, Phone, Send, StickyNote, Tag, UserRound } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Textarea } from '../../components/ui/textarea'
import { toast } from 'sonner'
import { apiPost } from '../../lib/api'
import type { Channel } from './templates'
import { SENDER_ACCOUNTS } from './templates'
import { STAGE_META } from '../types'
import type { Activity as CrmActivity, CrmRecord, Note, Stage } from '../types'
import { OutreachComposer } from './OutreachComposer'
import { useCrmOverride } from './CrmContextOverride'

const STAGE_FLOW: Stage[] = [
  'new_lead',
  'contacted',
  'converted',
  'negotiation_follow_up',
  'invoice_sent',
  'payment_pending',
  'payment_received',
  'order_processing',
  'shipped',
  'delivered',
  'feedback_retention',
]

function relativeTime(iso: string) {
  const at = new Date(iso).getTime()
  if (!at) return 'just now'
  const diff = Date.now() - at

  if (diff < 60 * 1000) return 'just now'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`
}

function timelineDotClass(kind: CrmActivity['kind']) {
  if (kind === 'email') return 'tw-bg-blue-500'
  if (kind === 'whatsapp') return 'tw-bg-emerald-500'
  if (kind === 'sms') return 'tw-bg-violet-500'
  if (kind === 'note') return 'tw-bg-amber-500'
  if (kind === 'stage') return 'tw-bg-primary'
  return 'tw-bg-muted-foreground'
}

function shortTitle(channel: Channel, subject: string, body: string) {
  const channelLabel = channel.charAt(0).toUpperCase() + channel.slice(1)
  return `${channelLabel} sent: ${subject || body.slice(0, 40)}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function senderKeyFromPayload(payload: { senderId: string; senderAddress: string; senderLabel: string }) {
  const sender = SENDER_ACCOUNTS.find((account) => account.id === payload.senderId || account.address === payload.senderAddress)
  if (sender?.address === 'henry10davis@gmail.com') return 'henry'
  if (sender?.address === 'david210william@gmail.com') return 'david'
  if (sender?.address === 'johnparsall3066@gmail.com') return 'john'

  const label = `${payload.senderLabel || ''} ${payload.senderAddress || ''}`.toLowerCase()
  if (label.includes('henry10davis@gmail.com')) return 'henry'
  if (label.includes('david210william@gmail.com')) return 'david'
  if (label.includes('johnparsall3066@gmail.com')) return 'john'
  return 'henry'
}

function formatDate(iso?: string | null) {
  if (!iso) return 'Not scheduled'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Not scheduled'
  return date.toLocaleDateString('en-GB')
}

export function LeadProfilePane({ activeId }: { activeId: string | null }) {
  const { records, updateAny } = useCrmOverride()
  const [noteDraft, setNoteDraft] = React.useState('')

  const record = React.useMemo(
    () => records.find((item) => item.id === activeId) || null,
    [activeId, records],
  )

  React.useEffect(() => {
    setNoteDraft('')
  }, [activeId])

  if (!record) {
    return (
      <section className="tw-flex tw-items-center tw-justify-center tw-bg-background tw-py-10">
        <p className="tw-text-sm tw-text-muted-foreground">Select a lead to open timeline, outreach, and notes.</p>
      </section>
    )
  }

  const timeline = [...record.activity].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const notes = [...record.notes].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const quantityLabel = record.product.quantity ? record.product.quantity.toLocaleString() : 'N/A'
  const unitPrice = record.product.quantity ? record.dealValue / record.product.quantity : 0
  const unitPriceLabel = unitPrice > 0 ? unitPrice.toFixed(2) : '0.00'
  const skuLabel = `SKU ${record.id.replace('REC-', 'ATR-')}`
  const currentStageLabel = STAGE_META[record.stage]?.label || 'New Lead'
  const currentStageIndex = STAGE_FLOW.indexOf(record.stage)
  const nextStage = STAGE_FLOW[(currentStageIndex >= 0 ? currentStageIndex : 0) + 1] || STAGE_FLOW[0]
  const nextStageLabel = STAGE_META[nextStage]?.label || 'Next Stage'

  function patchRecord(next: Partial<CrmRecord>) {
    const now = new Date().toISOString()
    updateAny(record.id, {
      ...next,
      updatedAt: now,
      activityItems: next.activity ? next.activity.length : record.activityItems,
    })
  }

  function onMoveStage() {
    const now = new Date().toISOString()

    const nextActivity: CrmActivity = {
      kind: 'stage',
      title: `Stage moved to ${STAGE_META[nextStage].label}`,
      detail: 'Manual stage advance from profile header',
      actor: 'You',
      at: now,
    }

    patchRecord({
      stage: nextStage,
      activity: [...record.activity, nextActivity],
    })

    toast.success(`Moved to ${STAGE_META[nextStage].label}`)
  }

  function onMarkHot() {
    patchRecord({ priority: 'high' })
    toast.success('Lead marked as hot')
  }

  async function onSend(payload: { channel: Channel; subject: string; body: string; senderId: string; senderAddress: string; senderLabel: string }) {
    const now = new Date().toISOString()
    const recipient = String(record.basicInfo.email || '').trim()

    if (payload.channel === 'email') {
      if (!recipient) {
        toast.error('Lead email address is missing')
        return
      }

      try {
        await apiPost('/api/send-email', {
          sender: senderKeyFromPayload(payload),
          to: recipient,
          subject: payload.subject,
          html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#0f172a;white-space:pre-wrap;">${escapeHtml(payload.body)}</div>`,
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to send email')
        return
      }
    }

    const nextActivity: CrmActivity = {
      kind: payload.channel,
      title: shortTitle(payload.channel, payload.subject, payload.body),
      detail: payload.senderLabel,
      actor: 'You',
      at: now,
    }

    patchRecord({
      activity: [...record.activity, nextActivity],
    })

    if (payload.channel === 'email') {
      toast.success(`Email sent to ${recipient}`)
      return
    }

    toast.success(`${payload.channel.toUpperCase()} sent`)
  }

  function onAddNote() {
    const body = noteDraft.trim()
    if (!body) return

    const now = new Date().toISOString()
    const nextNote: Note = {
      id: `N-${record.id}-${Date.now()}`,
      body,
      author: 'You',
      at: now,
      internalOnly: true,
    }

    const noteActivity: CrmActivity = {
      kind: 'note',
      title: 'Internal note added',
      detail: body.slice(0, 100),
      actor: 'You',
      at: now,
    }

    patchRecord({
      notes: [nextNote, ...record.notes],
      activity: [...record.activity, noteActivity],
    })

    setNoteDraft('')
  }

  return (
    <section className="tw-flex tw-flex-col">
      <header className="tw-border-b tw-border-border tw-bg-card/30 tw-px-3 tw-py-2.5">
        <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-1.5">
          <div className="tw-flex tw-items-start tw-gap-2">
            <span className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-primary tw-font-bold tw-text-primary-foreground">
              {record.basicInfo.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </span>

            <div className="tw-space-y-0">
              <div className="tw-flex tw-items-center tw-gap-2">
                <h2 className="tw-m-0 tw-text-lg tw-font-bold tw-leading-6">{record.basicInfo.name}</h2>
                {record.priority === 'high' ? <Badge className="tw-rounded-full tw-bg-rose-500/10 tw-text-rose-500" variant="outline">Hot</Badge> : null}
              </div>

              <p className="tw-m-0 tw-text-[13px] tw-leading-5 tw-text-muted-foreground">{record.basicInfo.company} - {record.basicInfo.country}</p>
              <p className="tw-m-0 tw-text-[11px] tw-leading-4 tw-text-muted-foreground">{record.id} - Updated {relativeTime(record.updatedAt)}</p>
            </div>
          </div>

          <div className="tw-flex tw-flex-col tw-items-end tw-gap-1">
            <div className="tw-flex tw-items-center tw-gap-1.5">
              <span className="tw-inline-flex tw-h-7 tw-items-center tw-rounded-full tw-border tw-border-slate-200 tw-bg-white tw-px-3.5 tw-text-xs tw-font-semibold tw-tracking-wide tw-text-slate-700">{currentStageLabel.toUpperCase()}</span>
              <Button variant="outline" size="sm" className="tw-h-8 tw-rounded-2xl tw-border-slate-300 tw-bg-white tw-px-4 tw-text-sm" onClick={onMoveStage}>{`Move to ${nextStageLabel}`}</Button>
              <Button variant="ghost" size="icon" className="tw-h-8 tw-w-8 tw-rounded-xl tw-border tw-border-slate-300" onClick={() => toast.success('More actions coming soon')}>
              <MoreHorizontal className="tw-h-4 tw-w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="tw-mt-1.5 tw-grid tw-grid-cols-2 tw-gap-1.5 lg:tw-grid-cols-4">
          <div className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-1.5">
            <p className="tw-m-0 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-muted-foreground">Deal value</p>
            <p className="tw-m-0 tw-text-base tw-font-bold tw-leading-6">${(record.dealValue / 1000).toFixed(1)}k</p>
          </div>
          <div className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-1.5">
            <p className="tw-m-0 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-muted-foreground">Trust score</p>
            <p className="tw-m-0 tw-text-base tw-font-bold tw-leading-6">{record.trustScore}/100</p>
          </div>
          <div className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-1.5">
            <p className="tw-m-0 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-muted-foreground">Total orders</p>
            <p className="tw-m-0 tw-text-base tw-font-bold tw-leading-6">{record.totalOrders}</p>
          </div>
          <div className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-1.5">
            <p className="tw-m-0 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-muted-foreground">Activity items</p>
            <p className="tw-m-0 tw-text-base tw-font-bold tw-leading-6">{record.activityItems}</p>
          </div>
        </div>
      </header>

      <div className="tw-px-3 tw-pb-3">
        <Tabs defaultValue="outreach" className="tw-flex tw-flex-col">
          <TabsList className="tw-mt-2 tw-grid tw-h-11 tw-grid-cols-4 tw-rounded-2xl tw-bg-slate-100 tw-p-0.5">
            <TabsTrigger value="outreach" className="tw-h-9 tw-rounded-xl tw-border-0 tw-text-sm tw-font-medium tw-shadow-none"><Send className="tw-h-3.5 tw-w-3.5" />Outreach</TabsTrigger>
            <TabsTrigger value="timeline" className="tw-h-9 tw-rounded-xl tw-border-0 tw-text-sm tw-font-medium tw-shadow-none"><Activity className="tw-h-3.5 tw-w-3.5" />Timeline</TabsTrigger>
            <TabsTrigger value="info" className="tw-h-9 tw-rounded-xl tw-border-0 tw-text-sm tw-font-medium tw-shadow-none"><UserRound className="tw-h-3.5 tw-w-3.5" />Info</TabsTrigger>
            <TabsTrigger value="notes" className="tw-h-9 tw-rounded-xl tw-border-0 tw-text-sm tw-font-medium tw-shadow-none"><StickyNote className="tw-h-3.5 tw-w-3.5" />Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="outreach">
            <OutreachComposer record={record} onSend={onSend} />
          </TabsContent>

          <TabsContent value="timeline" className="tw-pr-1">
            <div className="tw-space-y-3 tw-pt-1">
              {timeline.map((item, index) => (
                <div key={`${item.at}-${index}`} className="tw-grid tw-grid-cols-[16px_1fr] tw-gap-3">
                  <div className="tw-relative tw-flex tw-justify-center">
                    <span className={`tw-z-10 tw-mt-1 tw-h-2.5 tw-w-2.5 tw-rounded-full ${timelineDotClass(item.kind)}`} />
                    {index < timeline.length - 1 ? <span className="tw-absolute tw-bottom-0 tw-top-4 tw-w-px tw-bg-border" /> : null}
                  </div>

                  <article className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-3">
                    <div className="tw-flex tw-items-start tw-justify-between tw-gap-2">
                      <h4 className="tw-text-sm tw-font-semibold">{item.title}</h4>
                      <span className="tw-text-[10px] tw-text-muted-foreground">{relativeTime(item.at)}</span>
                    </div>
                    {item.detail ? <p className="tw-mt-0.5 tw-text-xs tw-text-muted-foreground">{item.detail}</p> : null}
                    <p className="tw-mt-2 tw-text-[10px] tw-text-muted-foreground">by {item.actor}</p>
                  </article>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="info" className="tw-mt-1">
            <div className="tw-space-y-1.5 tw-pt-0.5">
              <section className="tw-space-y-1">
                <p className="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">Contact</p>

                <article className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-1">
                  <p className="tw-flex tw-items-center tw-gap-1 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-500">
                    <Mail className="tw-h-3 tw-w-3" />
                    Email
                  </p>
                  <p className="tw-leading-5 tw-text-sm tw-font-medium tw-text-slate-900">{record.basicInfo.email || 'N/A'}</p>
                </article>

                <article className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-1">
                  <p className="tw-flex tw-items-center tw-gap-1 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-500">
                    <Phone className="tw-h-3 tw-w-3" />
                    Phone
                  </p>
                  <p className="tw-leading-5 tw-text-sm tw-font-medium tw-text-slate-900">{record.basicInfo.phone || 'N/A'}</p>
                </article>

                <article className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-1">
                  <p className="tw-flex tw-items-center tw-gap-1 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-500">
                    <MapPin className="tw-h-3 tw-w-3" />
                    Address
                  </p>
                  <p className="tw-leading-5 tw-text-sm tw-font-medium tw-text-slate-900">{record.basicInfo.company}, {record.basicInfo.country}</p>
                </article>
              </section>

              <section className="tw-space-y-1">
                <p className="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">Product Interest</p>
                <article className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-1">
                  <p className="tw-flex tw-items-center tw-gap-1 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-500">
                    <Package className="tw-h-3 tw-w-3" />
                    {record.product.name}
                  </p>
                  <p className="tw-flex tw-items-center tw-gap-1 tw-leading-5 tw-text-sm tw-font-medium tw-text-slate-900">
                    <span>{quantityLabel}</span>
                    <span>x</span>
                    <span>USD {unitPriceLabel}</span>
                    <span>-</span>
                    <span>{skuLabel}</span>
                  </p>
                </article>
              </section>

              <section className="tw-space-y-1">
                <p className="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">Tags</p>
                <div className="tw-flex tw-flex-wrap tw-gap-1.5">
                  {record.tags.length ? record.tags.map((item) => (
                    <span key={item} className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-slate-100 tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold tw-text-slate-700">
                      <Tag className="tw-h-2.5 tw-w-2.5" />
                      {item}
                    </span>
                  )) : (
                    <span className="tw-text-sm tw-text-slate-500">No tags</span>
                  )}
                </div>
              </section>

              <section className="tw-space-y-1">
                <p className="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">Follow-Up</p>
                <article className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-1">
                  <p className="tw-flex tw-items-center tw-gap-1 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-500">
                    <Clock3 className="tw-h-3 tw-w-3" />
                    Scheduled
                  </p>
                  <p className="tw-leading-5 tw-text-sm tw-font-medium tw-text-slate-900">{formatDate(record.followUpAt)}</p>
                </article>
              </section>

            </div>
          </TabsContent>

          <TabsContent value="notes" className="tw-space-y-3">
            <div className="tw-space-y-2">
              <Textarea
                className="tw-min-h-[80px] tw-text-sm"
                placeholder="Write an internal note..."
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
              <div className="tw-flex tw-justify-end">
                <Button size="sm" onClick={onAddNote}>Add note</Button>
              </div>
            </div>

            <div className="tw-space-y-2">
              {notes.length === 0 ? <p className="tw-text-xs tw-text-muted-foreground">No notes yet.</p> : null}
              {notes.map((note) => (
                <article key={note.id} className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-3">
                  <p className="tw-text-sm">{note.body}</p>
                  <div className="tw-mt-2 tw-flex tw-items-center tw-gap-2 tw-text-[10px] tw-text-muted-foreground">
                    <span>{note.author}</span>
                    <span>-</span>
                    <span>{new Date(note.at).toLocaleString()}</span>
                    {note.internalOnly ? <Badge className="tw-bg-amber-500/10 tw-text-amber-600" variant="outline">Internal only</Badge> : null}
                  </div>
                </article>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
