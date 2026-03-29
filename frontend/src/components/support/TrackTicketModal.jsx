import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api'

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString()
}

function statusTone(status) {
  const key = String(status || '').toLowerCase()
  if (key === 'resolved') return 'supportTrackStatus supportTrackStatus--resolved'
  if (key === 'in-progress') return 'supportTrackStatus supportTrackStatus--progress'
  return 'supportTrackStatus supportTrackStatus--open'
}

export function TrackTicketModal({ open, onClose }) {
  const [form, setForm] = useState({ referenceId: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticketResults, setTicketResults] = useState([])
  const [vendorQueryResults, setVendorQueryResults] = useState([])
  const [openDetailIds, setOpenDetailIds] = useState({})
  const [followUpDrafts, setFollowUpDrafts] = useState({})
  const [closeFeedback, setCloseFeedback] = useState({})
  const [busyActionKey, setBusyActionKey] = useState('')
  const [actionNotice, setActionNotice] = useState('')

  const hasQuery = useMemo(() => {
    return Boolean(form.referenceId.trim() || form.email.trim())
  }, [form.referenceId, form.email])

  useEffect(() => {
    if (!open) return
    setForm({ referenceId: '', email: '' })
    setLoading(false)
    setError('')
    setTicketResults([])
    setVendorQueryResults([])
    setOpenDetailIds({})
    setFollowUpDrafts({})
    setCloseFeedback({})
    setBusyActionKey('')
    setActionNotice('')
  }, [open])

  if (!open) return null

  async function onSearch(event) {
    event.preventDefault()
    if (!hasQuery) {
      setError('Enter reference ID or email to track ticket')
      return
    }

    try {
      setLoading(true)
      setError('')
      const query = new URLSearchParams()
      if (form.referenceId.trim()) query.set('referenceId', form.referenceId.trim())
      if (form.email.trim()) query.set('email', form.email.trim())

      const [ticketData, vendorData] = await Promise.all([
        apiGet(`/api/support/tickets/track?${query.toString()}`),
        apiGet(`/api/support/messages/track?${query.toString()}`),
      ])
      setTicketResults(Array.isArray(ticketData?.tickets) ? ticketData.tickets : [])
      setVendorQueryResults(Array.isArray(vendorData?.messages) ? vendorData.messages : [])
      setActionNotice('')
    } catch (e) {
      setError(e?.message || 'Unable to track ticket right now')
      setTicketResults([])
      setVendorQueryResults([])
    } finally {
      setLoading(false)
    }
  }

  function refreshFromPayload(updatedTicket) {
    setTicketResults((prev) =>
      prev.map((item) => (String(item._id) === String(updatedTicket?._id) ? updatedTicket : item))
    )
  }

  function actionPayload(ticket) {
    return {
      referenceId: ticket.referenceId,
      email: ticket.email,
    }
  }

  async function handleEmailUpdate(ticket) {
    const actionKey = `email-${ticket._id}`
    try {
      setBusyActionKey(actionKey)
      setError('')
      const data = await apiPost(`/api/support/tickets/${ticket._id}/email-update`, actionPayload(ticket))
      if (data?.ticket) refreshFromPayload(data.ticket)
      setActionNotice('Latest update was sent to your email.')
    } catch (e) {
      setError(e?.message || 'Unable to send email update right now')
    } finally {
      setBusyActionKey('')
    }
  }

  async function handleFollowUp(ticket) {
    const draft = String(followUpDrafts[ticket._id] || '').trim()
    if (draft.length < 6) {
      setError('Please write at least 6 characters for follow-up reply')
      return
    }

    const actionKey = `follow-${ticket._id}`
    try {
      setBusyActionKey(actionKey)
      setError('')
      const data = await apiPost(`/api/support/tickets/${ticket._id}/follow-up`, {
        ...actionPayload(ticket),
        message: draft,
      })
      if (data?.ticket) refreshFromPayload(data.ticket)
      setFollowUpDrafts((prev) => ({ ...prev, [ticket._id]: '' }))
      setActionNotice('Follow-up submitted. Support team will reply soon.')
    } catch (e) {
      setError(e?.message || 'Unable to submit follow-up')
    } finally {
      setBusyActionKey('')
    }
  }

  async function handleCloseTicket(ticket, satisfaction) {
    const note = String(closeFeedback[ticket._id] || '').trim()
    const actionKey = `close-${ticket._id}`
    try {
      setBusyActionKey(actionKey)
      setError('')
      const data = await apiPost(`/api/support/tickets/${ticket._id}/close`, {
        ...actionPayload(ticket),
        satisfaction,
        closeNote: note,
      })
      if (data?.ticket) refreshFromPayload(data.ticket)
      setActionNotice(
        satisfaction === 'satisfied'
          ? 'Thanks for confirming. Ticket marked resolved.'
          : 'Feedback saved. Ticket reopened for further support.'
      )
    } catch (e) {
      setError(e?.message || 'Unable to update ticket closure')
    } finally {
      setBusyActionKey('')
    }
  }

  function handleDownload(ticket) {
    const payload = {
      referenceId: ticket.referenceId,
      issueType: ticket.issueType,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      name: ticket.name,
      email: ticket.email,
      phone: ticket.phone,
      description: ticket.description,
      adminReply: ticket.adminReply,
      customerSatisfaction: ticket.customerSatisfaction,
      customerCloseNote: ticket.customerCloseNote,
      replies: ticket.replies || [],
      customerFollowUps: ticket.customerFollowUps || [],
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ticket-${ticket.referenceId || ticket._id}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(url)
    setActionNotice('Ticket details downloaded.')
  }

  return (
    <div className="supportModalOverlay" role="presentation" onClick={onClose}>
      <section
        className="supportModalCard supportTrackModal"
        role="dialog"
        aria-modal="true"
        aria-label="Track support ticket"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="supportModalHeader">
          <div>
            <h3>Track My Ticket</h3>
            <p>Find complete ticket status using Reference ID, Email, or both.</p>
          </div>
          <button type="button" className="supportGhostButton" onClick={onClose}>Close</button>
        </header>

        {error ? <div className="supportInlineError">{error}</div> : null}
        {actionNotice ? <div className="supportInlineSuccess">{actionNotice}</div> : null}

        <form onSubmit={onSearch} className="supportFormGrid">
          <label>
            Reference ID
            <input
              type="text"
              value={form.referenceId}
              placeholder="Example: EAA969"
              onChange={(event) => setForm((prev) => ({ ...prev, referenceId: event.target.value }))}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              placeholder="you@example.com"
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <div className="supportModalFooter">
            <div className="supportModalMeta">Tip: use both for the fastest and most accurate lookup.</div>
            <button type="submit" className="supportPrimaryButton" disabled={loading}>
              {loading ? 'Searching...' : 'Track Ticket'}
            </button>
          </div>
        </form>

        <section className="supportTrackResults">
          {ticketResults.length === 0 && vendorQueryResults.length === 0 && !loading ? (
            <div className="supportTrackEmpty">No tracked records found. Search with your email or reference ID.</div>
          ) : null}

          {ticketResults.length ? <h4 className="supportTrackSectionTitle">Admin Support Tickets</h4> : null}

          {ticketResults.map((ticket) => (
            <article key={ticket._id} className="supportTrackCard">
              <div className="supportTrackCardHead">
                <div>
                  <strong>{ticket.issueType}</strong>
                  <div className="supportTrackMeta">Ref: {ticket.referenceId} | Priority: {ticket.priority}</div>
                </div>
                <span className={statusTone(ticket.status)}>{ticket.status}</span>
              </div>

              <p className="supportTrackDescription">{ticket.description}</p>

              <div className="supportTrackActionRow">
                <button
                  type="button"
                  className="supportGhostButton"
                  onClick={() =>
                    setOpenDetailIds((prev) => ({ ...prev, [ticket._id]: !prev[ticket._id] }))
                  }
                >
                  {openDetailIds[ticket._id] ? 'Hide Full Details' : 'Open Full Details'}
                </button>
                <button type="button" className="supportGhostButton" onClick={() => handleDownload(ticket)}>
                  Download Details
                </button>
                <button
                  type="button"
                  className="supportGhostButton"
                  disabled={busyActionKey === `email-${ticket._id}`}
                  onClick={() => handleEmailUpdate(ticket)}
                >
                  {busyActionKey === `email-${ticket._id}` ? 'Sending...' : 'Email Me Update'}
                </button>
              </div>

              {openDetailIds[ticket._id] ? (
                <>
                  <div className="supportTrackGrid">
                    <div>
                      <span>Submitted By</span>
                      <strong>{ticket.name}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{ticket.email}</strong>
                    </div>
                    <div>
                      <span>Created</span>
                      <strong>{formatDateTime(ticket.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Last Updated</span>
                      <strong>{formatDateTime(ticket.updatedAt)}</strong>
                    </div>
                  </div>

                  {ticket.adminReply ? (
                    <div className="supportTrackReply">
                      <span>Latest Admin Update</span>
                      <p>{ticket.adminReply}</p>
                    </div>
                  ) : null}

                  {Array.isArray(ticket.replies) && ticket.replies.length ? (
                    <div className="supportTrackTimeline">
                      <span>Admin Timeline</span>
                      {ticket.replies.map((reply, index) => (
                        <div className="supportTrackTimelineItem" key={`${ticket._id}-${index}`}>
                          <strong>{reply.repliedBy}</strong>
                          <p>{reply.body}</p>
                          <small>{formatDateTime(reply.at)}</small>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {Array.isArray(ticket.customerFollowUps) && ticket.customerFollowUps.length ? (
                    <div className="supportTrackTimeline">
                      <span>Your Follow-up Messages</span>
                      {ticket.customerFollowUps.map((item, index) => (
                        <div className="supportTrackTimelineItem" key={`${ticket._id}-followup-${index}`}>
                          <strong>CUSTOMER</strong>
                          <p>{item.message}</p>
                          <small>{formatDateTime(item.at)}</small>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="supportTrackReplyEditor">
                    <label>
                      Request Next Reply
                      <textarea
                        value={followUpDrafts[ticket._id] || ''}
                        onChange={(event) =>
                          setFollowUpDrafts((prev) => ({ ...prev, [ticket._id]: event.target.value }))
                        }
                        placeholder="Write your next follow-up message"
                      />
                    </label>
                    <button
                      type="button"
                      className="supportPrimaryButton"
                      disabled={busyActionKey === `follow-${ticket._id}`}
                      onClick={() => handleFollowUp(ticket)}
                    >
                      {busyActionKey === `follow-${ticket._id}` ? 'Submitting...' : 'Send Follow-up'}
                    </button>
                  </div>

                  <div className="supportTrackSatisfaction">
                    <div>
                      <strong>Are you satisfied with this response?</strong>
                      <textarea
                        value={closeFeedback[ticket._id] || ''}
                        onChange={(event) =>
                          setCloseFeedback((prev) => ({ ...prev, [ticket._id]: event.target.value }))
                        }
                        placeholder="Optional feedback note"
                      />
                    </div>
                    <div className="supportTrackSatisfactionActions">
                      <button
                        type="button"
                        className="supportGhostButton"
                        disabled={busyActionKey === `close-${ticket._id}`}
                        onClick={() => handleCloseTicket(ticket, 'not-satisfied')}
                      >
                        Not Satisfied
                      </button>
                      <button
                        type="button"
                        className="supportPrimaryButton"
                        disabled={busyActionKey === `close-${ticket._id}`}
                        onClick={() => handleCloseTicket(ticket, 'satisfied')}
                      >
                        Satisfied - Close Ticket
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </article>
          ))}

          {vendorQueryResults.length ? <h4 className="supportTrackSectionTitle">Vendor Query Threads</h4> : null}

          {vendorQueryResults.map((item) => (
            <article key={`vendor-${item._id}`} className="supportTrackCard">
              <div className="supportTrackCardHead">
                <div>
                  <strong>{item.vendorName || 'Vendor Support Query'}</strong>
                  <div className="supportTrackMeta">Ref: {item.referenceId} | Status: {item.status}</div>
                </div>
                <span className={statusTone(item.status)}>{item.status}</span>
              </div>

              <p className="supportTrackDescription">{item.message}</p>

              <div className="supportTrackActionRow">
                <button
                  type="button"
                  className="supportGhostButton"
                  onClick={() =>
                    setOpenDetailIds((prev) => ({ ...prev, [item._id]: !prev[item._id] }))
                  }
                >
                  {openDetailIds[item._id] ? 'Hide Full Details' : 'Open Full Details'}
                </button>
              </div>

              {openDetailIds[item._id] ? (
                <>
                  <div className="supportTrackGrid">
                    <div>
                      <span>Submitted By</span>
                      <strong>{item.userName || 'N/A'}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{item.userEmail || 'N/A'}</strong>
                    </div>
                    <div>
                      <span>Created</span>
                      <strong>{formatDateTime(item.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Last Updated</span>
                      <strong>{formatDateTime(item.updatedAt)}</strong>
                    </div>
                  </div>

                  {item.reply ? (
                    <div className="supportTrackReply">
                      <span>Latest Vendor Reply</span>
                      <p>{item.reply}</p>
                    </div>
                  ) : null}

                  {Array.isArray(item.replies) && item.replies.length ? (
                    <div className="supportTrackTimeline">
                      <span>Vendor Timeline</span>
                      {item.replies.map((reply, index) => (
                        <div className="supportTrackTimelineItem" key={`${item._id}-vendor-${index}`}>
                          <strong>{reply.repliedBy}</strong>
                          <p>{reply.body}</p>
                          <small>{formatDateTime(reply.at)}</small>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          ))}
        </section>
      </section>
    </div>
  )
}
