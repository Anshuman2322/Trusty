import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import type { ParsedLead } from './parser'
import { parseRawLead } from './parser'

const RAW_PLACEHOLDER = `Name: John Doe
Email: john@acme.com
Phone: +1 555-1234
Country: USA
Product: Paracetamol 500mg
Quantity: 5000`

function editableFromParsed(parsed: ParsedLead) {
  return {
    name: parsed.name || '',
    email: parsed.email || '',
    phone: parsed.phone || '',
    country: parsed.country || '',
    product: parsed.productName || parsed.productRaw || '',
    quantity: parsed.quantity ? String(parsed.quantity) : '',
    source: parsed.source || 'Manual paste',
    dosage: parsed.dosage || '',
    raw: parsed.productRaw || '',
  }
}

export function LeadParserPanel({ onCreate, onClose }: { onCreate: (lead: ParsedLead) => void; onClose: () => void }) {
  const [raw, setRaw] = React.useState('')
  const [parsed, setParsed] = React.useState<ReturnType<typeof editableFromParsed> | null>(null)

  function onExtract() {
    const next = parseRawLead(raw)
    setParsed(editableFromParsed(next))
  }

  function onCreateLead() {
    if (!parsed) return

    onCreate({
      name: parsed.name || undefined,
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      country: parsed.country || undefined,
      productName: parsed.product || undefined,
      productRaw: parsed.raw || parsed.product || undefined,
      dosage: parsed.dosage || undefined,
      quantity: parsed.quantity ? Number.parseInt(parsed.quantity, 10) : undefined,
      source: parsed.source || 'Manual paste',
    })

    setRaw('')
    setParsed(null)
  }

  function setField(field: keyof NonNullable<typeof parsed>, value: string) {
    setParsed((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  return (
    <div className="tw-space-y-3 tw-rounded-xl tw-border tw-border-border tw-bg-card tw-p-3">
      <div className="tw-flex tw-items-center tw-justify-between">
        <h3 className="tw-text-xs tw-font-bold">Parse raw lead</h3>
        <Button variant="ghost" size="icon" className="tw-h-7 tw-w-7" onClick={onClose} aria-label="Close parser">
          <X className="tw-h-3.5 tw-w-3.5" />
        </Button>
      </div>

      <div className="tw-space-y-2">
        <label className="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-muted-foreground" htmlFor="crm-raw-input">
          Raw input
        </label>
        <Textarea
          id="crm-raw-input"
          className="tw-min-h-[120px] tw-text-xs tw-font-mono"
          placeholder={RAW_PLACEHOLDER}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
        />
        <Button size="sm" className="tw-w-full" onClick={onExtract}>Extract fields</Button>
      </div>

      {parsed ? (
        <div className="tw-space-y-2.5">
          <div className="tw-grid tw-grid-cols-2 tw-gap-2">
            {[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'country', label: 'Country' },
              { key: 'product', label: 'Product' },
              { key: 'quantity', label: 'Quantity' },
              { key: 'source', label: 'Source' },
            ].map((field) => (
              <label key={field.key} className="tw-space-y-1">
                <span className="tw-block tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
                  {field.label}
                </span>
                <Input
                  className="tw-h-7 tw-text-xs"
                  value={parsed[field.key as keyof typeof parsed] || ''}
                  onChange={(event) => setField(field.key as keyof typeof parsed, event.target.value)}
                />
              </label>
            ))}
          </div>

          <Button className="tw-w-full" onClick={onCreateLead}>Create lead</Button>
        </div>
      ) : null}
    </div>
  )
}
