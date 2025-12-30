import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { BetPotLogoIcon } from '@/components/icons/BetPotLogo';

export function PrivacyPolicyPage() {
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
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-blue-500" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white">
                            Privacy Policy
                        </h1>
                    </div>
                </div>

                <div className="card p-8 space-y-6 text-text-secondary dark:text-gray-300">
                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Information We Collect
                        </h2>
                        <p>When you use BetPot, we may collect:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li><strong>Wallet Address:</strong> Your Solana wallet public address</li>
                            <li><strong>Transaction Data:</strong> Betting history and transaction signatures</li>
                            <li><strong>Usage Data:</strong> How you interact with the platform</li>
                            <li><strong>Optional:</strong> Email address if you choose to provide it</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            How We Use Your Information
                        </h2>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Processing bets and payouts</li>
                            <li>Preventing fraud and abuse</li>
                            <li>Improving platform functionality</li>
                            <li>Sending notifications about your bets (if enabled)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Blockchain Transparency
                        </h2>
                        <p>
                            All transactions on the Solana blockchain are publicly visible. Your wallet
                            address and transaction history can be viewed by anyone using blockchain
                            explorers. This is inherent to blockchain technology.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Data Security
                        </h2>
                        <p>
                            We implement industry-standard security measures to protect your information.
                            However, no system is 100% secure. You are responsible for keeping your
                            wallet credentials safe.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Cookies
                        </h2>
                        <p>
                            We use local storage to remember your preferences (theme, wallet connection).
                            No third-party tracking cookies are used.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Contact
                        </h2>
                        <p>
                            For privacy concerns, contact us on X (Twitter):{' '}
                            <a
                                href="https://x.com/BetPotWeb3wl"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-500 hover:underline"
                            >
                                @BetPotWeb3wl
                            </a>
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
