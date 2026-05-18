import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/Button";

export const metadata: Metadata = {
  title: "Terms & Conditions | Respondly",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="relative h-14 w-auto aspect-[3/1] mr-5">
              <Image
                src="/logo-header.png"
                alt="Respondly"
                fill
                className="object-contain "
                priority
              />
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="!w-auto">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button className="!w-auto">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Terms & Conditions
          </h1>
          <p className="mt-3 text-sm text-gray-500">Last updated: May 18, 2026</p>

          <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">1. Acceptance</h2>
              <p>
                By accessing or using Respondly (the “Service”), you agree to these Terms &
                Conditions. If you do not agree, do not use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">2. Account and access</h2>
              <p>
                You are responsible for maintaining the confidentiality of your access credentials
                and for all activity that occurs under your account. You agree to provide accurate
                and up-to-date information when registering.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">
                3. Integrations and Google data
              </h2>
              <p>
                Respondly may integrate with Google Business Profile to sync locations and reviews.
                You represent that you have authorization to connect and manage the data of the
                business(es) associated with your account.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">
                4. Automation and generated content
              </h2>
              <p>
                The Service may suggest replies or automate publishing based on rules, templates,
                and/or AI features. You are solely responsible for reviewing, approving (where
                applicable), and ensuring that any published responses are accurate, appropriate,
                and compliant with the policies of connected platforms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">5. Acceptable use</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>violate laws, regulations, or third-party rights;</li>
                <li>attempt to access, interfere with, or exploit vulnerabilities in the Service;</li>
                <li>
                  publish unlawful, offensive, discriminatory, misleading content, or content that
                  infringes intellectual property.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">
                6. Plans, payments, and cancellation
              </h2>
              <p>
                If you subscribe to a paid plan, pricing, billing frequency, and plan terms will be
                presented at the time of purchase. You may cancel using the options available in
                the Service; cancellation does not eliminate payment obligations incurred up to the
                effective cancellation date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">7. Intellectual property</h2>
              <p>
                Respondly and its components (including brand, design, and software) are protected
                by intellectual property laws. These Terms do not grant you any ownership rights in
                the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">
                8. Disclaimers and limitation of liability
              </h2>
              <p>
                The Service is provided “as is” and may experience downtime or errors. To the
                maximum extent permitted by applicable law, Respondly is not liable for indirect
                losses, lost profits, or damages arising from the use of the Service, including
                decisions made based on automations or suggestions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">9. Changes</h2>
              <p>
                We may update these Terms from time to time. When we do, we will update the “Last
                updated” date on this page. Continued use of the Service after changes indicates
                acceptance of the updated Terms.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-600">
            <p>
              Back to{" "}
              <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                the homepage
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
