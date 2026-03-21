import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { DropdownSelect } from './DropdownSelect'
import { SettingsSection } from './SettingsSection'
import { SliderControl } from './SliderControl'
import { ToggleSwitch } from './ToggleSwitch'

const TAB_ITEMS = [
  { key: 'feedback', label: 'Feedback Settings' },
  { key: 'trustFraud', label: 'Trust & Fraud' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'system', label: 'System Preferences' },
  { key: 'advanced', label: 'Advanced' },
]

const DASHBOARD_VIEW_OPTIONS = [
  { label: 'Dashboard', value: 'Dashboard' },
  { label: 'Orders', value: 'Orders' },
  { label: 'Analytics', value: 'Analytics' },
]

const FRAUD_LEVEL_OPTIONS = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
]

const CURRENCY_OPTIONS = [
  { label: 'INR', value: 'INR' },
  { label: 'USD', value: 'USD' },
]

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'English' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'Spanish', value: 'Spanish' },
]

const DEFAULT_SETTINGS = {
  feedback: {
    enableFeedbackCollection: true,
    autoGenerateFeedbackTokens: true,
    allowAnonymousFeedback: true,
    requirePaymentVerification: true,
    requireDeliveryCompletion: true,
  },
  trustFraud: {
    highlightLowTrustReviews: true,
    autoFlagSuspiciousFeedback: true,
    fraudSensitivityLevel: 'Medium',
    minimumTrustThreshold: 40,
  },
  notifications: {
    newFeedbackAlert: true,
    lowTrustAlert: true,
    fraudAlert: true,
    paymentUpdateAlert: true,
    deliveryUpdateAlert: true,
    emailNotifications: true,
  },
  system: {
    darkMode: false,
    defaultDashboardView: 'Dashboard',
    currencyFormat: 'INR',
    language: 'English',
  },
  advanced: {
    showTrustScorePublicly: true,
    showLocationInFeedback: true,
    enableFeedbackLabels: true,
  },
}

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
}

function coerceBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0

  const text = String(value || '').trim().toLowerCase()
  if (text === 'true' || text === '1' || text === 'yes' || text === 'on') return true
  if (text === 'false' || text === '0' || text === 'no' || text === 'off') return false

  return fallback
}

function clampThreshold(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function normalizeSettings(raw = {}) {
  const defaults = cloneDefaults()

  return {
    feedback: {
      enableFeedbackCollection: coerceBoolean(
        raw?.feedback?.enableFeedbackCollection,
        defaults.feedback.enableFeedbackCollection
      ),
      autoGenerateFeedbackTokens: coerceBoolean(
        raw?.feedback?.autoGenerateFeedbackTokens,
        defaults.feedback.autoGenerateFeedbackTokens
      ),
      allowAnonymousFeedback: coerceBoolean(
        raw?.feedback?.allowAnonymousFeedback,
        defaults.feedback.allowAnonymousFeedback
      ),
      requirePaymentVerification: coerceBoolean(
        raw?.feedback?.requirePaymentVerification,
        defaults.feedback.requirePaymentVerification
      ),
      requireDeliveryCompletion: coerceBoolean(
        raw?.feedback?.requireDeliveryCompletion,
        defaults.feedback.requireDeliveryCompletion
      ),
    },
    trustFraud: {
      highlightLowTrustReviews: coerceBoolean(
        raw?.trustFraud?.highlightLowTrustReviews,
        defaults.trustFraud.highlightLowTrustReviews
      ),
      autoFlagSuspiciousFeedback: coerceBoolean(
        raw?.trustFraud?.autoFlagSuspiciousFeedback,
        defaults.trustFraud.autoFlagSuspiciousFeedback
      ),
      fraudSensitivityLevel:
        raw?.trustFraud?.fraudSensitivityLevel || defaults.trustFraud.fraudSensitivityLevel,
      minimumTrustThreshold: clampThreshold(
        raw?.trustFraud?.minimumTrustThreshold,
        defaults.trustFraud.minimumTrustThreshold
      ),
    },
    notifications: {
      newFeedbackAlert: coerceBoolean(
        raw?.notifications?.newFeedbackAlert,
        defaults.notifications.newFeedbackAlert
      ),
      lowTrustAlert: coerceBoolean(
        raw?.notifications?.lowTrustAlert,
        defaults.notifications.lowTrustAlert
      ),
      fraudAlert: coerceBoolean(raw?.notifications?.fraudAlert, defaults.notifications.fraudAlert),
      paymentUpdateAlert: coerceBoolean(
        raw?.notifications?.paymentUpdateAlert,
        defaults.notifications.paymentUpdateAlert
      ),
      deliveryUpdateAlert: coerceBoolean(
        raw?.notifications?.deliveryUpdateAlert,
        defaults.notifications.deliveryUpdateAlert
      ),
      emailNotifications: coerceBoolean(
        raw?.notifications?.emailNotifications,
        defaults.notifications.emailNotifications
      ),
    },
    system: {
      darkMode: coerceBoolean(raw?.system?.darkMode, defaults.system.darkMode),
      defaultDashboardView:
        raw?.system?.defaultDashboardView || defaults.system.defaultDashboardView,
      currencyFormat: raw?.system?.currencyFormat || defaults.system.currencyFormat,
      language: String(raw?.system?.language || defaults.system.language),
    },
    advanced: {
      showTrustScorePublicly: coerceBoolean(
        raw?.advanced?.showTrustScorePublicly,
        defaults.advanced.showTrustScorePublicly
      ),
      showLocationInFeedback: coerceBoolean(
        raw?.advanced?.showLocationInFeedback,
        defaults.advanced.showLocationInFeedback
      ),
      enableFeedbackLabels: coerceBoolean(
        raw?.advanced?.enableFeedbackLabels,
        defaults.advanced.enableFeedbackLabels
      ),
    },
  }
}

function applyWorkspaceTheme(isDarkMode) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const theme = isDarkMode ? 'dark' : 'light'
  document.body.dataset.theme = theme
  window.localStorage.setItem('trusty-theme', theme)
  window.dispatchEvent(new CustomEvent('trusty-theme-change', { detail: { theme } }))
}

