import Link from "next/link";

export const metadata = {
  title: "Terms of Service | LocalHands",
  description:
    "Rules for using LocalHands — clients, workers, fees, verification, and conduct in The Gambia.",
};

export default function TermsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6 text-sm text-gray-700 leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
        <p className="text-xs text-gray-500 mt-1">
          Last updated: 31 August 2026 · LocalHands is a product of The Techwiz.
          Operated by The Techwiz Lab.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">1. Agreement</h2>
        <p>
          By creating an account or using LocalHands (&quot;the Platform&quot;,
          &quot;we&quot;, &quot;us&quot;), you agree to these Terms of Service
          and our{" "}
          <Link href="/privacy" className="text-green-700 underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the Platform.
        </p>
        <p>
          LocalHands is a product of The Techwiz and is operated by The Techwiz
          Lab. Contact:{" "}
          <a
            href="mailto:thetechwiz220@gmail.com"
            className="text-green-700 underline"
          >
            thetechwiz220@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">2. What LocalHands is</h2>
        <p>
          LocalHands is an online marketplace that helps clients find verified
          skilled workers in The Gambia, and helps workers showcase skills and
          receive job requests.
        </p>
        <p>
          <strong>We are not the employer</strong> of workers. We do not perform
          the jobs listed on the Platform. Contracts for work are between the
          client and the worker. LocalHands provides tools for discovery,
          verification, job flow, pricing transparency, and (where available)
          payment coordination.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">3. Eligibility</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must be at least 18 years old.</li>
          <li>You must provide accurate information.</li>
          <li>One person should use one account, unless we agree otherwise.</li>
          <li>
            You are responsible for keeping access to your email and account
            secure.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">4. Accounts and roles</h2>
        <p>
          You may use LocalHands as a <strong>client</strong> (hire help), a{" "}
          <strong>worker</strong> (offer skills), or both over time. Some
          accounts are designated <strong>admin</strong> for platform operations
          only.
        </p>
        <p>
          Applying as a worker does not guarantee verification or listing in
          Find. We may approve, reject, suspend, or remove verification at our
          discretion to protect users and platform quality.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">5. Worker verification</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Workers may need to provide skills, proof of work, age confirmation,
            and (where required) ID checks arranged by LocalHands.
          </li>
          <li>
            Verified status is a platform signal, not a guarantee of skill,
            safety, or outcome of any job.
          </li>
          <li>
            We may suspend a worker&apos;s verification. Suspended workers may
            still appear in search with a clear Suspended label and cannot
            receive new job requests until re-approved.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">6. Jobs, prices, and fees</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Clients set a budget (and may negotiate in-app where the product
            allows). When a worker accepts, that price is treated as agreed for
            that job on the Platform.
          </li>
          <li>
            LocalHands charges a <strong>platform fee</strong> (currently 10% of
            the agreed job amount unless we state otherwise in the app). The fee
            supports verification, hosting, and product development.
          </li>
          <li>
            Fee breakdowns shown in the app (what the client pays, what the
            worker receives, platform fee) are intended to reduce disputes.
            Follow in-app instructions for payment references (e.g. Wave).
          </li>
          <li>
            Until a full in-app payment / escrow partner is connected, payment
            may be coordinated using references you enter. You agree not to
            misreport payments.
          </li>
          <li>
            Attempting to move paid work off-platform solely to avoid LocalHands
            fees, after meeting through the Platform, is not allowed.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">7. Conduct</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Post false, misleading, or fraudulent profiles or job ads</li>
          <li>Harass, threaten, or discriminate against other users</li>
          <li>Upload illegal, harmful, or deceptive content</li>
          <li>Manipulate ratings or leave fake reviews</li>
          <li>Scrape, attack, or abuse the Platform or other users&apos; data</li>
          <li>
            Use LocalHands for anything illegal under the laws of The Gambia
          </li>
        </ul>
        <p>
          We may suspend or permanently ban accounts that break these rules.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">8. Ratings and content</h2>
        <p>
          Ratings and comments should be honest and related to the job. You
          grant LocalHands a non-exclusive licence to display content you post
          (profile, skills, proof of work, reviews) as needed to operate the
          Platform. You remain responsible for that content.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">9. Disclaimers</h2>
        <p>
          The Platform is provided &quot;as is&quot;. We work to keep it
          reliable and fair, but we do not guarantee uninterrupted access,
          that every worker or client will behave well, or that every job will
          meet your expectations.
        </p>
        <p>
          Clients and workers are responsible for the quality, safety, and
          legality of the work they agree to do with each other. LocalHands is
          not liable for personal injury, property damage, lost income, or
          disputes arising from jobs arranged through the Platform, except
          where the law of The Gambia does not allow us to limit liability.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">10. Suspension and termination</h2>
        <p>
          You may stop using LocalHands at any time. You may request account
          closure by emailing us. We may suspend or terminate access if you
          breach these Terms, create risk for other users, or if we discontinue
          the service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">11. Changes</h2>
        <p>
          We may update these Terms as the product grows (for example when
          in-app payments or escrow launch). The &quot;Last updated&quot; date
          will change. Continued use after changes means you accept the updated
          Terms. Material changes may also be noted in the app.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">12. Governing law</h2>
        <p>
          These Terms are governed by the laws of The Gambia. Disputes that
          cannot be resolved informally may be brought in the competent courts
          of The Gambia.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">13. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a
            href="mailto:thetechwiz220@gmail.com"
            className="text-green-700 underline"
          >
            thetechwiz220@gmail.com
          </a>
        </p>
      </section>

      <p className="text-xs text-gray-500 border-t pt-4">
        These Terms are written for early operation of LocalHands. They are not
        a substitute for formal legal advice. We may refine them with counsel
        as the business scales.
      </p>

      <p className="pt-2 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
        <Link href="/privacy" className="text-green-700 hover:underline">
          Privacy Policy
        </Link>
        <Link href="/" className="text-green-700 hover:underline">
          ← Back to LocalHands
        </Link>
      </p>
    </div>
  );
}
