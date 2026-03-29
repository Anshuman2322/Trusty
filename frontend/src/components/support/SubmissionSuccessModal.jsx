import { useState } from 'react'

export function SubmissionSuccessModal({
  open,
  onClose,
  title,
  referenceId,
  email,
  message,
}) {
  const [copyState, setCopyState] = useState('')

  if (!open) return null

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  }

  async function copyReference() {
    const text = String(referenceId || '').trim()
    if (!text) {
      setCopyState('No reference ID available to copy.')
      return
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        setCopyState('Reference copied.')
        return
      }

      const copied = fallbackCopy(text)
      setCopyState(copied ? 'Reference copied.' : 'Copy failed. Please copy manually.')
    } catch {
      const copied = fallbackCopy(text)
      setCopyState(copied ? 'Reference copied.' : 'Copy failed. Please copy manually.')
    }
  }

  return (
    <div className="supportSuccessOverlay" role="presentation" onClick={onClose}>
      <section
        className="supportSuccessCard"
        role="dialog"
        aria-modal="true"
        aria-label="Submission success"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="supportSuccessReference">
          <span>Reference ID</span>
          <strong>{referenceId || 'N/A'}</strong>
        </div>

        <ul className="supportSuccessList">
          <li>Please take a screenshot or note this reference ID for future follow-up.</li>
          <li>Email update was triggered to {email || 'your registered email'}.</li>
          <li>You can track status later from the support chatbot using your email.</li>
        </ul>

        <div className="supportSuccessActions">
          <button type="button" className="supportGhostButton" onClick={copyReference}>Copy Reference</button>
          <button type="button" className="supportPrimaryButton" onClick={onClose}>Done</button>
        </div>
        {copyState ? <div className="supportSuccessCopyStatus">{copyState}</div> : null}
      </section>
    </div>
  )
}
