import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { VendorAuthCard } from '../components/VendorAuthCard'
import { OTPInput } from '../components/OTPInput'
import { FormInput } from '../components/FormInput'
import { apiPost } from '../lib/api'

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loadingSendOtp, setLoadingSendOtp] = useState(false)
  const [loadingVerifyOtp, setLoadingVerifyOtp] = useState(false)
  const [loadingReset, setLoadingReset] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const passwordsMatch = useMemo(() => newPassword === confirmPassword, [newPassword, confirmPassword])
  const passwordLengthValid = String(newPassword || '').length >= 6
  const canReset = otpVerified && verificationToken && passwordsMatch && passwordLengthValid

  async function onSendOtp() {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.')
      setSuccessMessage('')
      return
    }

    try {
      setLoadingSendOtp(true)
      setErrorMessage('')
      setSuccessMessage('')
      setOtpValue('')
      setOtpVerified(false)
      setVerificationToken('')

      await apiPost('/api/auth/send-otp', {
        email: normalizedEmail,
        purpose: 'RESET_PASSWORD',
      })

      setOtpSent(true)
      setSuccessMessage('OTP sent to your email. It is valid for 5 minutes.')
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to send OTP')
      setSuccessMessage('')
    } finally {
      setLoadingSendOtp(false)
    }
  }

  async function onVerifyOtp() {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (String(otpValue || '').length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP.')
      setSuccessMessage('')
      return
    }

    try {
      setLoadingVerifyOtp(true)
      setErrorMessage('')
      setSuccessMessage('')

      const data = await apiPost('/api/auth/verify-otp', {
        email: normalizedEmail,
        otp: otpValue,
        purpose: 'RESET_PASSWORD',
      })

      setOtpVerified(true)
      setVerificationToken(String(data?.verificationToken || ''))
      setSuccessMessage('OTP verified. You can now set a new password.')
    } catch (error) {
      setOtpVerified(false)
      setVerificationToken('')
      setErrorMessage(error?.message || 'Failed to verify OTP')
      setSuccessMessage('')
    } finally {
      setLoadingVerifyOtp(false)
    }
  }

  async function onResetPassword(event) {
    event.preventDefault()

    if (!canReset) {
      setErrorMessage('Please complete OTP verification and valid password fields.')
      setSuccessMessage('')
      return
    }

    try {
      setLoadingReset(true)
      setErrorMessage('')
      setSuccessMessage('')

      await apiPost('/api/auth/reset-password', {
        email: String(email || '').trim().toLowerCase(),
        newPassword,
        verificationToken,
      })

      navigate('/vendor/login', {
        replace: true,
        state: {
          signupEmail: String(email || '').trim().toLowerCase(),
          signupSuccessMessage: 'Password reset successful. Please login with your new password.',
        },
      })
    } catch (error) {
      setErrorMessage(error?.message || 'Password reset failed')
    } finally {
      setLoadingReset(false)
    }
  }

  return (
    <VendorAuthCard
      title="Reset Password"
      subtitle="Reset your vendor account password using email verification OTP."
      footer={(
        <span>
          Remember your password? <Link className="vendorAuthLink" to="/vendor/login">Back to Login</Link>
        </span>
      )}
      badgeText="Account Recovery"
    >
      {errorMessage ? <div className="alert error">{errorMessage}</div> : null}
      {successMessage ? <div className="alert">{successMessage}</div> : null}

      <form className="vendorAuthForm" onSubmit={onResetPassword} noValidate>
        <FormInput
          name="email"
          label="Business Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@business.com"
          autoComplete="email"
          required
        />

        <div className="vendorAuthActions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="btn secondary" onClick={onSendOtp} disabled={loadingSendOtp || loadingReset}>
            {loadingSendOtp ? 'Sending OTP...' : otpVerified ? 'Resend OTP' : 'Send OTP'}
          </button>
        </div>

        {otpSent ? (
          <div className="card" style={{ borderRadius: 12, border: '1px solid #d7e3ef', padding: 12, display: 'grid', gap: 10 }}>
            <strong style={{ fontSize: '0.9rem' }}>Enter OTP</strong>
            <OTPInput value={otpValue} onChange={setOtpValue} autoFocus disabled={loadingVerifyOtp || loadingReset} />
            <button
              type="button"
              className="btn secondary"
              style={{ width: 'fit-content' }}
              onClick={onVerifyOtp}
              disabled={loadingVerifyOtp || loadingReset || otpValue.length !== 6}
            >
              {loadingVerifyOtp ? 'Verifying...' : otpVerified ? 'Verified' : 'Verify OTP'}
            </button>
          </div>
        ) : null}

        <FormInput
          name="newPassword"
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Minimum 6 characters"
          autoComplete="new-password"
          required
          helper="Use at least 6 characters."
        />

        <FormInput
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          required
          error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : ''}
        />

        <button type="submit" className="btn" disabled={!canReset || loadingReset}>
          {loadingReset ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>
    </VendorAuthCard>
  )
}
