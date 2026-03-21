import {
  AISimilaritySection,
  ArchitectureSection,
  BlockchainSection,
  DocsHero,
  FAQSection,
  IntegrityRules,
  LimitationsSection,
  PrivacySection,
  TrustScoreOverview,
  TrustSignals,
} from '../components/transparency'
import './TransparencyPage.css'

export function TransparencyPage() {
  return (
    <div className="tpPage">
      <DocsHero />
      <TrustScoreOverview />
      <TrustSignals />
      <AISimilaritySection />
      <BlockchainSection />
      <PrivacySection />
      <IntegrityRules />
      <LimitationsSection />
      <ArchitectureSection />
      <FAQSection />
    </div>
  )
}
