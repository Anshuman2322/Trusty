import type { CrmRecord } from './types'

export type Channel = 'email' | 'whatsapp' | 'sms'

export type SenderAccount = {
  id: string
  channel: Channel
  name: string
  address: string
  initials?: string
  toneColor?: string
}

export type MessageTemplate = {
  id: string
  name: string
  description?: string
  subject?: string
  body: string
}

export const SENDER_ACCOUNTS: SenderAccount[] = [
  { id: 'em1', channel: 'email', name: 'David Collins', address: 'davidcollins2322@gmail.com', initials: 'DC', toneColor: 'tw-bg-indigo-500' },
  { id: 'em2', channel: 'email', name: 'Henry', address: 'henry10davis@gmail.com', initials: 'H', toneColor: 'tw-bg-emerald-500' },
  { id: 'em3', channel: 'email', name: 'David', address: 'david210william@gmail.com', initials: 'D', toneColor: 'tw-bg-rose-500' },
  { id: 'em4', channel: 'email', name: 'John Parsall', address: 'johnparsall3066@gmail.com', initials: 'JP', toneColor: 'tw-bg-blue-500' },
  { id: 'wa1', channel: 'whatsapp', name: 'India WhatsApp Desk', address: '+91 98XXX 12345', initials: 'WA', toneColor: 'tw-bg-emerald-500' },
  { id: 'sms1', channel: 'sms', name: 'Twilio Main', address: '+1 555 010 7788', initials: 'SM', toneColor: 'tw-bg-slate-500' },
]

export const TEMPLATES: Record<Channel, MessageTemplate[]> = {
  email: [
    {
      id: 'e1',
      name: 'Soft Introduction',
      description: 'Warm first touch - no pricing pressure.',
      subject: 'Following up on your inquiry - {{product}}',
      body: 'Hi {{firstName}},\n\nThanks for your interest in {{product}}. I\'m {{senderName}} from our export desk - happy to help your team source this reliably.\n\nCould you share a few quick details so I can send the most accurate quote?\n\n- Required quantity (we ship from MOQ to bulk)\n- Preferred shipping terms (FOB / CIF / DDP)\n- Delivery timeline\n\nOnce I have this, I\'ll revert with best pricing and availability.',
    },
    {
      id: 'e2',
      name: 'Price-Based Pitch',
      description: 'Lead with competitive pricing + volume tiers.',
      subject: 'Best price options for {{product}}',
      body: 'Hi {{firstName}},\n\nWe can offer strong pricing for {{product}} with better slabs on higher quantities.\n\nShare your monthly requirement and destination port, and I\'ll send an exact landed-cost quote.\n\nRegards,\n{{senderName}}',
    },
    {
      id: 'e3',
      name: 'Basic Inquiry Follow-Up',
      description: 'Short, polite nudge to confirm requirements.',
      subject: 'Quick follow-up on {{product}}',
      body: 'Hi {{firstName}},\n\nJust checking in on your {{product}} requirement. If you\'re still planning this order, I can share a concise quote today.\n\nBest,\n{{senderName}}',
    },
    {
      id: 'e4',
      name: 'Address Confirmation',
      description: 'Confirm shipping address before dispatch.',
      subject: 'Dispatch address confirmation - {{product}}',
      body: 'Hi {{firstName}},\n\nBefore dispatch for {{product}}, please confirm your final consignee address and contact number for shipping documents.\n\nThanks,\n{{senderName}}',
    },
  ],
  whatsapp: [
    {
      id: 'w1',
      name: 'Quick intro',
      body: 'Hi {{firstName}}, saw your interest in {{product}}. Can I share a quick quote?',
    },
    {
      id: 'w2',
      name: 'Doc request',
      body: 'Hi {{firstName}}, please share your shipping address and import docs so we can proceed.',
    },
  ],
  sms: [
    {
      id: 's1',
      name: 'Tracking ping',
      body: '{{firstName}}, your order {{orderId}} has shipped. Track: {{trackUrl}}',
    },
  ],
}

export function interpolate(
  tpl: string,
  record: CrmRecord,
  sender?: { name: string } | null,
) {
  const firstName = String(record.basicInfo.name || '').split(' ')[0] || 'there'
  return tpl
    .replaceAll('{{firstName}}', firstName)
    .replaceAll('{{product}}', record.product.name)
    .replaceAll('{{orderId}}', record.id)
    .replaceAll('{{senderName}}', sender?.name ?? '')
    .replaceAll('{{trackUrl}}', `https://track.example.com/${record.id}`)
}
