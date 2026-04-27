import * as React from 'react'
import { useCrm } from '../store'
import type { CrmRecordPatch } from '../types'
import { CrmContextOverride } from './CrmContextOverride'
import { LeadProfilePane } from './LeadProfilePane'
import { SalesInboxRail } from './SalesInboxRail'

export function SalesCommandCenter() {
  const { records, updateRecord } = useCrm()
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const focus = React.useMemo(() => {
    const now = Date.now()
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const endOfTodayMs = endOfToday.getTime()

    const activeRecords = records.filter((record) => !record.deletedAt)

    const followUpsDue = activeRecords.filter((record) => {
      if (!record.followUpAt) return false
      const dueAt = new Date(record.followUpAt).getTime()
      return Number.isFinite(dueAt) && dueAt <= endOfTodayMs
    }).length

    const awaitingPayment = activeRecords.filter((record) => record.paymentStatus === 'pending').length

    const addressPending = activeRecords.filter((record) => !record.basicInfo.phone || !record.basicInfo.country).length

    const hotLeadsCold = activeRecords.filter((record) => {
      if (record.priority !== 'high') return false
      const updatedAt = new Date(record.updatedAt).getTime()
      if (!Number.isFinite(updatedAt)) return false
      return now - updatedAt > 3 * 24 * 60 * 60 * 1000
    }).length

    return {
      followUpsDue,
      awaitingPayment,
      addressPending,
      hotLeadsCold,
    }
  }, [records])

  React.useEffect(() => {
    if (!records.length) {
      setActiveId(null)
      return
    }

    if (!activeId || !records.some((item) => item.id === activeId)) {
      setActiveId(records[0].id)
    }
  }, [activeId, records])

  const updateAny = React.useCallback(
    (id: string, patch: CrmRecordPatch) => {
      updateRecord(id, patch)
    },
    [updateRecord],
  )

  return (
    <CrmContextOverride records={records} updateAny={updateAny}>
      <section className="tw-flex tw-flex-col tw-gap-2">
        <section className="tw-rounded-xl tw-border tw-border-border tw-bg-background tw-p-2.5 tw-shadow-sm">
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            <h3 className="tw-m-0 tw-pr-2 tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-text-muted-foreground">Today's focus</h3>

            <article className="tw-min-w-[170px] tw-flex-1 tw-rounded-lg tw-border tw-border-border tw-bg-card tw-px-3 tw-py-2">
              <p className="tw-m-0 tw-text-[11px] tw-font-semibold tw-text-muted-foreground">Follow-ups due</p>
              <p className="tw-m-0 tw-text-xl tw-font-bold tw-leading-6">{focus.followUpsDue}</p>
            </article>

            <article className="tw-min-w-[170px] tw-flex-1 tw-rounded-lg tw-border tw-border-border tw-bg-card tw-px-3 tw-py-2">
              <p className="tw-m-0 tw-text-[11px] tw-font-semibold tw-text-muted-foreground">Awaiting payment</p>
              <p className="tw-m-0 tw-text-xl tw-font-bold tw-leading-6">{focus.awaitingPayment}</p>
            </article>

            <article className="tw-min-w-[170px] tw-flex-1 tw-rounded-lg tw-border tw-border-border tw-bg-card tw-px-3 tw-py-2">
              <p className="tw-m-0 tw-text-[11px] tw-font-semibold tw-text-muted-foreground">Address pending</p>
              <p className="tw-m-0 tw-text-xl tw-font-bold tw-leading-6">{focus.addressPending}</p>
            </article>

            <article className="tw-min-w-[170px] tw-flex-1 tw-rounded-lg tw-border tw-border-border tw-bg-card tw-px-3 tw-py-2">
              <p className="tw-m-0 tw-text-[11px] tw-font-semibold tw-text-muted-foreground">Hot leads cold &gt;3d</p>
              <p className="tw-m-0 tw-text-xl tw-font-bold tw-leading-6 tw-text-rose-500">{focus.hotLeadsCold}</p>
            </article>
          </div>
        </section>

        <section className="tw-grid tw-grid-cols-1 tw-rounded-xl tw-border tw-border-border tw-bg-background tw-shadow-sm lg:tw-grid-cols-[280px_1fr]">
          <SalesInboxRail activeId={activeId} onSelect={setActiveId} />

          <LeadProfilePane activeId={activeId} />
        </section>
      </section>
    </CrmContextOverride>
  )
}
