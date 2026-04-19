import { useMemo } from 'react'
import { Link } from 'react-router-dom'

const TRUST_BULLETS = ['Hashed Signals', 'Explainable Rules', 'Tamper-Evident Records']

const TRANSPARENCY_CARDS = [
  {
    icon: 'shield',
    title: 'Privacy-First Design',
    body: 'No personal identity tracking. Signals are hashed and privacy-safe.',
  },
  {
    icon: 'eye',
    title: 'Experience Verification',
    body: 'Trusty verifies experience authenticity using multiple explainable signals.',
  },
  {
    icon: 'ai',
    title: 'AI Content Analysis',
    body: 'Behavior and originality checks detect generic, copied, or synthetic patterns.',
  },
  {
    icon: 'fingerprint',
    title: 'Behavioral Analysis',
    body: 'Typing pace, pauses, and edits create unique authenticity fingerprints.',
  },
  {
    icon: 'chain',
    title: 'Blockchain Anchoring',
    body: 'SHA-256 metadata hashes are anchored to provide tamper-evident proof.',
  },
  {
    icon: 'spark',
    title: 'Explainable Trust',
    body: 'Every trust score has clear component reasoning. No black-box decisions.',
  },
]

function Icon({ kind }) {
  if (kind === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'eye') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (kind === 'ai') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="6" y="8" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M10 12h4M9 15h6M12 6V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'fingerprint') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4a6 6 0 00-6 6v3m12-3a6 6 0 00-6-6m0 0a3.5 3.5 0 013.5 3.5V13m-7 0v-2a3.5 3.5 0 013.5-3.5m-5.5 8.5v-2m11 2v-2m-7 5c1.2-.8 2-2.2 2-3.8V12m2.5 7.5A7.2 7.2 0 0018 14.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'chain') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9.5 8.5l2.3-2.3a3.2 3.2 0 014.5 4.5l-2.2 2.2M14.5 15.5l-2.3 2.3a3.2 3.2 0 11-4.5-4.5l2.2-2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 15l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'spark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3zM5 16l.9 2.1L8 19l-2.1.9L5 22l-.9-2.1L2 19l2.1-.9L5 16zm14 0l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return null
}

export function HomePage({ vendors, defaultVendorId }) {
  const featuredVendorId = useMemo(() => defaultVendorId || vendors?.[0]?._id || '', [defaultVendorId, vendors])
  const publicLink = featuredVendorId
    ? `/public?vendor=${encodeURIComponent(featuredVendorId)}`
    : '/public'

  return (
    <div className="lpPage">
      <section className="lpHero lpHomeSingle revealUp !rounded-[28px] !border !border-slate-200/90 !bg-gradient-to-b !from-sky-50/70 !to-white !py-16 md:!py-20 !shadow-[0_18px_45px_rgba(15,23,42,0.08)] ![animation-duration:460ms]" style={{ '--reveal-delay': '0ms' }}>
        <div className="lpSectionInner lpSectionInner--hero !mx-auto !max-w-4xl !items-start !gap-8">
          <div className="lpHeroPill !border-sky-200/80 !bg-white/85 !shadow-sm">
            <Icon kind="shield" />
            <span>AI + Blockchain Powered</span>
          </div>

          <h1 className="!text-4xl !font-extrabold !leading-[1.08] !tracking-[-0.02em] md:!text-5xl lg:!text-[3.35rem]">
            Trust <span className="lpTextAccent !bg-gradient-to-r !from-sky-600 !to-cyan-500 !bg-clip-text !text-transparent">Verified,</span>
            <br />
            <span className="lpTextMuted">Not Assumed</span>
          </h1>

          <p className="!max-w-2xl !text-slate-600 !leading-8 md:!text-[1.075rem]">
            Trusty eliminates fake reviews using behavioral analysis, explainable AI scoring, and
            blockchain verification while preserving complete user privacy.
          </p>

          <div className="lpHeroActions !mt-2 !gap-3">
            <Link className="lpBtn lpBtn--primary !rounded-lg !border-0 !bg-gradient-to-r !from-sky-600 !to-cyan-500 !px-6 !py-3 !text-white !shadow-[0_12px_24px_rgba(2,132,199,0.24)] !transition-all !duration-300 hover:!scale-[1.02] hover:!shadow-[0_16px_30px_rgba(2,132,199,0.32)]" to={publicLink}>
              Start Verifying
            </Link>
            <Link className="lpBtn lpBtn--outline !rounded-lg !border !border-slate-200 !bg-white/80 !px-6 !py-3 !text-slate-700 !transition-colors !duration-200 hover:!bg-slate-50" to={publicLink}>
              View Public Feedback
            </Link>
          </div>

          <div className="lpBulletRow">
            {TRUST_BULLETS.map((item) => (
              <div key={item} className="lpBulletItem">
                <span className="lpBulletIcon">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
                    <path d="M6.5 10.2l2.1 2.1 4.7-4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lpSectionInner lpHomeSingleBlock !pt-6 md:!pt-8">
          <div className="lpSectionHead lpSectionHead--center lpTransparencyHead">
            <h2>Built for Transparency</h2>
            <p className="lpTransparencyLead">
              Every component of Trusty is designed with privacy, explainability, and immutability as
              core principles.
            </p>
          </div>

          <div className="lpTransparencyGrid">
            {TRANSPARENCY_CARDS.map((item) => (
              <article className="lpTransparencyCard" key={item.title}>
                <div className="lpIconWrap lpIconWrap--card">
                  <Icon kind={item.icon} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="lpSectionInner lpSectionInner--cta lpHomeSingleBlock lpHomeSingleCta !border-t !border-slate-200/80 !pt-8 md:!pt-10">
          <h2>Ready to verify trust at scale?</h2>
          <p>Explore live public feedback or submit verified feedback through the Trusty public flow.</p>
          <div className="lpHeroActions">
            <Link className="lpBtn lpBtn--primary" to={publicLink}>
              Start Verifying
            </Link>
            <Link className="lpBtn lpBtn--outline" to="/transparency">
              Docs and Transparency
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
