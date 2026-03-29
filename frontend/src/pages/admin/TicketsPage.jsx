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
  return (
    <SectionCard title="Support Tickets" subtitle="Admin escalation queue with triage, responses, and resolution states.">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
        <div className={['tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-slate-600'].join(' ')}>
          Auto-refresh: every 15 seconds.
          {lastSyncedAt ? ` Last synced at ${new Date(lastSyncedAt).toLocaleTimeString()}.` : ''}
        </div>
        <button
          type="button"
          className={[
            'tw-rounded-lg tw-border tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-transition-all tw-duration-200',
            isDark ? 'tw-border-slate-600 tw-bg-slate-800 tw-text-slate-100 hover:tw-bg-slate-700' : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] hover:tw-bg-[#F9FAFB]',
          ].join(' ')}
          onClick={onRefresh}
        >
          Refresh Now
        </button>
      </div>

      <div className="tw-flex tw-flex-wrap tw-gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onFilterChange(option)}
            className={[
              'tw-rounded-full tw-border tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-capitalize tw-transition',
              statusFilter === option
                ? 'tw-border-[#2563EB] tw-bg-[#2563EB] tw-text-white'
                : isDark
                  ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-200 hover:tw-bg-slate-800'
                  : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#6B7280] hover:tw-bg-[#F9FAFB]',
            ].join(' ')}
          >
            {option}
          </button>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className={['tw-mt-4 tw-rounded-xl tw-border tw-p-4 tw-text-sm', isDark ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-300' : 'tw-border-slate-200 tw-bg-slate-50 tw-text-slate-600'].join(' ')}>
          No tickets in this filter.
        </div>
      ) : null}

      <div className="tw-mt-4 tw-grid tw-gap-4">
        {tickets.map((ticket) => (
          <article
            key={ticket._id}
            className={[
              'tw-rounded-[12px] tw-border tw-p-4 tw-shadow-[0_4px_12px_rgba(0,0,0,0.08)] tw-transition-all tw-duration-200 hover:-tw-translate-y-0.5 hover:tw-shadow-[0_6px_16px_rgba(0,0,0,0.12)]',
              isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E5E7EB] tw-bg-white',
            ].join(' ')}
          >
            <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
              <div>
                <div className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-slate-900'].join(' ')}>
                  {ticket.issueType} - #{String(ticket._id).slice(-6).toUpperCase()}
                </div>
                <div className={['tw-mt-1 tw-text-xs', isDark ? 'tw-text-slate-400' : 'tw-text-slate-500'].join(' ')}>
                  {ticket.email} - {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="tw-flex tw-items-center tw-gap-2">
                <span className={[
                  'tw-rounded-full tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-semibold tw-uppercase',
                  ticket.status === 'resolved'
                    ? isDark ? 'tw-bg-emerald-500/20 tw-text-emerald-200' : 'tw-bg-emerald-100 tw-text-emerald-700'
                    : ticket.status === 'in-progress'
                      ? isDark ? 'tw-bg-amber-500/20 tw-text-amber-200' : 'tw-bg-amber-100 tw-text-amber-700'
                      : isDark ? 'tw-bg-sky-500/20 tw-text-sky-200' : 'tw-bg-sky-100 tw-text-sky-700',
                ].join(' ')}>
                  {ticket.status}
                </span>
                <select
                  className={[
                    'tw-rounded-lg tw-border tw-px-2 tw-py-1 tw-text-xs',
                    isDark ? 'tw-border-slate-600 tw-bg-slate-800 tw-text-slate-100' : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827]',
                  ].join(' ')}
                  value={ticket.status}
                  onChange={(event) => onStatus(ticket._id, event.target.value)}
                  disabled={statusBusyId === ticket._id}
                >
                  <option value="open">open</option>
                  <option value="in-progress">in-progress</option>
                  <option value="resolved">resolved</option>
                </select>
              </div>
            </div>

            <p className={['tw-mt-3 tw-text-sm tw-leading-6', isDark ? 'tw-text-slate-200' : 'tw-text-slate-700'].join(' ')}>{ticket.description}</p>

            {ticket.adminReply ? (
              <div className={[
                'tw-mt-3 tw-rounded-xl tw-border tw-p-3 tw-text-sm',
                isDark ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-200' : 'tw-border-slate-200 tw-bg-slate-50 tw-text-slate-700',
              ].join(' ')}>
                <strong>Latest admin reply:</strong> {ticket.adminReply}
              </div>
            ) : null}

            <div className="tw-mt-3 tw-grid tw-gap-2">
              <textarea
                value={replyDrafts[ticket._id] || ''}
                onChange={(event) => onReplyDraftChange(ticket._id, event.target.value)}
                placeholder="Write a clear and actionable response"
                className={[
                  'tw-min-h-20 tw-rounded-xl tw-border tw-p-3 tw-text-sm tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500/30',
                  isDark ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100' : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827]',
                ].join(' ')}
              />
              <div className="tw-flex tw-justify-end">
                <button
                  type="button"
                  onClick={() => onReply(ticket._id, replyDrafts[ticket._id] || '')}
                  disabled={replyingId === ticket._id || !(replyDrafts[ticket._id] || '').trim()}
                  className="tw-rounded-lg tw-bg-slate-900 tw-px-3 tw-py-2 tw-text-xs tw-font-semibold tw-text-white hover:tw-bg-slate-800 disabled:tw-opacity-60"
                >
                  {replyingId === ticket._id ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  )
}
