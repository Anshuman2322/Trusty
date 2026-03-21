import {
  AboutCTA,
  AboutHero,
  PrinciplesSection,
  PrivacySection,
  ProblemSection,
  SolutionSection,
  TechnologySection,
  TransparencySection,
  TrustFlowSection,
  WhyTrustySection,
} from '../components/about'
import './AboutPage.css'

export function AboutPage() {
  return (
    <div className="abPage">
      <AboutHero />
      <ProblemSection />
      <SolutionSection />
      <PrinciplesSection />
      <TrustFlowSection />
      <WhyTrustySection />
      <PrivacySection />
      <TechnologySection />
      <TransparencySection />
      <AboutCTA />
    </div>
  )
}
