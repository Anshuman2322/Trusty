import * as React from 'react'
import { mockData } from './mockData'
import type { CrmRecord, CrmRecordPatch } from './types'
import { apiGet } from '../lib/api'

interface CrmStoreValue {
  records: CrmRecord[]
  updateRecord: (id: string, patch: CrmRecordPatch) => void
  replaceRecords: React.Dispatch<React.SetStateAction<CrmRecord[]>>
}

const CrmContext = React.createContext<CrmStoreValue | null>(null)

type LeadApi = {
  _id?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  country?: string
  product?: string
  date?: string
  status?: 'new' | 'contacted' | 'converted' | string
  crmStage?: CrmRecord['stage'] | string
  priority?: CrmRecord['priority'] | string
  followUpAt?: string | null
  paymentStatus?: 'not_started' | 'pending' | 'paid' | string
  trustScore?: number | null
  notes?: Array<{
    text?: string
    createdAt?: string
    createdBy?: string
  }>
  activityLog?: Array<{
    type?: string
    message?: string
    createdAt?: string
  }>
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

const VALID_STAGES = new Set<CrmRecord['stage']>([
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
])

function toStage(lead: LeadApi): CrmRecord['stage'] {
  const rawStage = String(lead.crmStage || '').trim().toLowerCase()

  // Keep a custom CRM stage if explicitly set beyond the default new lead stage.
  if (rawStage && rawStage !== 'new_lead' && VALID_STAGES.has(rawStage as CrmRecord['stage'])) {
    return rawStage as CrmRecord['stage']
  }

  const status = String(lead.status || '').trim().toLowerCase()
  if (status === 'contacted') return 'contacted'
  if (status === 'converted') return 'converted'
  return 'new_lead'
}

function toActivityKind(value: string): CrmRecord['activity'][number]['kind'] {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('email')) return 'email'
  if (normalized.includes('whatsapp')) return 'whatsapp'
  if (normalized.includes('sms')) return 'sms'
  if (normalized.includes('note')) return 'note'
  if (normalized.includes('stage')) return 'stage'
  return 'system'
}

function toPaymentStatus(value?: string): CrmRecord['paymentStatus'] {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'pending') return 'pending'
  if (normalized === 'paid') return 'paid'
  return 'none'
}

function safeIso(value?: string | null) {
  if (!value) return new Date().toISOString()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function mapLeadToCrmRecord(lead: LeadApi): CrmRecord {
  const createdAt = safeIso(lead.createdAt)
  const updatedAt = safeIso(lead.updatedAt || lead.createdAt)
  const id = String(lead._id || `REC-${Math.random().toString(36).slice(2, 10)}`)
  const stage = toStage(lead)

  const activity = (Array.isArray(lead.activityLog) ? lead.activityLog : [])
    .filter((item) => item && item.message)
    .map((item) => ({
      kind: toActivityKind(String(item.type || 'system')),
      title: String(item.message || 'Updated lead'),
      detail: '',
      actor: 'System',
      at: safeIso(item.createdAt),
    }))

  const notes = (Array.isArray(lead.notes) ? lead.notes : [])
    .filter((item) => item && item.text)
    .map((item, index) => ({
      id: `${id}-N-${index + 1}`,
      body: String(item.text || ''),
      author: String(item.createdBy || 'vendor'),
      at: safeIso(item.createdAt),
      internalOnly: true,
    }))

  return {
    id,
    stage,
    priority: lead.priority === 'high' || lead.priority === 'low' ? lead.priority : 'medium',
    paymentStatus: toPaymentStatus(lead.paymentStatus),
    dealValue: 0,
    trustScore: Number.isFinite(lead.trustScore) ? Number(lead.trustScore) : 60,
    totalOrders: 0,
    activityItems: activity.length,
    followUpAt: lead.followUpAt || null,
    deletedAt: lead.deletedAt || null,
    updatedAt,
    source: 'Leads Dashboard',
    tags: [String(lead.status || 'new').toUpperCase()],
    basicInfo: {
      name: String(lead.name || 'Unknown Lead'),
      company: String(lead.address || 'Unknown Company'),
      email: String(lead.email || ''),
      phone: String(lead.phone || ''),
      country: String(lead.country || ''),
    },
    product: {
      name: String(lead.product || 'General Product'),
    },
    activity: activity.length
      ? activity
      : [
          {
            kind: 'system',
            title: 'Lead imported from dashboard',
            detail: String(lead.date || '').slice(0, 10),
            actor: 'System',
            at: createdAt,
          },
        ],
    notes,
  }
}

function mergeRecord(current: CrmRecord, patch: CrmRecordPatch): CrmRecord {
  const resolved = typeof patch === 'function' ? patch(current) : patch

  return {
    ...current,
    ...resolved,
    basicInfo: {
      ...current.basicInfo,
      ...resolved.basicInfo,
    },
    product: {
      ...current.product,
      ...resolved.product,
    },
    activity: resolved.activity ?? current.activity,
    notes: resolved.notes ?? current.notes,
    tags: resolved.tags ?? current.tags,
  }
}

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = React.useState<CrmRecord[]>([])

  React.useEffect(() => {
    let active = true

    async function loadFromLeadsDashboard() {
      try {
        const data = await apiGet('/api/leads')
        if (!active) return

        const leads = Array.isArray(data?.leads) ? data.leads : []
        if (!leads.length) {
          setRecords([])
          return
        }

        setRecords(leads.map((lead: LeadApi) => mapLeadToCrmRecord(lead)))
      } catch {
        if (!active) return
        // Keep a local fallback so Sales Command still works when API is unavailable.
        setRecords(mockData)
      }
    }

    loadFromLeadsDashboard()

    return () => {
      active = false
    }
  }, [])

  const updateRecord = React.useCallback((id: string, patch: CrmRecordPatch) => {
    setRecords((prev) => prev.map((record) => (record.id === id ? mergeRecord(record, patch) : record)))
  }, [])

  const value = React.useMemo(
    () => ({
      records,
      updateRecord,
      replaceRecords: setRecords,
    }),
    [records, updateRecord],
  )

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>
}

export function useCrm() {
  const ctx = React.useContext(CrmContext)
  if (!ctx) throw new Error('useCrm must be used inside <CrmProvider>.')
  return ctx
}
