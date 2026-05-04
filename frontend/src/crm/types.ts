export type Stage =
  | 'new_lead'
  | 'contacted'
  | 'converted'
  | 'negotiation_follow_up'
  | 'invoice_sent'
  | 'payment_pending'
  | 'payment_received'
  | 'order_processing'
  | 'shipped'
  | 'delivered'
  | 'feedback_retention'

export type Priority = 'high' | 'medium' | 'low'
export type PaymentStatus = 'none' | 'pending' | 'paid'

export type ActivityKind = 'system' | 'email' | 'whatsapp' | 'sms' | 'note' | 'stage'

export interface Activity {
  kind: ActivityKind
  title: string
  detail?: string
  actor: string
  at: string
}

export interface Note {
  id: string
  body: string
  author: string
  at: string
  internalOnly?: boolean
}

export interface CrmRecord {
  id: string
  stage: Stage
  priority: Priority
  paymentStatus: PaymentStatus
  dealValue: number
  trustScore: number
  totalOrders: number
  activityItems: number
  followUpAt?: string | null
  deletedAt?: string | null
  updatedAt: string
  source?: string
  tags: string[]
  basicInfo: {
    name: string
    company: string
    email: string
    phone: string
    country: string
    address?: string
    city?: string
    postalCode?: string
  }
  product: {
    name: string
    dosage?: string
    quantity?: number
    raw?: string
  }
  details?: {
    price?: number | null
    paymentLink?: string
    invoiceId?: string
    trackingId?: string
    trackingLink?: string
  }
  activity: Activity[]
  notes: Note[]
}

export type CrmRecordPatch = Partial<CrmRecord> | ((record: CrmRecord) => CrmRecord)

export const STAGE_META: Record<Stage, { label: string }> = {
  new_lead: { label: 'New Lead' },
  contacted: { label: 'Contacted' },
  converted: { label: 'Converted' },
  negotiation_follow_up: { label: 'Negotiation Follow-up' },
  invoice_sent: { label: 'Invoice Sent' },
  payment_pending: { label: 'Payment Pending' },
  payment_received: { label: 'Payment Received' },
  order_processing: { label: 'Order Processing' },
  shipped: { label: 'Shipped' },
  delivered: { label: 'Delivered' },
  feedback_retention: { label: 'Feedback Retention' },
}
