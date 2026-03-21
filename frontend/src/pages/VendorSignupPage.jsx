import { Link, Navigate } from 'react-router-dom'
import { getSession } from '../lib/session'
import { VendorAuthCard } from '../components/VendorAuthCard'
import { SignupForm } from '../components/vendorSignup/SignupForm'

function isAuthedVendor(session) {
  return Boolean(session?.token) && session?.user?.role === 'VENDOR' && Boolean(session?.user?.vendorId)
}

export function VendorSignupPage() {
  const session = getSession()
  if (isAuthedVendor(session)) {
    return <Navigate to="/vendor/dashboard" replace />
  }

  return (
    <VendorAuthCard
      title="Create Vendor Account"
      subtitle="Create your vendor account to start collecting verified customer feedback."
      footer={(
        <span>
          Already have an account? <Link className="vendorAuthLink" to="/vendor/login">Login</Link>
        </span>
      )}
      badgeText="Vendor Onboarding"
    >
      <SignupForm />
    </VendorAuthCard>
  )
}
