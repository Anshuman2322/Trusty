import { useMemo } from 'react'
import { FeedbackExplanation } from '../../components/FeedbackExplanation'
import { SectionCard } from '../../components/admin/AdminUi'

export function FeedbackPage({ isDark, feedbacks = [], filters, onFilterChange }) {
  const filtered = useMemo(() => {
    return feedbacks.filter((item) => {
      if (filters.vendorId && String(item.vendorId) !== String(filters.vendorId)) return false

      if (filters.trust !== 'ALL' && String(item.trustLevel || '').toUpperCase() !== filters.trust) return false

      if (filters.anonymous) {
        const name = String(item.displayName || '').trim().toLowerCase()
        if (name && name !== 'anonymous') return false
      }

      if (filters.duplicate) {
        const hasDuplicateTag = (item.tags || []).some((tag) => String(tag).toLowerCase() === 'duplicate')
        if (!hasDuplicateTag && Number(item.dupAdj || 0) >= 0) return false
      }

      return true
    })
  }, [feedbacks, filters])

  return (
    <SectionCard title="Feedback Monitoring" subtitle="Read-only review with AI, duplicate, and suspicious flags.">
      <div className="tw-mb-5 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <input
          className={[
            'tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
            isDark
              ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
              : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
          ].join(' ')}
          value={filters.vendorId}
          onChange={(event) => onFilterChange({ ...filters, vendorId: event.target.value.trim() })}
          placeholder="Vendor ID filter"
        />

        <select
          className={[
            'tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
            isDark
              ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
              : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
          ].join(' ')}
          value={filters.trust}
          onChange={(event) => onFilterChange({ ...filters, trust: event.target.value })}
        >
          <option value="ALL">All Trust</option>
          <option value="HIGH">High Trust</option>
          <option value="MEDIUM">Medium Trust</option>
          <option value="LOW">Low Trust</option>
        </select>

        <label className={[
          'tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-medium',
          isDark ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100' : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827]',
        ].join(' ')}>
          <input
            type="checkbox"
            checked={filters.anonymous}
            onChange={(event) => onFilterChange({ ...filters, anonymous: event.target.checked })}
          />
          Anonymous
        </label>

        <label className={[
          'tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-medium',
          isDark ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100' : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827]',
        ].join(' ')}>
          <input
            type="checkbox"
            checked={filters.duplicate}
            onChange={(event) => onFilterChange({ ...filters, duplicate: event.target.checked })}
          />
          Duplicate
        </label>
      </div>

      <div className={[
        'tw-overflow-x-auto tw-rounded-[12px] tw-border tw-shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
        isDark ? 'tw-border-slate-700 tw-bg-slate-950' : 'tw-border-[#E5E7EB] tw-bg-white',
      ].join(' ')}>
        <table className="tw-min-w-full tw-text-sm">
          <thead>
            <tr
              className={[
                'tw-border-b tw-text-left',
                isDark ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-400' : 'tw-border-[#E5E7EB] tw-bg-[#F9FAFB] tw-text-[#6B7280]',
              ].join(' ')}
            >
              <th className="tw-px-3 tw-py-2 tw-font-semibold">Trust Score</th>
              <th className="tw-px-3 tw-py-2 tw-font-semibold">Rating</th>
              <th className="tw-px-3 tw-py-2 tw-font-semibold">Flags</th>
              <th className="tw-px-3 tw-py-2 tw-font-semibold">Vendor</th>
              <th className="tw-px-3 tw-py-2 tw-font-semibold">Text</th>
              <th className="tw-px-3 tw-py-2 tw-font-semibold">Explain</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((feedback) => (
              <tr
                key={feedback._id}
                className={[
                  'tw-border-b',
                  isDark ? 'tw-border-slate-700 hover:tw-bg-slate-800/60' : 'tw-border-[#E5E7EB] hover:tw-bg-[#F9FAFB]',
                ].join(' ')}
              >
                <td className={['tw-px-3 tw-py-3 tw-font-bold', isDark ? 'tw-text-slate-100' : 'tw-text-[#111827]'].join(' ')}>{feedback.trustScore}</td>
                <td className={['tw-px-3 tw-py-3 tw-font-medium', isDark ? 'tw-text-slate-100' : 'tw-text-[#111827]'].join(' ')}>{feedback.rating || 'n/a'}</td>
                <td className={['tw-px-3 tw-py-3 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#6B7280]'].join(' ')}>{(feedback.tags || []).join(', ') || 'none'}</td>
                <td className={['tw-px-3 tw-py-3 tw-text-xs tw-font-mono', isDark ? 'tw-text-slate-400' : 'tw-text-[#6B7280]'].join(' ')}>{String(feedback.vendorId || '').slice(0, 10)}...</td>
                <td className={['tw-px-3 tw-py-3 tw-max-w-[420px] tw-truncate tw-font-medium', isDark ? 'tw-text-slate-100' : 'tw-text-[#111827]'].join(' ')} title={feedback.text}>{feedback.text}</td>
                <td className="tw-px-3 tw-py-3">
                  <FeedbackExplanation
                    feedback={feedback}
                    buttonLabel="Explain"
                    buttonClassName={[
                      'tw-rounded-lg tw-border tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-transition-all tw-duration-200',
                      isDark
                        ? 'tw-border-slate-600 tw-bg-slate-900 tw-text-slate-100 hover:tw-bg-slate-800'
                        : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] hover:tw-bg-[#F9FAFB]',
                    ].join(' ')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
