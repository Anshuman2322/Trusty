import { Link } from 'react-router-dom'

const VENDOR_SIGNUP_ROUTE = '/vendor/signup'
const VENDOR_LOGIN_ROUTE = '/vendor/login'

const VENDOR_WORKFLOW_STEPS = [
  {
    icon: 'order',
    title: 'Create Order',
    description: 'Vendor creates an order or invoice inside the Trusty vendor dashboard.',
  },
  {
    icon: 'payment',
    title: 'Payment Confirmed',
    description:
      'The system records payment status and links it with the order to validate the purchase experience.',
  },
  {
    icon: 'monitor',
    title: 'Delivery Completed',
    description:
      'Once the delivery status is updated, Trusty prepares the feedback path for the customer.',
  },
  {
    icon: 'feedback',
    title: 'Customer Submits Feedback',
    description:
      'Customer submits feedback through the public Trusty portal without mandatory login. Only privacy-safe signals are collected.',
  },
  {
    icon: 'score',
    title: 'Trust Score Generated',
    description:
      "Trusty's scoring engine analyzes signals such as token verification, typing behavior, device patterns, IP intelligence, and feedback context.",
  },
  {
    icon: 'chain',
    title: 'Blockchain Anchored',
    description:
      'A SHA-256 metadata hash and transaction reference are generated to create tamper-evident proof.',
  },
]

const VENDOR_BENEFITS = [
  {
    icon: 'shield',
    title: 'Fake Review Detection',
    description: 'Identify spam, bot reviews, and suspicious patterns automatically.',
  },
  {
    icon: 'spark',
    title: 'Transparent Trust Scores',
    description: 'Each review includes an explainable trust score breakdown.',
  },
  {
    icon: 'privacy',
    title: 'Privacy-Safe Verification',
    description: 'No personal identity or raw IP tracking is stored.',
  },
  {
    icon: 'chain',
    title: 'Blockchain Integrity',
    description: 'Metadata hashes create tamper-evident verification records.',
  },
  {
    icon: 'users',
    title: 'Customer Confidence',
    description: 'Verified feedback builds stronger buyer trust.',
  },
  {
    icon: 'monitor',
    title: 'Fraud Pattern Monitoring',
    description: 'Repeated devices and suspicious behavior signals reduce manipulation.',
  },
]

const VENDOR_FEATURES = [
  {
    icon: 'order',
    title: 'Order Management',
    description: 'Create and manage customer orders linked to feedback collection.',
  },
  {
    icon: 'token',
    title: 'Feedback Collection System',
    description: 'Generate feedback tokens or links to collect verified customer reviews.',
  },
  {
    icon: 'feedback',
    title: 'Verified Review Monitoring',
    description: 'View all submitted feedback along with trust score explanations.',
  },
  {
    icon: 'analytics',
    title: 'Trust Score Analytics',
    description: 'Analyze trust score distribution and credibility trends across feedback.',
  },
  {
    icon: 'reputation',
    title: 'Vendor Reputation Score',
    description: 'Monitor overall credibility based on verified customer feedback.',
  },
  {
    icon: 'shield',
    title: 'Fake Review Detection',
    description: 'Automatically identify suspicious or manipulated feedback attempts.',
  },
  {
    icon: 'insights',
    title: 'Customer Feedback Insights',
    description:
      'Understand customer experiences, issues, and satisfaction signals from verified feedback.',
  },
  {
    icon: 'alert',
    title: 'Fraud Pattern Alerts',
    description:
      'Detect abnormal review patterns such as repeated devices or suspicious submissions.',
  },
  {
    icon: 'dashboard',
    title: 'Analytics Dashboard',
    description: 'Visualize feedback trends, trust score metrics, and reputation signals.',
  },
]

const INTEGRITY_RULES = [
  'Vendors cannot edit customer feedback.',
  'Vendors cannot delete reviews.',
  'Trust scores are generated automatically by the scoring engine.',
  'Suspicious patterns reduce trust score but feedback remains visible.',
]

const REPUTATION_SIGNALS = [
  'Verified feedback quality',
  'Average trust score of feedback',
  'Repeated suspicious signals',
  'Behavioral patterns in reviews',
]

