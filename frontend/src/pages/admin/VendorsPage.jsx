import { useMemo, useState } from 'react'
import {
  Eye,
  Flag,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  User,
  XCircle,
} from 'lucide-react'
import { SectionCard } from '../../components/admin/AdminUi'

export function VendorsPage({ isDark, vendors = [], onViewDetails, onViewProfile, onViewFeedback, onOpenFlagModal, onOpenUnflagModal, onTerminate, onReactivate }) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [trustFilter, setTrustFilter] = useState('all')
  const [actionMenuId, setActionMenuId] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return vendors.filter((vendor) => {
      const status = getStatusLabel(vendor)
      const trustBand = getTrustBand(vendor.averageTrustScore)

      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (trustFilter !== 'all' && trustBand !== trustFilter) return false

      if (q) {
        const haystack = [vendor.name, vendor.contactEmail, vendor.category, vendor.vendorId]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [vendors, query, statusFilter, trustFilter])

  return (
    <SectionCard title="Vendors" subtitle="Manage and monitor all registered vendors">
      <div className="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <label
          className={[
            'tw-flex tw-min-w-[260px] tw-flex-1 tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-px-3 tw-py-2',
            isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E5E7EB] tw-bg-white',
          ].join(' ')}
        >
          <Search size={16} className={isDark ? 'tw-text-slate-400' : 'tw-text-[#94A3B8]'} />
          <input
            className={[
              'tw-w-full tw-bg-transparent tw-text-sm tw-font-medium tw-outline-none',
              isDark ? 'tw-text-slate-100 placeholder:tw-text-slate-500' : 'tw-text-[#111827] placeholder:tw-text-[#94A3B8]',
            ].join(' ')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vendors..."
          />
        </label>

        <button
          type="button"
          className={[
            'tw-inline-flex tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-px-4 tw-py-2 tw-text-sm tw-font-semibold',
            isDark
              ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-200 hover:tw-bg-slate-800'
              : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#334155] hover:tw-bg-[#F8FAFC]',
          ].join(' ')}
          onClick={() => setShowFilters((prev) => !prev)}
        >
          <SlidersHorizontal size={16} /> Filter
        </button>
      </div>

      {showFilters ? (
        <div className="tw-mb-4 tw-grid tw-gap-2 sm:tw-grid-cols-2 lg:tw-grid-cols-4">
          <select
            className={[
              'tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
                : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
            ].join(' ')}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="terminated">Terminated</option>
          </select>

          <select
            className={[
              'tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
                : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
            ].join(' ')}
            value={trustFilter}
            onChange={(event) => setTrustFilter(event.target.value)}
          >
            <option value="all">All Trust</option>
            <option value="high">High Trust</option>
            <option value="medium">Medium Trust</option>
            <option value="low">Low Trust</option>
          </select>

          <button
            type="button"
            className={[
              'tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-xs tw-font-semibold',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-300 hover:tw-bg-slate-800'
                : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#475569] hover:tw-bg-[#F8FAFC]',
            ].join(' ')}
            onClick={() => {
              setStatusFilter('all')
              setTrustFilter('all')
              setQuery('')
            }}
          >
            Clear Filters
          </button>

          <div
            className={[
              'tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-semibold',
              isDark ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-300' : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#64748B]',
            ].join(' ')}
          >
            Showing: {filtered.length}
          </div>
        </div>
      ) : null}

      <div
        className={[
          'tw-relative tw-rounded-2xl tw-border tw-shadow-soft',
          isDark ? 'tw-border-slate-700 tw-bg-slate-950' : 'tw-border-[#E5E7EB] tw-bg-white',
        ].join(' ')}
      >
        <div className="tw-overflow-x-auto tw-overflow-y-visible">
          <table className="tw-min-w-full tw-text-sm">
          <thead>
            <tr
              className={[
                'tw-border-b tw-text-left',
                isDark ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-400' : 'tw-border-[#E5E7EB] tw-bg-[#F9FAFB] tw-text-[#6B7280]',
              ].join(' ')}
            >
              <th className="tw-px-5 tw-py-3 tw-font-semibold">Vendor</th>
              <th className="tw-px-5 tw-py-3 tw-font-semibold">Trust Score</th>
              <th className="tw-px-5 tw-py-3 tw-font-semibold">Status</th>
              <th className="tw-px-5 tw-py-3 tw-font-semibold">Orders</th>
              <th className="tw-px-5 tw-py-3 tw-font-semibold">Feedbacks</th>
              <th className="tw-px-5 tw-py-3 tw-font-semibold">Category</th>
              <th className="tw-px-5 tw-py-3 tw-font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((vendor) => (
              <tr
                key={vendor.vendorId}
                className={[
                  'tw-border-b',
                  isDark ? 'tw-border-slate-800 hover:tw-bg-slate-800/40' : 'tw-border-[#E5E7EB] hover:tw-bg-[#F9FAFB]',
                ].join(' ')}
              >
                <td className="tw-px-5 tw-py-4">
                  <div className={['tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#111827]'].join(' ')}>{vendor.name}</div>
                  <div className={['tw-mt-0.5 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                    {`V-${String(vendor.vendorId).slice(-4).toUpperCase()} • ${vendor.contactEmail || 'no-email@unknown'}`}
                  </div>
                </td>

                <td className="tw-px-5 tw-py-4">
                  <div
                    className={[
                      'tw-font-bold',
                      vendor.averageTrustScore >= 71
                        ? 'tw-text-[#22A06B]'
                        : vendor.averageTrustScore >= 40
                          ? 'tw-text-[#D38B00]'
                          : 'tw-text-[#E5484D]',
                    ].join(' ')}
                  >
                    {vendor.averageTrustScore}
                    <span className={isDark ? 'tw-text-slate-500' : 'tw-text-[#94A3B8]'}> /100</span>
                  </div>
                </td>

                <td className="tw-px-5 tw-py-4">
                  <StatusPill vendor={vendor} />
                </td>

                <td className={['tw-px-5 tw-py-4 tw-font-medium', isDark ? 'tw-text-slate-200' : 'tw-text-[#334155]'].join(' ')}>{vendor.ordersCount}</td>
                <td className={['tw-px-5 tw-py-4 tw-font-medium', isDark ? 'tw-text-slate-200' : 'tw-text-[#334155]'].join(' ')}>{vendor.totalFeedbacks}</td>
                <td className={['tw-px-5 tw-py-4 tw-font-medium', isDark ? 'tw-text-slate-300' : 'tw-text-[#475569]'].join(' ')}>{vendor.category || 'Uncategorized'}</td>

                <td className="tw-relative tw-overflow-visible tw-px-5 tw-py-4">
                  <div className="tw-relative tw-overflow-visible">
                    <button
                      type="button"
                      className={[
                        'tw-inline-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-border',
                        isDark
                          ? 'tw-border-slate-700 tw-text-slate-200 hover:tw-bg-slate-800'
                          : 'tw-border-[#E5E7EB] tw-text-[#334155] hover:tw-bg-[#F8FAFC]',
                      ].join(' ')}
                      onClick={() => setActionMenuId((prev) => (prev === vendor.vendorId ? '' : vendor.vendorId))}
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {actionMenuId === vendor.vendorId ? (
                      <div
                        className={[
                          'tw-absolute tw-right-0 tw-top-10 tw-z-50 tw-min-w-[220px] tw-rounded-3xl tw-border-2 tw-p-2.5 tw-shadow-[0_12px_28px_rgba(15,23,42,0.12)]',
                          isDark
                            ? 'tw-border-slate-200 tw-bg-slate-900 tw-ring-1 tw-ring-slate-400/60'
                            : 'tw-border-[#111827] tw-bg-white tw-ring-1 tw-ring-[#111827]/30',
                        ].join(' ')}
                      >
                        <ActionItem
                          icon={Eye}
                          label="View Details"
                          isDark={isDark}
                          tone="primary"
                          onClick={() => { setActionMenuId(''); onViewDetails(vendor.vendorId) }}
                        />
                        <ActionItem
                          icon={User}
                          label="View Profile"
                          isDark={isDark}
                          tone="primary"
                          onClick={() => { setActionMenuId(''); onViewProfile(vendor.vendorId) }}
                        />
                        <ActionItem
                          icon={MessageSquare}
                          label="View Feedback"
                          isDark={isDark}
                          tone="primary"
                          onClick={() => { setActionMenuId(''); onViewFeedback(vendor.vendorId) }}
                        />
                        {vendor.isFlagged ? (
                          <ActionItem
                            icon={RotateCcw}
                            label="Remove Flag"
                            isDark={isDark}
                            tone="primary"
                            onClick={() => { setActionMenuId(''); onOpenUnflagModal(vendor.vendorId, vendor.name) }}
                          />
                        ) : (
                          <ActionItem
                            icon={Flag}
                            label="Flag"
                            isDark={isDark}
                            tone="warn"
                            onClick={() => { setActionMenuId(''); onOpenFlagModal(vendor.vendorId, vendor.name) }}
                          />
                        )}
                        <ActionItem
                          icon={XCircle}
                          label="Terminate"
                          isDark={isDark}
                          tone="danger"
                          disabled={vendor.isTerminated}
                          onClick={() => { setActionMenuId(''); onTerminate(vendor.vendorId) }}
                        />
                        <ActionItem
                          icon={RotateCcw}
                          label="Reactivate"
                          isDark={isDark}
                          tone="good"
                          disabled={!vendor.isTerminated}
                          onClick={() => { setActionMenuId(''); onReactivate(vendor.vendorId) }}
                        />
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </SectionCard>
  )
}

function getTrustBand(score) {
  const value = Number(score || 0)
  if (value >= 71) return 'high'
  if (value >= 40) return 'medium'
  return 'low'
}

function getStatusLabel(vendor) {
  if (vendor?.isTerminated) return 'terminated'
  if (vendor?.isFlagged) return 'flagged'
  return 'active'
}

function StatusPill({ vendor }) {
  const status = getStatusLabel(vendor)
  const statusCls =
    status === 'terminated'
      ? 'tw-bg-rose-50 tw-text-rose-700 tw-border-rose-200'
      : status === 'flagged'
        ? 'tw-bg-amber-50 tw-text-amber-700 tw-border-amber-200'
        : 'tw-bg-emerald-50 tw-text-emerald-700 tw-border-emerald-200'

  const trustBand = getTrustBand(vendor.averageTrustScore)
  const trustCls =
    trustBand === 'high'
      ? 'tw-bg-emerald-50 tw-text-emerald-700 tw-border-emerald-200'
      : trustBand === 'medium'
        ? 'tw-bg-amber-50 tw-text-amber-700 tw-border-amber-200'
        : 'tw-bg-rose-50 tw-text-rose-700 tw-border-rose-200'

  return (
    <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
      <span className={['tw-inline-flex tw-items-center tw-rounded-full tw-border tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold tw-capitalize', statusCls].join(' ')}>
        {status}
      </span>
      <span className={['tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-border tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold', trustCls].join(' ')}>
        <ShieldCheck size={12} />
        {trustBand === 'high' ? 'High Trust' : trustBand === 'medium' ? 'Medium Trust' : 'Low Trust'}
      </span>
    </div>
  )
}

function ActionItem({ label, onClick, isDark, tone = 'default', icon: Icon, disabled = false }) {
  const baseTone =
    tone === 'warn'
      ? isDark
        ? 'tw-text-amber-200'
        : 'tw-text-amber-700'
      : tone === 'danger'
        ? isDark
          ? 'tw-text-rose-300'
          : 'tw-text-rose-600'
        : tone === 'good'
          ? isDark
            ? 'tw-text-slate-100'
            : 'tw-text-[#111827]'
          : isDark
            ? 'tw-text-slate-100'
            : 'tw-text-[#111827]'

  const hoverTone = isDark
    ? 'hover:tw-bg-[#1E3A8A]/35 hover:tw-text-slate-100'
    : 'hover:tw-bg-[#EAF3FF] hover:tw-text-[#111827]'

  return (
    <button
      type="button"
      className={[
        'tw-flex tw-w-full tw-items-center tw-gap-3 tw-rounded-2xl tw-border-0 tw-bg-transparent tw-px-4 tw-py-2.5 tw-text-left tw-text-base tw-font-medium tw-outline-none tw-transition-colors tw-duration-150',
        disabled
          ? isDark
            ? 'tw-text-slate-100 hover:tw-bg-transparent hover:tw-text-slate-100'
            : 'tw-text-[#111827] hover:tw-bg-transparent hover:tw-text-[#111827]'
          : `${baseTone} ${hoverTone}`,
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon ? <Icon size={19} /> : null}
      <span>{label}</span>
    </button>
  )
}
