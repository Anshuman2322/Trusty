import { KpiCard, SectionCard, StatusBadge } from '../../components/admin/AdminUi'

function formatDate(value) {
  if (!value) return 'n/a'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'n/a'
  return dt.toLocaleString()
}

function ProfileRow({ isDark, label, value }) {
  return (
    <div className={[
      'tw-rounded-xl tw-border tw-p-3 tw-shadow-sm',
      isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
    ].join(' ')}>
      <div className={['tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>{label}</div>
      <div className={['tw-mt-1 tw-text-sm tw-font-semibold tw-break-words', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{value || 'n/a'}</div>
    </div>
  )
}

export function VendorProfilePage({ isDark, profile }) {
  if (!profile) {
    return (
      <SectionCard title="Vendor Profile" subtitle="Choose a vendor from Vendor Monitoring and click View Profile.">
        <p className={['tw-text-sm', isDark ? 'tw-text-slate-400' : 'tw-text-slate-600'].join(' ')}>No vendor selected.</p>
      </SectionCard>
    )
  }

  const p = profile.profile || {}
  const account = profile.account || {}
  const metrics = profile.metrics || {}
  const status = profile.status || {}

  return (
    <div className="tw-space-y-6 lg:tw-space-y-8">
      <SectionCard title={p.businessName || 'Vendor Profile'} subtitle="Complete vendor profile submitted from vendor profile settings.">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <StatusBadge status={status.statusBadge || 'Unknown'} />
          {status.isFlagged ? <span className="tw-rounded-full tw-bg-amber-100 tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold tw-text-amber-800">Flagged</span> : null}
          {status.isTerminated ? <span className="tw-rounded-full tw-bg-rose-100 tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold tw-text-rose-700">Terminated</span> : null}
        </div>
      </SectionCard>

      <div className="tw-grid tw-gap-4 md:tw-grid-cols-2 xl:tw-grid-cols-4">
        <KpiCard isDark={isDark} title="Average Trust Score" value={metrics.averageTrustScore ?? 0} tone="blue" />
        <KpiCard isDark={isDark} title="Total Feedbacks" value={metrics.totalFeedbacks ?? 0} tone="green" />
        <KpiCard isDark={isDark} title="Low Trust Feedbacks" value={metrics.lowTrustCount ?? 0} tone="rose" />
        <KpiCard isDark={isDark} title="Total Orders" value={metrics.totalOrders ?? 0} tone="amber" />
      </div>

      <SectionCard title="Business Profile" subtitle="Details entered in vendor profile section.">
        <div className="tw-grid tw-gap-3 md:tw-grid-cols-2 xl:tw-grid-cols-3">
          <ProfileRow isDark={isDark} label="Business Name" value={p.businessName} />
          <ProfileRow isDark={isDark} label="Business Email" value={p.businessEmail} />
          <ProfileRow isDark={isDark} label="Business Category" value={p.businessCategory} />
          <ProfileRow isDark={isDark} label="Business Website" value={p.businessWebsite} />
          <ProfileRow isDark={isDark} label="Business ID" value={p.businessId} />
          <ProfileRow isDark={isDark} label="Country" value={p.country} />
          <ProfileRow isDark={isDark} label="State" value={p.state} />
          <ProfileRow isDark={isDark} label="City" value={p.city} />
          <ProfileRow isDark={isDark} label="Contact Person" value={p.contactPersonName} />
          <ProfileRow isDark={isDark} label="Phone Number" value={p.phoneNumber} />
          <ProfileRow isDark={isDark} label="Support Email" value={p.supportEmail} />
        </div>

        <div className={[
          'tw-mt-3 tw-rounded-xl tw-border tw-p-4 tw-shadow-sm',
          isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
        ].join(' ')}>
          <div className={['tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>About / Description</div>
          <p className={['tw-mt-2 tw-whitespace-pre-wrap tw-text-sm tw-leading-relaxed', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{p.description || 'n/a'}</p>
        </div>
      </SectionCard>

      <SectionCard title="Account & Login Metadata" subtitle="Created timestamps and login information.">
        <div className="tw-grid tw-gap-3 md:tw-grid-cols-2 xl:tw-grid-cols-3">
          <ProfileRow isDark={isDark} label="Login Email" value={account.loginEmail} />
          <ProfileRow isDark={isDark} label="Vendor Created At" value={formatDate(account.vendorCreatedAt)} />
          <ProfileRow isDark={isDark} label="Vendor Updated At" value={formatDate(account.vendorUpdatedAt)} />
          <ProfileRow isDark={isDark} label="User Created At" value={formatDate(account.userCreatedAt)} />
          <ProfileRow isDark={isDark} label="Last Login" value={formatDate(account.lastLoginAt)} />
        </div>
      </SectionCard>
    </div>
  )
}