function VendorIcon({ kind }) {
  if (kind === 'order') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'token') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 12a4 4 0 108 0 4 4 0 10-8 0z" stroke="currentColor" strokeWidth="2" />
        <path d="M16 12h4M18 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'feedback') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16v10H9l-4 3V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 10h8M8 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'score') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18V8M10 18V6M16 18v-4M20 18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'chain') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9.5 8.5l2.3-2.3a3.2 3.2 0 014.5 4.5l-2.2 2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M14.5 15.5l-2.3 2.3a3.2 3.2 0 11-4.5-4.5l2.2-2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 15l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'spark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'privacy') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 10V8a4 4 0 118 0v2" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (kind === 'users') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="2" />
        <path d="M4.5 18a4.5 4.5 0 019 0M13 18a3 3 0 016 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'monitor') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'payment') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
        <circle cx="16.5" cy="14" r="1.5" fill="currentColor" />
      </svg>
    )
  }

  if (kind === 'analytics') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18V8M10 18V6M16 18v-4M20 18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'reputation') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M9.3 12.3l1.7 1.7 3.7-3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'insights') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16v9H9l-4 3V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 11h2m2 0h2m2 0h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'alert') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4l8 14H4l8-14z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9v4m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="4" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="10" width="7" height="10" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  return null
}

function VendorSectionHeader({ title, description }) {
  return (
    <header className="vpSectionHeader">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  )
}

