import { TransparencyIcon } from './TransparencyIcon'

const FAQ_ITEMS = [
  {
    q: 'How is trust score calculated?',
    a: 'Trust score is computed from independent trust signals such as token verification, payment proof, behavior analysis, device pattern checks, IP intelligence, and context depth. Additional bounded adjustments can apply for duplicate patterns and network risk.',
  },
  {
    q: 'Can vendors delete feedback?',
    a: 'No. Vendors cannot delete feedback through the Trusty platform. This protects historical transparency and auditability.',
  },
  {
    q: 'Is personal data stored?',
    a: 'Trusty does not store raw IP, GPS, or personal identity for scoring. It stores privacy-safe hashed identifiers and coarse location metadata.',
  },
  {
    q: 'What happens if suspicious activity is detected?',
    a: 'Feedback is not automatically removed. Suspicious patterns reduce trust score so users can see risk context instead of losing visibility into submissions.',
  },
  {
    q: 'Why is blockchain used?',
    a: 'Blockchain anchoring provides tamper-evident verification by storing a metadata hash and timestamp reference, without exposing feedback text.',
  },
]

export function FAQSection() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '470ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="faq" />
        </div>
        <div>
          <h2>Frequently Asked Questions</h2>
          <p>Clear answers for teams, vendors, and users evaluating Trusty trust infrastructure.</p>
        </div>
      </div>

      <div className="tpFaqList" role="list" aria-label="Frequently asked questions">
        {FAQ_ITEMS.map((item) => (
          <details className="tpFaqItem" key={item.q} role="listitem">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
