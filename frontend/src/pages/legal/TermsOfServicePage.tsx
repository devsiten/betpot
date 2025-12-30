import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BetPotLogoIcon } from '@/components/icons/BetPotLogo';

export function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-background dark:bg-gray-950 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-text-muted dark:text-gray-400 hover:text-brand-500 mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <BetPotLogoIcon size={48} />
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white">
                        Terms of Service
                    </h1>
                </div>

                <div className="card p-8 space-y-6 text-text-secondary dark:text-gray-300">
                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Acceptance of Terms
                        </h2>
                        <p>
                            By accessing or using BetPot, you agree to be bound by these Terms of Service.
                            If you do not agree, do not use this platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Eligibility
                        </h2>
                        <p>You must be:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>At least 18 years old (or legal gambling age in your jurisdiction)</li>
                            <li>Located in a jurisdiction where online gambling is legal</li>
                            <li>Capable of entering into legally binding agreements</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Platform Rules
                        </h2>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>All bets are final once confirmed on the blockchain</li>
                            <li>Event outcomes are determined by official sources</li>
                            <li>Payouts are distributed proportionally to winners</li>
                            <li>A 1% platform fee is deducted from winning payouts</li>
                            <li>Admin decisions on event resolution are final</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Prohibited Activities
                        </h2>
                        <p>You may not:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Use bots or automated systems to place bets</li>
                            <li>Attempt to manipulate events or outcomes</li>
                            <li>Create multiple accounts to exploit promotions</li>
                            <li>Use the platform for money laundering</li>
                            <li>Circumvent security measures</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Limitation of Liability
                        </h2>
                        <p>
                            BetPot is provided "as is" without warranties. We are not liable for:
                        </p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Losses from betting activities</li>
                            <li>Technical failures or downtime</li>
                            <li>Smart contract bugs or exploits</li>
                            <li>Incorrect event resolutions (though we strive for accuracy)</li>
                            <li>Third-party actions affecting payouts</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Dispute Resolution
                        </h2>
                        <p>
                            For disputes regarding event outcomes or payouts, contact us on X (Twitter).
                            We will review all disputes in good faith. Decisions by the admin team are final.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Changes to Terms
                        </h2>
                        <p>
                            We may update these terms at any time. Continued use after changes
                            constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <p className="text-sm text-text-muted dark:text-gray-500 pt-4 border-t border-border dark:border-gray-800">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
