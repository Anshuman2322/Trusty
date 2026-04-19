import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const PRODUCT_LINKS = [
  { label: 'Vendor Portal', to: '/vendor' },
  { label: 'Public Feedback', to: '/public' },
  { label: 'Admin Dashboard', to: '/admin' },
  { label: 'Trust Scoring Engine', to: '/how-it-works' },
  { label: 'Transparency API', to: '/transparency' },
]

const RESOURCE_LINKS = [
  { label: 'Documentation', to: '/transparency' },
  { label: 'Trust Algorithm', to: '/how-it-works' },
  { label: 'Privacy Policy', to: '/transparency' },
  { label: 'Terms of Service', to: '/transparency' },
  { label: 'Contact Support', to: '/vendor/login' },
  { label: 'System Health', to: '/transparency' },
]

const SOCIAL_LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="tw-h-4 tw-w-4">
        <path d="M9 18c-4 1.2-4-2-5.8-2.4M14.8 20v-3.1c0-1 .1-1.8-.4-2.6 2.7-.3 5.6-1.3 5.6-6A4.7 4.7 0 0018.7 5 4.3 4.3 0 0018.6 2s-1-.3-3.6 1.3a12.7 12.7 0 00-6 0C6.4 1.7 5.4 2 5.4 2a4.3 4.3 0 00-.1 3A4.7 4.7 0 004 8.3c0 4.6 2.9 5.7 5.6 6-.4.8-.4 1.5-.4 2.3V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Twitter',
    href: 'https://x.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="tw-h-4 tw-w-4">
        <path d="M22 5.9c-.7.4-1.5.7-2.3.8a4 4 0 001.8-2.2c-.8.5-1.7.9-2.6 1.1a4 4 0 00-6.8 3.6A11.4 11.4 0 013 4.8a4 4 0 001.2 5.3c-.6 0-1.2-.2-1.7-.5a4 4 0 003.2 3.9c-.5.2-1.1.2-1.7.1a4 4 0 003.7 2.8A8 8 0 012 18.1a11.3 11.3 0 006.1 1.8c7.4 0 11.5-6.3 11.2-12 .8-.5 1.5-1.2 2.1-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="tw-h-4 tw-w-4">
        <path d="M8 10v8M4 10v8M6 6.5a.5.5 0 100 1 .5.5 0 000-1zM12 18v-5c0-1.7 1.3-3 3-3s3 1.3 3 3v5M12 12v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function FooterHeading({ children }) {
  return <h4 className="tw-mb-0.5 tw-text-sm tw-font-semibold tw-text-gray-900">{children}</h4>
}

export function Footer() {
  const [isVisible, setIsVisible] = useState(false)
  const footerRef = useRef(null)

  useEffect(() => {
    const node = footerRef.current
    if (!node) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <footer
      ref={footerRef}
      className={[
        'tw-bg-transparent',
        'tw-transition-all tw-duration-500',
        isVisible ? 'tw-translate-y-0 tw-opacity-100' : 'tw-translate-y-3 tw-opacity-0',
      ].join(' ')}
    >
      <div className="tw-grid tw-w-full tw-grid-cols-1 tw-gap-3 tw-px-6 tw-py-5 md:tw-grid-cols-2 lg:tw-grid-cols-12 lg:tw-gap-4 lg:tw-px-12 xl:tw-px-16">
        <div className="tw-space-y-1.5 lg:tw-col-span-4">
          <Link to="/" className="tw-inline-flex tw-items-center tw-gap-2">
            <span className="tw-inline-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-bg-cyan-50 tw-text-cyan-600 tw-ring-1 tw-ring-cyan-100">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="tw-h-4 tw-w-4">
                <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="tw-text-sm tw-font-semibold tw-tracking-[0.01em] tw-text-gray-900">
              Trust<span className="tw-text-cyan-500">Lens</span>
            </span>
          </Link>
          <div className="tw-max-w-sm tw-space-y-1.5">
            <p className="tw-text-sm tw-leading-snug tw-text-gray-600">
              AI-powered trust scoring for verifiable feedback, fraud resistance, and transparent vendor reputation.
            </p>
            <p className="tw-text-sm tw-leading-snug tw-text-gray-600">
              Built with privacy-safe signals and blockchain-backed audit anchoring.
            </p>
          </div>
        </div>

        <div className="lg:tw-col-span-2">
          <FooterHeading>Product</FooterHeading>
          <ul className="tw-m-0 tw-list-none tw-space-y-1.5 tw-p-0">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="tw-inline-flex tw-items-center tw-text-sm tw-text-gray-500 tw-transition-all tw-duration-200 hover:tw-translate-x-1 hover:tw-text-blue-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:tw-col-span-3">
          <FooterHeading>Resources</FooterHeading>
          <ul className="tw-m-0 tw-list-none tw-space-y-1.5 tw-p-0">
            {RESOURCE_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="tw-inline-flex tw-items-center tw-text-sm tw-text-gray-500 tw-transition-all tw-duration-200 hover:tw-translate-x-1 hover:tw-text-blue-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:tw-col-span-3">
          <FooterHeading>Connect</FooterHeading>
          <div className="tw-flex tw-items-center tw-gap-1.5">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                aria-label={item.label}
                className="tw-inline-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-rounded-full tw-bg-gray-100 tw-text-gray-500 tw-transition-all tw-duration-200 hover:tw-scale-105 hover:tw-bg-blue-50 hover:tw-text-blue-500"
              >
                {item.icon}
              </a>
            ))}
          </div>
          <div className="tw-mt-1.5 tw-text-xs tw-leading-snug tw-text-gray-500">
            Enterprise support SLA: critical platform incidents triaged within 24 hours.
          </div>
        </div>
      </div>

      <div className="tw-mt-3 tw-w-full tw-border-t tw-border-gray-200 tw-px-6 tw-pt-2 lg:tw-px-12 xl:tw-px-16">
        <div className="tw-flex tw-flex-col tw-gap-1 tw-pb-1.5 md:tw-flex-row md:tw-items-center md:tw-justify-between">
          <p className="tw-text-xs tw-leading-snug tw-text-gray-500">© 2026 TrustLens. Built for transparency.</p>
          <p className="tw-text-xs tw-leading-snug tw-text-gray-500">🔒 Privacy-first · 🔗 Blockchain-backed · 👁 Transparent scoring</p>
        </div>
      </div>
    </footer>
  )
}
