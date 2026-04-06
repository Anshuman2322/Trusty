import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Send } from 'lucide-react'
import { SectionCard } from '../../components/admin/AdminUi'

const STATUS_OPTIONS = ['all', 'open', 'in-progress', 'resolved']

export function TicketsPage({
  isDark,
  tickets,
  statusFilter,
  lastSyncedAt,
  onFilterChange,
  replyDrafts,
  onReplyDraftChange,
  replyingId,
  statusBusyId,
  onReply,
  onStatus,
  onRefresh,
}) {
  const [selectedTicketId, setSelectedTicketId] = useState('')

  useEffect(() => {
    if (!tickets.length) {
      setSelectedTicketId('')
      return
    }

    const exists = tickets.some((ticket) => String(ticket._id) === String(selectedTicketId))
    if (!exists) {
      setSelectedTicketId(String(tickets[0]._id))
    }
  }, [tickets, selectedTicketId])

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => String(ticket._id) === String(selectedTicketId)) || null,
    [tickets, selectedTicketId]
  )

  const selectedDraft = selectedTicket ? replyDrafts[selectedTicket._id] || '' : ''

  function formatStatusLabel(value) {
    if (value === 'in-progress') return 'In Progress'
    if (value === 'resolved') return 'Resolved'
    if (value === 'open') return 'Open'
    return 'All'
  }

  function getStatusBadgeClass(status) {
    if (status === 'resolved') {
      return isDark ? 'tw-bg-emerald-500/20 tw-text-emerald-200' : 'tw-bg-emerald-100 tw-text-emerald-700'
    }
    if (status === 'in-progress') {
      return isDark ? 'tw-bg-sky-500/20 tw-text-sky-200' : 'tw-bg-cyan-100 tw-text-cyan-700'
    }
    return isDark ? 'tw-bg-amber-500/20 tw-text-amber-200' : 'tw-bg-amber-100 tw-text-amber-700'
  }

  return (
    <SectionCard title="Support Tickets" subtitle="Manage vendor support requests">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onFilterChange(option)}
              className={[
                'tw-rounded-xl tw-border tw-px-4 tw-py-1.5 tw-text-sm tw-font-semibold tw-transition',
                statusFilter === option
                  ? isDark
                    ? 'tw-border-cyan-500 tw-bg-cyan-500 tw-text-slate-950'
                    : 'tw-border-[#16a3b8] tw-bg-[#16a3b8] tw-text-white'
                  : isDark
                    ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-200 hover:tw-bg-slate-800'
                    : 'tw-border-[#D6DEE9] tw-bg-white tw-text-[#0f172a] hover:tw-bg-[#F8FAFC]',
              ].join(' ')}
            >
              {formatStatusLabel(option)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={[
            'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-transition-all tw-duration-200',
            isDark ? 'tw-border-slate-600 tw-bg-slate-800 tw-text-slate-100 hover:tw-bg-slate-700' : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#334155] hover:tw-bg-[#F9FAFB]',
          ].join(' ')}
          onClick={onRefresh}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {!tickets.length ? (
        <div className={['tw-mt-3 tw-rounded-xl tw-border tw-p-4 tw-text-sm', isDark ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-300' : 'tw-border-slate-200 tw-bg-slate-50 tw-text-slate-600'].join(' ')}>
          No tickets in this filter.
        </div>
      ) : null}

      {tickets.length ? (
        <div className="tw-mt-4 tw-grid tw-gap-4 lg:tw-grid-cols-[400px_1fr]">
          <div className={[
            'tw-space-y-2 tw-rounded-xl tw-border tw-p-2',
            isDark ? 'tw-border-slate-700 tw-bg-slate-950' : 'tw-border-[#E6ECF4] tw-bg-white',
          ].join(' ')}>
            {tickets.map((ticket) => {
              const isSelected = String(ticket._id) === String(selectedTicket?._id)
              return (
                <button
                  key={ticket._id}
                  type="button"
                  onClick={() => setSelectedTicketId(String(ticket._id))}
                  className={[
                    'tw-w-full tw-rounded-xl tw-border tw-p-3 tw-text-left tw-transition-all tw-duration-200',
                    isSelected
                      ? isDark
                        ? 'tw-border-cyan-500/50 tw-bg-cyan-500/10'
                        : 'tw-border-[#9DDCE7] tw-bg-[#F0FCFF]'
                      : isDark
                        ? 'tw-border-slate-700 tw-bg-slate-900 hover:tw-border-slate-600'
                        : 'tw-border-[#E6ECF4] tw-bg-white hover:tw-border-[#CFD9E6]',
                  ].join(' ')}
                >
                  <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
                    <div className={['tw-text-xs tw-font-semibold', isDark ? 'tw-text-slate-300' : 'tw-text-[#0f172a]'].join(' ')}>
                      TK-{String(ticket._id).slice(-3).toUpperCase()}
                    </div>
                    <span className={[
                      'tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-bold tw-uppercase',
                      getStatusBadgeClass(ticket.status),
                    ].join(' ')}>
                      {formatStatusLabel(ticket.status)}
                    </span>
                  </div>

                  <div className={['tw-mt-2 tw-text-base tw-font-semibold tw-leading-snug', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>
                    {ticket.issueType}
                  </div>
                  <div className={['tw-mt-1 tw-text-xs md:tw-text-sm', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                    {ticket.email} • {new Date(ticket.createdAt).toLocaleString()}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedTicket ? (
            <article
              className={[
                'tw-rounded-xl tw-border',
                isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E6ECF4] tw-bg-white',
              ].join(' ')}
            >
              <div className="tw-border-b tw-border-[var(--admin-card-border,#d6e4f2)] tw-p-4">
                <div className={['tw-text-xl tw-leading-tight tw-font-semibold md:tw-text-2xl', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>
                  {selectedTicket.issueType}
                </div>
                <div className={['tw-mt-1 tw-text-xs', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                  {selectedTicket.email} · {new Date(selectedTicket.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="tw-space-y-3 tw-p-4">
                <div className={[
                  'tw-max-w-[78%] tw-rounded-2xl tw-p-4 tw-text-xs md:tw-text-sm tw-leading-relaxed',
                  isDark ? 'tw-bg-slate-800 tw-text-slate-100' : 'tw-bg-[#EEF2F7] tw-text-[#0f172a]',
                ].join(' ')}>
                  <div>{selectedTicket.description}</div>
                  <div className={['tw-mt-2 tw-text-xs', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                    {new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {selectedTicket.adminReply ? (
                  <div className="tw-flex tw-justify-end">
                    <div className={[
                      'tw-max-w-[78%] tw-rounded-2xl tw-bg-cyan-500 tw-p-4 tw-text-xs md:tw-text-sm tw-leading-relaxed tw-text-white',
                      isDark ? 'tw-bg-cyan-600' : 'tw-bg-[#14A3B8]',
                    ].join(' ')}>
                      <div>{selectedTicket.adminReply}</div>
                      <div className="tw-mt-2 tw-text-xs tw-text-cyan-100">Admin reply</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="tw-border-t tw-border-[var(--admin-card-border,#d6e4f2)] tw-p-4">
                <div className="tw-flex tw-gap-2">
                  <input
                    value={selectedDraft}
                    onChange={(event) => onReplyDraftChange(selectedTicket._id, event.target.value)}
                    placeholder="Type your reply..."
                    className={[
                      'tw-h-12 tw-flex-1 tw-rounded-xl tw-border tw-px-3 tw-text-xs md:tw-text-sm tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500/30',
                      isDark ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100' : 'tw-border-[#D9E2EC] tw-bg-white tw-text-[#111827]',
                    ].join(' ')}
                  />
                  <button
                    type="button"
                    onClick={() => onReply(selectedTicket._id, selectedDraft)}
                    disabled={replyingId === selectedTicket._id || !selectedDraft.trim()}
                    className="tw-inline-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-xl tw-bg-[#14A3B8] tw-text-white hover:tw-bg-[#0f8ea1] disabled:tw-opacity-60"
                  >
                    {replyingId === selectedTicket._id ? <Loader2 size={16} className="tw-animate-spin" /> : <Send size={16} />}
                  </button>
                </div>

                <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
                  <button
                    type="button"
                    onClick={() => onStatus(selectedTicket._id, 'in-progress')}
                    disabled={statusBusyId === selectedTicket._id || selectedTicket.status === 'in-progress'}
                    className={[
                      'tw-rounded-xl tw-border tw-px-4 tw-py-2 tw-text-xs md:tw-text-sm tw-font-semibold',
                      isDark ? 'tw-border-slate-600 tw-bg-slate-800 tw-text-slate-100 hover:tw-bg-slate-700 disabled:tw-opacity-60' : 'tw-border-[#D3DCE8] tw-bg-white tw-text-[#0f172a] hover:tw-bg-[#F8FAFC] disabled:tw-opacity-60',
                    ].join(' ')}
                  >
                    Mark In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatus(selectedTicket._id, 'resolved')}
                    disabled={statusBusyId === selectedTicket._id || selectedTicket.status === 'resolved'}
                    className={[
                      'tw-rounded-xl tw-border tw-px-4 tw-py-2 tw-text-xs md:tw-text-sm tw-font-semibold',
                      isDark ? 'tw-border-slate-600 tw-bg-slate-800 tw-text-slate-100 hover:tw-bg-slate-700 disabled:tw-opacity-60' : 'tw-border-[#D3DCE8] tw-bg-white tw-text-[#0f172a] hover:tw-bg-[#F8FAFC] disabled:tw-opacity-60',
                    ].join(' ')}
                  >
                    Resolve
                  </button>
                </div>

                <div className={['tw-mt-3 tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                  <RefreshCw size={12} />
                  Auto-refreshing
                  {lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString()}` : ''}
                </div>
              </div>
            </article>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  )
}
