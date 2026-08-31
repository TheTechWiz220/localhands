import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | LocalHands",
  description: "How LocalHands collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6 text-sm text-gray-700 leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mt-1">
          Last updated: 31 August 2026 · LocalHands is a product of The Techwiz.
          Operated by The Techwiz Lab.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">1. Who we are</h2>
        <p>
          LocalHands ("we", "us") is a platform that connects clients with
          verified skilled workers in The Gambia. It is a product of The Techwiz
          and is operated by The Techwiz Lab. Contact:{" "}
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
        <h2 className="font-semibold text-gray-900">2. Information we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account data:</strong> email address, name, role (client /
            worker / admin), location area, bio, and profile photo you upload.
          </li>
          <li>
            <strong>Worker application data:</strong> skills, proof-of-work
            images, and confirmation that you are 18+. Admins may record that an
            ID was checked in person (we do not store ID document scans on the
            platform by default).
          </li>
          <li>
            <strong>Job and payment records:</strong> job titles, budgets,
            status, ratings, comments, and payment references you enter (e.g.
            Wave reference).
          </li>
          <li>
            <strong>Technical data:</strong> basic device/browser information
            needed to run the site securely (via our hosting and auth providers).
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">3. How we use information</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Create and manage your account</li>
          <li>Verify workers and show public profiles (name, skills, ratings)</li>
          <li>Match jobs, show fees, and support completion and ratings</li>
          <li>Operate admin tools for safety and platform quality</li>
          <li>Respond to support requests and improve the product</li>
        </ul>
        <p>
          We do not sell your personal data. Client contact details are kept
          private until a job match is confirmed, where the product is designed
          that way.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">4. Service providers</h2>
        <p>
          We use trusted providers to run LocalHands, including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Supabase</strong> — authentication, database, and file
            storage
          </li>
          <li>
            <strong>Vercel</strong> — website hosting and delivery
          </li>
        </ul>
        <p>
          These providers process data under their own security and privacy
          terms, only as needed to provide the service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">5. Payments</h2>
        <p>
          Early versions may record payment references (for example Wave) that
          users enter. Card or in-app wallet processing, when added, will be
          handled by the payment partner and described in an updated policy.
          LocalHands does not store full mobile-money PINs or bank passwords.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">6. Data retention</h2>
        <p>
          We keep account and job records while your account is active and as
          needed for disputes, legal obligations, or platform integrity. You may
          request account deletion by emailing us; we will delete or anonymise
          personal data where we are not required to keep it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">7. Your choices</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Update profile details in the app</li>
          <li>Request correction or deletion via email</li>
          <li>Stop using the service and request account closure</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">8. Security</h2>
        <p>
          We use industry-standard measures (HTTPS, access controls, provider
          security features). No system is 100% secure; please use a strong
          password and protect your email login.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">9. Children</h2>
        <p>
          LocalHands is intended for users 18 years and older. Workers must
          confirm they are 18+ when applying.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">10. Changes</h2>
        <p>
          We may update this policy as the product grows (for example when
          in-app payments launch). The "Last updated" date will change; material
          changes may also be noted in the app.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">11. Contact</h2>
        <p>
          Questions about privacy:{" "}
          <a
            href="mailto:thetechwiz220@gmail.com"
            className="text-green-700 underline"
          >
            thetechwiz220@gmail.com
          </a>
        </p>
      </section>

      <p className="pt-4 border-t text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
        <Link href="/terms" className="text-green-700 hover:underline">
          Terms of Service
        </Link>
        <Link href="/" className="text-green-700 hover:underline">
          ← Back to LocalHands
        </Link>
      </p>
    </div>
  );
}
