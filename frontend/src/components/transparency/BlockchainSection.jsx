import { TransparencyIcon } from './TransparencyIcon'

export function BlockchainSection() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '220ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="chain" />
        </div>
        <div>
          <h2>Tamper-Evident Verification</h2>
          <p>
            Each feedback generates a SHA-256 hash of metadata.
            This hash and timestamp are anchored to create tamper-evident proof.
          </p>
        </div>
      </div>

      <div className="tpSplitGrid">
        <article className="tpSubCard tpSubCard--chain">
          <h3>Anchored Payload</h3>
          <p className="tpMonoBlock">sha256(vendorId + orderId + createdAt + trustScore + breakdownHash)</p>
          <p className="tpSubtle">Only derived metadata hash and transaction reference are anchored.</p>
        </article>

        <article className="tpSubCard tpSubCard--notice">
          <h3>Important Privacy Note</h3>
          <p className="tpSubtle">
            Feedback text is never stored on blockchain.
            Raw payment details and identity information are also excluded from on-chain data.
          </p>
        </article>
      </div>
    </section>
  )
}
