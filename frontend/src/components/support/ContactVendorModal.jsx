import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '../../lib/api'
import { SubmissionSuccessModal } from './SubmissionSuccessModal'

export function ContactVendorModal({ open, onClose, vendors, preselectedVendorId = '' }) {
  const [form, setForm] = useState({ vendorId: '', userName: '', userEmail: '', userPhone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState(null)

  useEffect(() => {
    if (!open) return
    if (!preselectedVendorId) return
    setForm((prev) => ({ ...prev, vendorId: String(preselectedVendorId) }))
  }, [open, preselectedVendorId])

  const selectedVendor = useMemo(() => {
    return vendors.find((item) => String(item._id) === String(form.vendorId)) || null
  }, [vendors, form.vendorId])

  if (!open) return null

  async function onSubmit(event) {
    event.preventDefault()
    try {
      setError('')
      setSuccessData(null)
      setSubmitting(true)

      const data = await apiPost('/api/support/messages', {
        vendorId: form.vendorId,
        userName: form.userName,
        message: form.message,
        userEmail: form.userEmail,
        userPhone: form.userPhone,
        source: 'chatbot',
      })

      setSuccessData({
        referenceId: data?.referenceId || String(data?.message?._id || '').slice(-6).toUpperCase(),
        email: form.userEmail,
      })
      setForm({
        vendorId: form.vendorId,
        userName: form.userName,
        userEmail: form.userEmail,
        userPhone: form.userPhone,
        message: '',
      })
    } catch (e) {
      setError(e?.message || 'Unable to send message right now')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="supportModalOverlay" role="presentation" onClick={onClose}>
      <section
        className="supportModalCard"
        role="dialog"
        aria-modal="true"
        aria-label="Contact vendor"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="supportModalHeader">
          <div>
            <h3>Contact Vendor</h3>
            <p>Send a direct support message to the selected vendor.</p>
          </div>
          <button type="button" className="supportGhostButton" onClick={onClose}>Close</button>
        </header>

        {error ? <div className="supportInlineError">{error}</div> : null}
        <form onSubmit={onSubmit} className="supportFormGrid">
          <label>
            <span className="supportLabelText">Your Name <span className="supportRequired">*</span></span>
            <input
              type="text"
              value={form.userName}
              placeholder="Enter your full name"
              onChange={(event) => setForm((prev) => ({ ...prev, userName: event.target.value }))}
              minLength={2}
              required
            />
          </label>

          <label>
            <span className="supportLabelText">Vendor <span className="supportRequired">*</span></span>
            <select
              value={form.vendorId}
              onChange={(event) => setForm((prev) => ({ ...prev, vendorId: event.target.value }))}
              required
            >
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.name}{vendor.category ? ` - ${vendor.category}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="supportLabelText">Email <span className="supportRequired">*</span></span>
            <input
              type="email"
              value={form.userEmail}
              placeholder="you@example.com"
              onChange={(event) => setForm((prev) => ({ ...prev, userEmail: event.target.value }))}
              required
            />
          </label>

          <label>
            Phone Number (optional)
            <input
              type="tel"
              value={form.userPhone}
              placeholder="+91 98xxxxxx"
              onChange={(event) => setForm((prev) => ({ ...prev, userPhone: event.target.value }))}
            />
          </label>

          <label>
            <span className="supportLabelText">Message <span className="supportRequired">*</span></span>
            <textarea
              value={form.message}
              placeholder="Describe your issue in detail"
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              minLength={12}
              required
            />
          </label>

          <div className="supportModalFooter">
            <div className="supportModalMeta">
              {selectedVendor ? `Selected: ${selectedVendor.name}` : 'Select a vendor to continue'}
            </div>
            <button type="submit" className="supportPrimaryButton" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </section>

      <SubmissionSuccessModal
        open={Boolean(successData)}
        onClose={() => {
          setSuccessData(null)
          onClose()
        }}
        title="Query Submitted Successfully"
        referenceId={successData?.referenceId || ''}
        email={successData?.email || ''}
        message="Your vendor support query has been submitted."
      />
    </div>
  )
}