function getActiveThemeDarkMode() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  const stored = String(window.localStorage.getItem('trusty-theme') || '').toLowerCase()
  if (stored === 'dark') return true
  if (stored === 'light') return false

  return document.body?.dataset?.theme === 'dark'
}

function withActiveThemePreference(settings) {
  return {
    ...settings,
    system: {
      ...settings.system,
      darkMode: getActiveThemeDarkMode(),
    },
  }
}

function SectionIcon({ type }) {
  if (type === 'feedback') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 6h14v12H8l-3 3V6z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M9 10h7M9 14h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (type === 'trust') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18V8M10 18V6M16 18v-4M20 18V9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (type === 'notifications') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4a5 5 0 00-5 5v3l-2 3h14l-2-3V9a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (type === 'system') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.9" />
        <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.9" />
      <path d="M19.4 15a1 1 0 00.2 1.1l.1.1a1.9 1.9 0 01-2.7 2.7l-.1-.1a1 1 0 00-1.1-.2 1 1 0 00-.6.9V20a2 2 0 01-4 0v-.2a1 1 0 00-.6-.9 1 1 0 00-1.1.2l-.1.1a1.9 1.9 0 11-2.7-2.7l.1-.1a1 1 0 00.2-1.1 1 1 0 00-.9-.6H4a2 2 0 010-4h.2a1 1 0 00.9-.6 1 1 0 00-.2-1.1l-.1-.1a1.9 1.9 0 012.7-2.7l.1.1a1 1 0 001.1.2h.1a1 1 0 00.6-.9V4a2 2 0 014 0v.2a1 1 0 00.6.9 1 1 0 001.1-.2l.1-.1a1.9 1.9 0 012.7 2.7l-.1.1a1 1 0 00-.2 1.1v.1a1 1 0 00.9.6H20a2 2 0 010 4h-.2a1 1 0 00-.9.6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function LoadingSkeleton() {
  return (
    <div className="tw-grid tw-gap-4" aria-hidden="true">
      <div className="tw-h-24 tw-animate-pulse tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-100" />
      <div className="tw-h-44 tw-animate-pulse tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-100" />
      <div className="tw-h-44 tw-animate-pulse tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-100" />
    </div>
  )
}

