export const BUSINESS_CATEGORIES = ['Electronics', 'Services', 'Retail', 'Food', 'Other']

export const COUNTRY_OPTIONS = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'Other',
]

export const PUBLIC_VISIBILITY_DEFAULTS = {
  businessName: true,
  businessEmail: false,
  businessCategory: true,
  businessWebsite: false,
  businessId: false,
  country: true,
  state: false,
  city: false,
  contactPersonName: false,
  phoneNumber: false,
  supportEmail: false,
  description: false,
  trustScore: true,
}

export function normalizePublicVisibility(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {}

  return {
    businessName: typeof source.businessName === 'boolean' ? source.businessName : PUBLIC_VISIBILITY_DEFAULTS.businessName,
    businessEmail: typeof source.businessEmail === 'boolean' ? source.businessEmail : PUBLIC_VISIBILITY_DEFAULTS.businessEmail,
    businessCategory:
      typeof source.businessCategory === 'boolean' ? source.businessCategory : PUBLIC_VISIBILITY_DEFAULTS.businessCategory,
    businessWebsite:
      typeof source.businessWebsite === 'boolean' ? source.businessWebsite : PUBLIC_VISIBILITY_DEFAULTS.businessWebsite,
    businessId: typeof source.businessId === 'boolean' ? source.businessId : PUBLIC_VISIBILITY_DEFAULTS.businessId,
    country: typeof source.country === 'boolean' ? source.country : PUBLIC_VISIBILITY_DEFAULTS.country,
    state: typeof source.state === 'boolean' ? source.state : PUBLIC_VISIBILITY_DEFAULTS.state,
    city: typeof source.city === 'boolean' ? source.city : PUBLIC_VISIBILITY_DEFAULTS.city,
    contactPersonName:
      typeof source.contactPersonName === 'boolean'
        ? source.contactPersonName
        : PUBLIC_VISIBILITY_DEFAULTS.contactPersonName,
    phoneNumber: typeof source.phoneNumber === 'boolean' ? source.phoneNumber : PUBLIC_VISIBILITY_DEFAULTS.phoneNumber,
    supportEmail: typeof source.supportEmail === 'boolean' ? source.supportEmail : PUBLIC_VISIBILITY_DEFAULTS.supportEmail,
    description: typeof source.description === 'boolean' ? source.description : PUBLIC_VISIBILITY_DEFAULTS.description,
    trustScore: typeof source.trustScore === 'boolean' ? source.trustScore : PUBLIC_VISIBILITY_DEFAULTS.trustScore,
  }
}

export function emptyProfile(overrides = {}) {
  const source = overrides && typeof overrides === 'object' ? overrides : {}
  const publicVisibility = normalizePublicVisibility(source.publicVisibility)

  return {
    businessName: '',
    businessEmail: '',
    businessCategory: 'Electronics',
    businessWebsite: '',
    businessId: '',
    country: 'India',
    state: '',
    city: '',
    contactPersonName: '',
    phoneNumber: '',
    supportEmail: '',
    description: '',
    trustScore: null,
    ...source,
    publicVisibility,
  }
}

export function normalizeProfile(raw = {}, fallbackTrustScore = null) {
  const score = Number(raw?.trustScore ?? fallbackTrustScore)

  return emptyProfile({
    businessName: String(raw?.businessName || '').trim(),
    businessEmail: String(raw?.businessEmail || '').trim(),
    businessCategory: String(raw?.businessCategory || 'Electronics').trim() || 'Electronics',
    businessWebsite: String(raw?.businessWebsite || '').trim(),
    businessId: String(raw?.businessId || '').trim(),
    country: String(raw?.country || 'India').trim() || 'India',
    state: String(raw?.state || '').trim(),
    city: String(raw?.city || '').trim(),
    contactPersonName: String(raw?.contactPersonName || '').trim(),
    phoneNumber: String(raw?.phoneNumber || '').trim(),
    supportEmail: String(raw?.supportEmail || '').trim(),
    description: String(raw?.description || '').trim(),
    publicVisibility: normalizePublicVisibility(raw?.publicVisibility),
    trustScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
  })
}
