import { SectionCard } from '../../components/admin/AdminUi'

const reportButtons = [
  { key: 'feedback', label: 'Export Feedback Data (CSV)' },
  { key: 'vendor', label: 'Export Vendor Report (CSV)' },
  { key: 'analytics', label: 'Export Analytics Report (CSV)' },
]

export function ReportsPage({ isDark, onExport, exporting }) {
  return (
    <SectionCard title="Reports" subtitle="Generate downloadable audit exports for compliance and internal investigation.">
      <div className="tw-grid tw-gap-4 md:tw-grid-cols-2">
        {reportButtons.map((button) => (
          <button
            key={button.key}
            type="button"
            className={[
              'tw-rounded-2xl tw-border tw-p-4 tw-text-left tw-shadow-md tw-transition hover:tw--translate-y-0.5 hover:tw-shadow-lg',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 hover:tw-bg-slate-800'
                : 'tw-border-[#E2E8F0] tw-bg-white hover:tw-bg-slate-50',
            ].join(' ')}
            onClick={() => onExport(button.key)}
            disabled={exporting === button.key}
          >
            <div className={['tw-text-base tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{button.label}</div>
            <div className={['tw-mt-1 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
              {exporting === button.key ? 'Preparing file...' : 'Includes current live platform data'}
            </div>
          </button>
        ))}
      </div>
    </SectionCard>
  )
}
