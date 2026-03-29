import { StatusBadge, SectionCard } from '../../components/admin/AdminUi'

export function VendorsPage({ isDark, vendors = [], onViewDetails, onViewProfile, onViewFeedback, onFlag, onTerminate, onReactivate }) {
  const neutralButtonClass = [
    'tw-rounded-lg tw-border tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-shadow-sm tw-transition-all tw-duration-200',
    isDark
      ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 hover:tw-bg-slate-800'
      : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] hover:tw-bg-[#F9FAFB]',
  ].join(' ')

  return (
    <SectionCard title="Vendor Monitoring" subtitle="Audit vendors, review risk posture, and take enforcement actions.">
      <div
        className={[
          'tw-overflow-x-auto tw-rounded-[12px] tw-border tw-shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
          isDark ? 'tw-border-slate-700 tw-bg-slate-950' : 'tw-border-[#E5E7EB] tw-bg-white',
        ].join(' ')}
      >
        <table className="tw-min-w-full tw-text-sm">
          <thead>
            <tr className={[
              'tw-border-b tw-text-left',
              isDark ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-400' : 'tw-border-[#E5E7EB] tw-bg-[#F9FAFB] tw-text-[#6B7280]',
            ].join(' ')}>
              <th className="tw-px-4 tw-py-3 tw-font-semibold">Vendor Name</th>
              <th className="tw-px-4 tw-py-3 tw-font-semibold">Email</th>
              <th className="tw-px-4 tw-py-3 tw-font-semibold">Trust Score</th>
              <th className="tw-px-4 tw-py-3 tw-font-semibold">Status</th>
              <th className="tw-px-4 tw-py-3 tw-font-semibold tw-text-center">Orders</th>
              <th className="tw-px-4 tw-py-3 tw-font-semibold tw-text-center">Feedbacks</th>
              <th className="tw-px-4 tw-py-3 tw-font-semibold tw-text-center">Suspicious Activity</th>
              <th className="tw-px-4 tw-py-3 tw-font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.vendorId} className={[
                'tw-border-b',
                isDark ? 'tw-border-slate-800 hover:tw-bg-slate-800/40' : 'tw-border-[#E5E7EB] hover:tw-bg-[#F9FAFB]',
              ].join(' ')}>
                <td className={['tw-px-4 tw-py-3.5 tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#111827]'].join(' ')}>{vendor.name}</td>
                <td className={['tw-px-4 tw-py-3.5 tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#6B7280]'].join(' ')}>{vendor.contactEmail || 'n/a'}</td>
                <td className={['tw-px-4 tw-py-3.5 tw-font-bold', isDark ? 'tw-text-slate-100' : 'tw-text-[#111827]'].join(' ')}>{vendor.averageTrustScore}</td>
                <td className="tw-px-4 tw-py-3.5"><StatusBadge status={vendor.statusBadge} /></td>
                <td className={['tw-px-4 tw-py-3.5 tw-text-center tw-font-semibold', isDark ? 'tw-text-slate-200' : 'tw-text-[#111827]'].join(' ')}>{vendor.ordersCount}</td>
                <td className={['tw-px-4 tw-py-3.5 tw-text-center tw-font-semibold', isDark ? 'tw-text-slate-200' : 'tw-text-[#111827]'].join(' ')}>{vendor.totalFeedbacks}</td>
                <td className={['tw-px-4 tw-py-3.5 tw-text-center tw-font-semibold', Number(vendor.suspiciousActivityCount) > 0 ? 'tw-text-[#EF4444]' : isDark ? 'tw-text-slate-200' : 'tw-text-[#111827]'].join(' ')}>{vendor.suspiciousActivityCount}</td>
                <td className="tw-px-4 tw-py-3.5 tw-align-top">
                  <div className="tw-grid tw-min-w-[220px] tw-grid-cols-1 tw-gap-2 sm:tw-grid-cols-2">
                    <button type="button" className={neutralButtonClass} onClick={() => onViewDetails(vendor.vendorId)}>
                      View Details
                    </button>
                    <button type="button" className={neutralButtonClass} onClick={() => onViewProfile(vendor.vendorId)}>
                      View Profile
                    </button>
                    <button type="button" className={neutralButtonClass} onClick={() => onViewFeedback(vendor.vendorId)}>
                      View Feedback
                    </button>
                    {!vendor.isFlagged ? (
                      <button type="button" className="tw-rounded-lg tw-bg-[#F59E0B] tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-text-white tw-shadow-sm tw-transition-all tw-duration-200 hover:tw-bg-amber-600" onClick={() => onFlag(vendor.vendorId)}>
                        Flag Vendor
                      </button>
                    ) : null}
                    {vendor.isTerminated ? (
                      <button type="button" className="tw-rounded-lg tw-bg-[#22C55E] tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-text-white tw-shadow-sm tw-transition-all tw-duration-200 hover:tw-bg-emerald-600" onClick={() => onReactivate(vendor.vendorId)}>
                        Reactivate
                      </button>
                    ) : (
                      <button type="button" className="tw-rounded-lg tw-bg-[#EF4444] tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-text-white tw-shadow-sm tw-transition-all tw-duration-200 hover:tw-bg-rose-600" onClick={() => onTerminate(vendor.vendorId)}>
                        Terminate Vendor
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
