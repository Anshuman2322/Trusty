import { useEffect, useState } from 'react'
import { apiPost } from '../../lib/api'
import { SubmissionSuccessModal } from './SubmissionSuccessModal'

export function TicketModal({ open, onClose, issueTypes }) {
  const [form, setForm] = useState({
    issueType: issueTypes[0] || 'Other',
    name: '',
    email: '',
    phone: '',
    description: '',
  })
  const [successData, setSuccessData] = useState(null)

  useEffect(() => {
    if (!Array.isArray(issueTypes) || !issueTypes.length) return
    setForm((prev) => ({ ...prev, issueType: prev.issueType || issueTypes[0] || 'Other' }))
  }, [issueTypes])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function onSubmit(event) {
    event.preventDefault()
    try {
      setSubmitting(true)
      setError('')
      setSuccessData(null)

      const data = await apiPost('/api/support/tickets', {
        issueType: form.issueType,
        name: form.name,
        description: form.description,
        email: form.email,
        phone: form.phone,
        source: 'chatbot',
      })

      const ref = data?.referenceId || String(data?.ticket?._id || '').slice(-6).toUpperCase()
      setSuccessData({ referenceId: ref, email: form.email })
      setForm((prev) => ({ ...prev, description: '' }))
    } catch (e) {
      setError(e?.message || 'Unable to create ticket right now')
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
        aria-label="Raise support ticket"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="supportModalHeader">
          <div>
            <h3>Raise Ticket</h3>
            <p>Escalate complex issues to the Trusty admin support team.</p>
          </div>
          <button type="button" className="supportGhostButton" onClick={onClose}>Close</button>
        </header>

        {error ? <div className="supportInlineError">{error}</div> : null}
        <form onSubmit={onSubmit} className="supportFormGrid">
          <label>
            <span className="supportLabelText">Full Name <span className="supportRequired">*</span></span>
            <input
              type="text"
              value={form.name}
              placeholder="Enter your full name"
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              minLength={2}
              required
            />
          </label>

          <label>
            <span className="supportLabelText">Issue Type <span className="supportRequired">*</span></span>
            <select
              value={form.issueType}
              onChange={(event) => setForm((prev) => ({ ...prev, issueType: event.target.value }))}
              required
            >
              {issueTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="supportLabelText">Email <span className="supportRequired">*</span></span>
            <input
              type="email"
              value={form.email}
              placeholder="you@example.com"
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>

          <label>
            Phone Number (optional)
            <input
              type="tel"
              value={form.phone}
              placeholder="+91 98xxxxxx"
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>

          <label>
            <span className="supportLabelText">Description <span className="supportRequired">*</span></span>
            <textarea
              value={form.description}
              placeholder="Include steps, context, and expected result"
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              minLength={20}
              required
            />
          </label>

          <div className="supportModalFooter">
            <div className="supportModalMeta">Updates are sent by email when admin replies.</div>
            <button type="submit" className="supportPrimaryButton" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Create Ticket'}
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
        title="Ticket Submitted Successfully"
        referenceId={successData?.referenceId || ''}
        email={successData?.email || ''}
        message="Your support ticket has been created and routed to admin support."
      />
    </div>
  )
}