export function SettingsPage({ vendorId, initialSettings = null, onSettingsSaved = () => {} }) {
  const [activeTab, setActiveTab] = useState('feedback')
  const [form, setForm] = useState(() => {
    const normalized = initialSettings ? normalizeSettings(initialSettings) : cloneDefaults()
    return withActiveThemePreference(normalized)
  })
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    initialSettings ? normalizeSettings(initialSettings) : cloneDefaults()
  )
  const [loading, setLoading] = useState(() => !initialSettings)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedSnapshot),
    [form, savedSnapshot]
  )

  useEffect(() => {
    if (!initialSettings) return
    const normalized = withActiveThemePreference(normalizeSettings(initialSettings))
    setForm(normalized)
    setSavedSnapshot(normalized)
    setLoading(false)
  }, [initialSettings])

  useEffect(() => {
    if (!vendorId) return undefined
    if (initialSettings) return undefined

    let cancelled = false

    async function loadSettings() {
      setLoading(true)
      setErrorMessage('')

      try {
        const data = await apiGet(`/api/vendor/${vendorId}/settings`)
        if (cancelled) return

        const normalized = normalizeSettings(data?.settings)
        setForm(withActiveThemePreference(normalized))
        setSavedSnapshot(normalized)
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error?.message || 'Failed to load settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [vendorId, initialSettings])

  function updateSetting(group, key, value) {
    setForm((state) => ({
      ...state,
      [group]: {
        ...state[group],
        [key]: value,
      },
    }))
    setSuccessMessage('')
    setErrorMessage('')
  }

  function handleDarkModeToggle(value) {
    updateSetting('system', 'darkMode', value)
    applyWorkspaceTheme(value)
  }

  async function handleSave() {
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = normalizeSettings(form)
      const data = await apiPost(`/api/vendor/${vendorId}/settings`, { settings: payload })
      const normalized = normalizeSettings(data?.settings)

      setForm(normalized)
      setSavedSnapshot(normalized)
      setSuccessMessage(data?.message || 'Settings updated successfully')
      onSettingsSaved(normalized)
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function handleResetToDefaults() {
    const defaults = cloneDefaults()
    setForm(defaults)
    setErrorMessage('')
    setSuccessMessage('Default values restored. Click Save Settings to apply.')
  }

  function renderTabContent() {
    if (activeTab === 'feedback') {
      return (
        <SettingsSection
          title="Feedback Configuration"
          subtitle="Control how feedback is collected and validated"
          icon={<SectionIcon type="feedback" />}
        >
          <ToggleSwitch
            label="Enable Feedback Collection"
            checked={form.feedback.enableFeedbackCollection}
            onChange={(value) => updateSetting('feedback', 'enableFeedbackCollection', value)}
          />
          <ToggleSwitch
            label="Auto Generate Feedback Tokens"
            checked={form.feedback.autoGenerateFeedbackTokens}
            onChange={(value) => updateSetting('feedback', 'autoGenerateFeedbackTokens', value)}
          />
          <ToggleSwitch
            label="Allow Anonymous Feedback"
            checked={form.feedback.allowAnonymousFeedback}
            onChange={(value) => updateSetting('feedback', 'allowAnonymousFeedback', value)}
          />
          <ToggleSwitch
            label="Require Payment Verification"
            checked={form.feedback.requirePaymentVerification}
            onChange={(value) => updateSetting('feedback', 'requirePaymentVerification', value)}
          />
          <ToggleSwitch
            label="Require Delivery Completion"
            checked={form.feedback.requireDeliveryCompletion}
            onChange={(value) => updateSetting('feedback', 'requireDeliveryCompletion', value)}
          />
        </SettingsSection>
      )
    }

    if (activeTab === 'trustFraud') {
      return (
        <SettingsSection
          title="Trust & Fraud Controls"
          subtitle="Configure fraud sensitivity and trust score handling"
          icon={<SectionIcon type="trust" />}
        >
          <ToggleSwitch
            label="Highlight Low Trust Reviews"
            checked={form.trustFraud.highlightLowTrustReviews}
            onChange={(value) => updateSetting('trustFraud', 'highlightLowTrustReviews', value)}
          />
          <ToggleSwitch
            label="Auto Flag Suspicious Feedback"
            checked={form.trustFraud.autoFlagSuspiciousFeedback}
            onChange={(value) => updateSetting('trustFraud', 'autoFlagSuspiciousFeedback', value)}
          />

          <div className="tw-grid tw-gap-3 md:tw-grid-cols-2">
            <DropdownSelect
              label="Fraud Sensitivity Level"
              value={form.trustFraud.fraudSensitivityLevel}
              options={FRAUD_LEVEL_OPTIONS}
              onChange={(value) => updateSetting('trustFraud', 'fraudSensitivityLevel', value)}
            />

            <SliderControl
              label="Minimum Trust Threshold"
              value={form.trustFraud.minimumTrustThreshold}
              onChange={(value) => updateSetting('trustFraud', 'minimumTrustThreshold', value)}
              helper="Feedback under this score can be highlighted for review."
            />
          </div>
        </SettingsSection>
      )
    }

    if (activeTab === 'notifications') {
      return (
        <SettingsSection
          title="Notifications"
          subtitle="Choose which alerts vendors should receive"
          icon={<SectionIcon type="notifications" />}
        >
          <ToggleSwitch
            label="New Feedback Alert"
            checked={form.notifications.newFeedbackAlert}
            onChange={(value) => updateSetting('notifications', 'newFeedbackAlert', value)}
          />
          <ToggleSwitch
            label="Low Trust Alert"
            checked={form.notifications.lowTrustAlert}
            onChange={(value) => updateSetting('notifications', 'lowTrustAlert', value)}
          />
          <ToggleSwitch
            label="Fraud Alert"
            checked={form.notifications.fraudAlert}
            onChange={(value) => updateSetting('notifications', 'fraudAlert', value)}
          />
          <ToggleSwitch
            label="Payment Update Alert"
            checked={form.notifications.paymentUpdateAlert}
            onChange={(value) => updateSetting('notifications', 'paymentUpdateAlert', value)}
          />
          <ToggleSwitch
            label="Delivery Update Alert"
            checked={form.notifications.deliveryUpdateAlert}
            onChange={(value) => updateSetting('notifications', 'deliveryUpdateAlert', value)}
          />
          <ToggleSwitch
            label="Email Notifications"
            checked={form.notifications.emailNotifications}
            onChange={(value) => updateSetting('notifications', 'emailNotifications', value)}
          />
        </SettingsSection>
      )
    }

    if (activeTab === 'system') {
      return (
        <SettingsSection
          title="System Preferences"
          subtitle="Set visual and default operational preferences"
          icon={<SectionIcon type="system" />}
        >
          <ToggleSwitch
            label="Dark / Light Mode"
            description="Toggle preferred workspace theme mode."
            checked={form.system.darkMode}
            onChange={handleDarkModeToggle}
          />

          <div className="tw-grid tw-gap-3 md:tw-grid-cols-3">
            <DropdownSelect
              label="Default Dashboard View"
              value={form.system.defaultDashboardView}
              options={DASHBOARD_VIEW_OPTIONS}
              onChange={(value) => updateSetting('system', 'defaultDashboardView', value)}
            />
            <DropdownSelect
              label="Currency Format"
              value={form.system.currencyFormat}
              options={CURRENCY_OPTIONS}
              onChange={(value) => updateSetting('system', 'currencyFormat', value)}
            />
            <DropdownSelect
              label="Language"
              value={form.system.language}
              options={LANGUAGE_OPTIONS}
              onChange={(value) => updateSetting('system', 'language', value)}
            />
          </div>
        </SettingsSection>
      )
    }

    return (
      <SettingsSection
        title="Advanced"
        subtitle="Optional transparency and display controls"
        icon={<SectionIcon type="advanced" />}
      >
        <ToggleSwitch
          label="Show Trust Score Publicly"
          checked={form.advanced.showTrustScorePublicly}
          onChange={(value) => updateSetting('advanced', 'showTrustScorePublicly', value)}
        />
        <ToggleSwitch
          label="Show Location in Feedback"
          checked={form.advanced.showLocationInFeedback}
          onChange={(value) => updateSetting('advanced', 'showLocationInFeedback', value)}
        />
        <ToggleSwitch
          label="Enable Feedback Labels"
          checked={form.advanced.enableFeedbackLabels}
          onChange={(value) => updateSetting('advanced', 'enableFeedbackLabels', value)}
        />
      </SettingsSection>
    )
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="vendorSettingsPage tw-grid tw-gap-4">
      <section className="vendorSettingsCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-soft">
        <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
          <div>
            <h2 className="tw-text-xl tw-font-extrabold tw-text-slate-900">Vendor Settings</h2>
            <p className="tw-mt-1 tw-text-sm tw-text-slate-500">
              Manage feedback behavior, trust controls, notifications, and system preferences.
            </p>
          </div>
          <span
            className={`tw-rounded-full tw-border tw-px-3 tw-py-1 tw-text-xs tw-font-semibold ${
              hasUnsavedChanges
                ? 'tw-border-amber-200 tw-bg-amber-50 tw-text-amber-700'
                : 'tw-border-emerald-200 tw-bg-emerald-50 tw-text-emerald-700'
            }`}
          >
            {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </div>

        <div className="tw-mt-4 tw-flex tw-flex-wrap tw-gap-2">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`tw-rounded-lg tw-border tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold ${
                activeTab === tab.key
                  ? 'tw-border-cyan-600 tw-bg-cyan-600 tw-text-white'
                  : 'tw-border-slate-300 tw-bg-white tw-text-slate-700 hover:tw-bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {errorMessage ? (
        <div className="tw-rounded-xl tw-border tw-border-rose-200 tw-bg-rose-50 tw-p-3 tw-text-sm tw-font-medium tw-text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="tw-rounded-xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-p-3 tw-text-sm tw-font-medium tw-text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {renderTabContent()}

      <section className="vendorSettingsCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 tw-shadow-soft">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
          <button
            type="button"
            className="tw-rounded-xl tw-border tw-border-slate-300 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-slate-700 hover:tw-bg-slate-50"
            onClick={handleResetToDefaults}
            disabled={saving}
          >
            Reset to Default
          </button>
          <button
            type="button"
            className="tw-rounded-xl tw-border tw-border-cyan-600 tw-bg-cyan-600 tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-white hover:tw-bg-cyan-700 disabled:tw-cursor-not-allowed disabled:tw-opacity-60"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
          >
            {saving ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </section>
    </div>
  )
}
