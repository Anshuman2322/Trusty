import { SectionCard } from '../../components/admin/AdminUi'

export function SettingsPage({ isDark, themeMode = 'light', onThemeModeChange, settings, onChange, onSave, saving }) {
  const current = settings || {
    trustThresholds: { trustedMin: 71, mediumMin: 40 },
    fraudSensitivity: 'MEDIUM',
    alerts: { repeatedDeviceMin: 3, networkReviewMin: 3, duplicateClusterMin: 2, vendorSpikeMin: 8 },
  }

  return (
    <SectionCard
      title="Admin Settings"
      subtitle="Configure trust thresholds, fraud sensitivity, and alert trigger rules."
      actions={(
        <button
          type="button"
          className={[
            'tw-rounded-xl tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-text-white tw-shadow-sm',
            isDark ? 'tw-bg-sky-600 hover:tw-bg-sky-500' : 'tw-bg-[#0F172A] hover:tw-bg-slate-800',
          ].join(' ')}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      )}
    >
      <div className="tw-grid tw-gap-6 lg:tw-grid-cols-2">
        <div className={[
          'tw-space-y-3 tw-rounded-2xl tw-border tw-p-4 tw-shadow-sm lg:tw-col-span-2',
          isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
        ].join(' ')}>
          <h3 className={['tw-text-base tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>Workspace Theme</h3>
          <p className={['tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
            Toggle preferred workspace theme mode.
          </p>
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            <button
              type="button"
              className={[
                'tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-transition-all tw-duration-200',
                themeMode === 'light'
                  ? 'tw-border-blue-500 tw-bg-blue-600 tw-text-white tw-shadow-sm'
                  : isDark
                    ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-200 hover:tw-bg-slate-700'
                    : 'tw-border-[#E2E8F0] tw-bg-[#EFF6FF] tw-text-[#0F172A] hover:tw-bg-[#DBEAFE]',
              ].join(' ')}
              onClick={() => onThemeModeChange?.('light')}
            >
              Light Mode
            </button>
            <button
              type="button"
              className={[
                'tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-transition-all tw-duration-200',
                themeMode === 'dark'
                  ? 'tw-border-blue-500 tw-bg-blue-600 tw-text-white tw-shadow-sm'
                  : isDark
                    ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-200 hover:tw-bg-slate-700'
                    : 'tw-border-[#E2E8F0] tw-bg-[#EFF6FF] tw-text-[#0F172A] hover:tw-bg-[#DBEAFE]',
              ].join(' ')}
              onClick={() => onThemeModeChange?.('dark')}
            >
              Dark Mode
            </button>
          </div>
        </div>

        <div className={[
          'tw-space-y-3 tw-rounded-2xl tw-border tw-p-4 tw-shadow-sm',
          isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
        ].join(' ')}>
          <h3 className={['tw-text-base tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>Trust Thresholds</h3>
          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
            Trusted minimum
            <input
              type="number"
              min={0}
              max={100}
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-font-semibold tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-[#E2E8F0] tw-bg-white tw-text-[#0F172A] focus:tw-ring-sky-100',
              ].join(' ')}
              value={current.trustThresholds.trustedMin}
              onChange={(event) => onChange({
                ...current,
                trustThresholds: {
                  ...current.trustThresholds,
                  trustedMin: Number(event.target.value),
                },
              })}
            />
          </label>

          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
            Medium minimum
            <input
              type="number"
              min={0}
              max={100}
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-font-semibold tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-[#E2E8F0] tw-bg-white tw-text-[#0F172A] focus:tw-ring-sky-100',
              ].join(' ')}
              value={current.trustThresholds.mediumMin}
              onChange={(event) => onChange({
                ...current,
                trustThresholds: {
                  ...current.trustThresholds,
                  mediumMin: Number(event.target.value),
                },
              })}
            />
          </label>
        </div>

        <div className={[
          'tw-space-y-3 tw-rounded-2xl tw-border tw-p-4 tw-shadow-sm',
          isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
        ].join(' ')}>
          <h3 className={['tw-text-base tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>Fraud Controls</h3>
          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
            Fraud sensitivity
            <select
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-font-semibold tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-[#E2E8F0] tw-bg-white tw-text-[#0F172A] focus:tw-ring-sky-100',
              ].join(' ')}
              value={current.fraudSensitivity}
              onChange={(event) => onChange({ ...current, fraudSensitivity: event.target.value })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>

          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
            Repeated device threshold
            <input
              type="number"
              min={2}
              max={20}
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-font-semibold tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-[#E2E8F0] tw-bg-white tw-text-[#0F172A] focus:tw-ring-sky-100',
              ].join(' ')}
              value={current.alerts.repeatedDeviceMin}
              onChange={(event) => onChange({
                ...current,
                alerts: {
                  ...current.alerts,
                  repeatedDeviceMin: Number(event.target.value),
                },
              })}
            />
          </label>

          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
            Network review threshold
            <input
              type="number"
              min={2}
              max={20}
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-font-semibold tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-[#E2E8F0] tw-bg-white tw-text-[#0F172A] focus:tw-ring-sky-100',
              ].join(' ')}
              value={current.alerts.networkReviewMin}
              onChange={(event) => onChange({
                ...current,
                alerts: {
                  ...current.alerts,
                  networkReviewMin: Number(event.target.value),
                },
              })}
            />
          </label>

          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
            Duplicate cluster threshold
            <input
              type="number"
              min={2}
              max={20}
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-font-semibold tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-[#E2E8F0] tw-bg-white tw-text-[#0F172A] focus:tw-ring-sky-100',
              ].join(' ')}
              value={current.alerts.duplicateClusterMin}
              onChange={(event) => onChange({
                ...current,
                alerts: {
                  ...current.alerts,
                  duplicateClusterMin: Number(event.target.value),
                },
              })}
            />
          </label>

          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
            Vendor spike threshold
            <input
              type="number"
              min={2}
              max={100}
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-font-semibold tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-[#E2E8F0] tw-bg-white tw-text-[#0F172A] focus:tw-ring-sky-100',
              ].join(' ')}
              value={current.alerts.vendorSpikeMin}
              onChange={(event) => onChange({
                ...current,
                alerts: {
                  ...current.alerts,
                  vendorSpikeMin: Number(event.target.value),
                },
              })}
            />
          </label>
        </div>
      </div>
    </SectionCard>
  )
}
