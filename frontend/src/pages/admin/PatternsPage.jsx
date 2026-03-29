import { SectionCard } from '../../components/admin/AdminUi'

function ClusterTable({ isDark, rows, clusterHeader = 'Cluster', valueHeader = 'Volume' }) {
  return (
    <div className={[
      'tw-overflow-x-auto tw-rounded-xl tw-border',
      isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
    ].join(' ')}>
      <table className="tw-min-w-full tw-text-sm">
        <thead>
          <tr className={[
            'tw-border-b tw-text-left',
            isDark ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-400' : 'tw-border-[#E2E8F0] tw-bg-slate-50 tw-text-[#64748B]',
          ].join(' ')}>
            <th className="tw-px-2 tw-py-2 tw-font-semibold">{clusterHeader}</th>
            <th className="tw-px-2 tw-py-2 tw-font-semibold">{valueHeader}</th>
            <th className="tw-px-2 tw-py-2 tw-font-semibold">Vendors</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.clusterId} className={['tw-border-b hover:tw-bg-slate-50/70', isDark ? 'tw-border-slate-800 hover:tw-bg-slate-800/50' : 'tw-border-slate-100'].join(' ')}>
              <td className={['tw-px-2 tw-py-2 tw-font-mono tw-text-xs', isDark ? 'tw-text-slate-300' : 'tw-text-[#0F172A]'].join(' ')}>{row.clusterId}</td>
              <td className={['tw-px-2 tw-py-2 tw-font-bold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{row.volume}</td>
              <td className={['tw-px-2 tw-py-2 tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>{row.vendorsInvolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PatternsPage({ isDark, patterns }) {
  return (
    <div className="tw-grid tw-gap-6 xl:tw-grid-cols-3">
      <SectionCard title="Similar Feedback Clusters" subtitle="Potential duplicate language clusters.">
        <ClusterTable isDark={isDark} rows={patterns?.similarFeedbackClusters || []} />
      </SectionCard>

      <SectionCard title="Device Clusters" subtitle="Repeated device hash patterns.">
        <ClusterTable isDark={isDark} rows={patterns?.deviceClusters || []} />
      </SectionCard>

      <SectionCard title="Location Clusters" subtitle="High-volume location patterns.">
        <ClusterTable isDark={isDark} rows={patterns?.locationClusters || []} clusterHeader="Location Cluster" />
      </SectionCard>
    </div>
  )
}