function VendorHero() {
  return (
    <section className="vpHero vpSection vpSection--hero revealUp" style={{ '--reveal-delay': '0ms' }}>
      <div className="vpSectionInner vpHeroLayout">
        <div className="vpHeroContent">
          <p className="vpEyebrow">Vendor Platform</p>
          <h1>Trustworthy Feedback for Your Business</h1>
          <p>
            Verify real customer experiences using AI-powered trust scoring and blockchain-backed
            transparency. Trusty helps businesses detect fake reviews and prove authenticity without
            collecting personal user data.
          </p>
          <div className="vpButtonRow">
            <Link to={VENDOR_SIGNUP_ROUTE} className="vpBtn vpBtn--primary">
              Create Vendor Account
            </Link>
            <Link to={VENDOR_LOGIN_ROUTE} className="vpBtn vpBtn--secondary">
              Vendor Login
            </Link>
          </div>
        </div>

        <aside className="vpHeroPreview" aria-label="Vendor dashboard preview">
          <div className="vpPreviewHeader">
            <strong>Trusty Vendor Snapshot</strong>
            <span>Live Signals</span>
          </div>
          <div className="vpPreviewMetrics">
            <div>
              <span>Orders</span>
              <strong>1,248</strong>
            </div>
            <div>
              <span>Avg Trust</span>
              <strong>82/100</strong>
            </div>
            <div>
              <span>Verified Feedback</span>
              <strong>89%</strong>
            </div>
          </div>
          <div className="vpPreviewFeed">
            <p>Recent Activity</p>
            <ul>
              <li>Order #TL-3021 token generated</li>
              <li>Feedback trust score: 91 (High)</li>
              <li>Metadata hash anchored successfully</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}

function VendorWorkflow() {
  return (
    <section className="vpSection vpSection--workflow">
      <div className="vpSectionInner">
        <VendorSectionHeader
          title="How Vendors Use Trusty"
          description="A simple verification pipeline from order creation to tamper-evident trust proof."
        />

        <div className="vpWorkflowGrid">
          {VENDOR_WORKFLOW_STEPS.map((step, index) => (
            <article className="vpWorkflowCard" key={step.title}>
              <div className="vpStepNumber">{index + 1}</div>
              <div className="vpIconWrap">
                <VendorIcon kind={step.icon} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function VendorBenefits() {
  return (
    <section className="vpSection vpSection--benefits">
      <div className="vpSectionInner">
        <VendorSectionHeader title="Why Businesses Use Trusty" />

        <div className="vpBenefitGrid">
          {VENDOR_BENEFITS.map((item) => (
            <article className="vpCard" key={item.title}>
              <div className="vpIconWrap vpIconWrap--benefit">
                <VendorIcon kind={item.icon} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <article className="vpCard">
      <div className="vpIconWrap vpIconWrap--feature">
        <VendorIcon kind={icon} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

function VendorFeaturesSection() {
  return (
    <section className="vpSection vpSection--features">
      <div className="vpSectionInner">
        <VendorSectionHeader
          title="Vendor Dashboard Features"
          description="Powerful tools that help vendors collect verified feedback, detect manipulation attempts, and monitor reputation through transparent trust signals."
        />

        <div className="vpFeatureGrid">
          {VENDOR_FEATURES.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function VendorRules() {
  return (
    <section className="vpSection vpSection--rules">
      <div className="vpSectionInner vpNarrow">
        <VendorSectionHeader
          title="Platform Integrity Rules"
          description="Trusty enforces fairness by design. These rules are hard constraints of the platform."
        />

        <ul className="vpRulesList">
          {INTEGRITY_RULES.map((rule) => (
            <li key={rule}>
              <span className="vpCheck" aria-hidden="true">✓</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function VendorTrustScore() {
  return (
    <section className="vpSection vpSection--signals">
      <div className="vpSectionInner">
        <VendorSectionHeader title="Vendor Reputation Signals" />

        <div className="vpTrustGrid">
          <article className="vpSignalPanel">
            <ul className="vpSignalList">
              {REPUTATION_SIGNALS.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </article>

          <article className="vpTrustCard">
            <div className="vpTrustMeterTrack" role="img" aria-label="Trust level indicator">
              <span className="vpTrustBand vpTrustBand--low" />
              <span className="vpTrustBand vpTrustBand--medium" />
              <span className="vpTrustBand vpTrustBand--high" />
              <span className="vpTrustPointer" style={{ left: '76%' }} />
            </div>

            <div className="vpTrustLegend">
              <div>
                <strong>0-39</strong>
                <span>Low Trust</span>
              </div>
              <div>
                <strong>40-69</strong>
                <span>Medium Trust</span>
              </div>
              <div>
                <strong>70-100</strong>
                <span>High Trust</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

function VendorDashboardPreview() {
  return (
    <section className="vpSection vpSection--dashboard">
      <div className="vpSectionInner">
        <VendorSectionHeader title="Dashboard Preview" />

        <div className="vpDashboardPreview">
          <div className="vpDashboardTop">
            <div>
              <span>Orders</span>
              <strong>1,248</strong>
            </div>
            <div>
              <span>Payments</span>
              <strong>1,103</strong>
            </div>
            <div>
              <span>Avg Trust</span>
              <strong>82/100</strong>
            </div>
          </div>

          <div className="vpDashboardBody">
            <section className="vpPanel">
              <h3>Feedback List</h3>
              <ul>
                <li>Order TL-3021 · High Trust · 91</li>
                <li>Order TL-3016 · Medium Trust · 64</li>
                <li>Order TL-3008 · High Trust · 88</li>
              </ul>
            </section>

            <section className="vpPanel">
              <h3>Trust Score Analytics</h3>
              <div className="vpMiniBars" aria-hidden="true">
                <span style={{ height: '42%' }} />
                <span style={{ height: '58%' }} />
                <span style={{ height: '71%' }} />
                <span style={{ height: '64%' }} />
                <span style={{ height: '82%' }} />
              </div>
              <h4>Feedback Token Management</h4>
              <p>Active tokens: 238 · Redeemed: 1,009</p>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}

function VendorCTA() {
  return (
    <section className="vpSection vpSection--cta">
      <div className="vpSectionInner vpNarrow">
        <div className="vpCtaWrap">
          <h2>Start Building Transparent Customer Trust</h2>
          <p>
            Join vendors using Trusty to collect verified, tamper-evident customer feedback.
          </p>
          <div className="vpButtonRow vpButtonRow--center">
            <Link to={VENDOR_SIGNUP_ROUTE} className="vpBtn vpBtn--primary">
              Create Vendor Account
            </Link>
            <Link to={VENDOR_LOGIN_ROUTE} className="vpBtn vpBtn--secondary">
              Login to Vendor Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function VendorPage() {
  return (
    <div className="vendorPage">
      <VendorHero />
      <VendorWorkflow />
      <VendorBenefits />
      <VendorFeaturesSection />
      <VendorRules />
      <VendorTrustScore />
      <VendorDashboardPreview />
      <VendorCTA />
    </div>
  )
}
