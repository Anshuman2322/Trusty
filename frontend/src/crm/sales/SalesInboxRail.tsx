import * as React from 'react'
import { Clock3, Flame, Inbox, Search, Star } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { STAGE_META } from '../types'
import type { CrmRecord } from '../types'
import { useCrmOverride } from './CrmContextOverride'

type Bucket = 'all' | 'hot' | 'today' | 'vip'

function isToday(dateString?: string | null) {
  if (!dateString) return false
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return false
  return date.toDateString() === new Date().toDateString()
}

function matchesBucket(record: CrmRecord, bucket: Bucket) {
  if (record.deletedAt) return false
  if (bucket === 'hot') return record.priority === 'high'
  if (bucket === 'today') return isToday(record.followUpAt)
  if (bucket === 'vip') return (record.totalOrders ?? 0) >= 3
  return true
}

function stageTag(stage: CrmRecord['stage']) {
  const label = STAGE_META[stage]?.label || 'New Lead'
  return label
    .replace('Lead', '')
    .replace('Follow-up', 'Follow-up')
    .trim()
    .toUpperCase()
}

export function SalesInboxRail({ activeId, onSelect }: { activeId: string | null; onSelect: (id: string) => void }) {
  const { records } = useCrmOverride()
  const [query, setQuery] = React.useState('')
  const [bucket, setBucket] = React.useState<Bucket>('all')

  const counters = React.useMemo(
    () => ({
      all: records.filter((record) => matchesBucket(record, 'all')).length,
      hot: records.filter((record) => matchesBucket(record, 'hot')).length,
      today: records.filter((record) => matchesBucket(record, 'today')).length,
      vip: records.filter((record) => matchesBucket(record, 'vip')).length,
    }),
    [records],
  )

  const buckets: Array<{ key: Bucket; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'all', label: 'All', icon: Inbox },
    { key: 'hot', label: 'Hot', icon: Flame },
    { key: 'today', label: 'Today', icon: Clock3 },
    { key: 'vip', label: 'VIP', icon: Star },
  ]

  const visible = React.useMemo<CrmRecord[]>(() => {
    const q = query.trim().toLowerCase()

    return records
      .filter((record) => matchesBucket(record, bucket))
      .filter((record) => {
        if (!q) return true
        const blob = [
          record.id,
          record.basicInfo.name,
          record.basicInfo.company,
          record.basicInfo.country,
          record.product.name,
        ]
          .join(' ')
          .toLowerCase()

        return blob.includes(q)
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [bucket, query, records])

  return (
    <aside className="tw-flex tw-max-h-[calc(100vh-12rem)] tw-w-full tw-flex-col tw-border-r tw-border-border tw-bg-card/40">
      <div className="tw-space-y-3 tw-border-b tw-border-border tw-p-3">
        <div className="tw-relative">
          <Search className="tw-pointer-events-none tw-absolute tw-left-2.5 tw-top-1/2 tw-h-3.5 tw-w-3.5 -tw-translate-y-1/2 tw-text-muted-foreground" />
          <Input
            className="tw-h-8 tw-pl-8 tw-text-xs"
            placeholder="Search leads..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="tw-grid tw-grid-cols-4 tw-gap-1">
          {buckets.map((item) => {
            const Icon = item.icon
            const active = bucket === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={[
                  'tw-flex tw-flex-col tw-items-center tw-gap-0.5 tw-rounded-xl tw-border tw-px-1 tw-py-1.5 tw-text-[11px] tw-font-medium tw-transition-colors',
                  active
                    ? 'tw-border-primary tw-bg-primary/10 tw-text-primary'
                    : 'tw-border-border tw-bg-background tw-text-muted-foreground hover:tw-bg-muted/50 hover:tw-text-foreground',
                ].join(' ')}
                onClick={() => setBucket(item.key)}
              >
                <Icon className="tw-h-3 tw-w-3" />
                <span>{item.label}</span>
                <span className="tw-tabular-nums tw-opacity-70">{counters[item.key]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="tw-flex-1 tw-min-h-0 tw-overflow-y-auto">
        <ul className="tw-m-0 tw-list-none tw-divide-y tw-divide-border tw-p-0">
          {visible.map((record) => {
            const active = activeId === record.id
            const stageLabel = stageTag(record.stage)

            return (
              <li key={record.id} className="tw-m-0 tw-list-none tw-p-0">
                <button
                  type="button"
                  className={[
                    'tw-block tw-w-full tw-appearance-none tw-border-0 tw-border-l-2 tw-bg-transparent tw-px-3 tw-py-2 tw-text-left tw-transition-colors focus-visible:tw-outline-none',
                    active
                      ? 'tw-border-l-primary tw-bg-primary/10'
                      : 'tw-border-l-transparent hover:tw-bg-muted/30',
                  ].join(' ')}
                  onClick={() => onSelect(record.id)}
                >
                  <div className="tw-flex tw-items-start tw-justify-between tw-gap-2">
                    <div className="tw-min-w-0 tw-flex-1">
                      <div className="tw-flex tw-items-center tw-gap-1.5">
                        {record.priority === 'high' ? <span className="tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-rose-500" /> : null}
                        <p className="tw-m-0 tw-truncate tw-text-[13px] tw-font-semibold tw-leading-5">{record.basicInfo.name}</p>
                      </div>
                      <p className="tw-m-0 tw-truncate tw-text-[12px] tw-leading-5 tw-text-muted-foreground">{record.basicInfo.company} - {record.basicInfo.country}</p>
                      <p className="tw-m-0 tw-truncate tw-text-[12px] tw-leading-5 tw-text-foreground/70">{record.product.name}</p>
                    </div>
                    <span className="tw-shrink-0 tw-rounded-full tw-bg-muted tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-muted-foreground">{stageLabel}</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        {visible.length === 0 ? <div className="tw-p-6 tw-text-center tw-text-xs tw-text-muted-foreground">No leads match.</div> : null}
      </div>
    </aside>
  )
}
