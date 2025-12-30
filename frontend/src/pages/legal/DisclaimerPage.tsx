import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export function DisclaimerPage() {
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

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-yellow-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary dark:text-white">
                        Disclaimer
                    </h1>
                </div>

                <div className="card p-8 space-y-6 text-text-secondary dark:text-gray-300">
                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Gambling Risk Warning
                        </h2>
                        <p>
                            BetPot is a prediction market platform that involves financial risk.
                            You should only bet with funds you can afford to lose. Gambling can be addictive.
                            Please bet responsibly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            No Financial Advice
                        </h2>
                        <p>
                            Nothing on this platform constitutes financial, investment, legal, or tax advice.
                            All predictions and outcomes are for entertainment purposes only.
                            Past results do not guarantee future outcomes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Blockchain Risks
                        </h2>
                        <p>
                            This platform operates on the Solana blockchain. Transactions are irreversible
                            and subject to network conditions. We are not responsible for:
                        </p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Lost funds due to incorrect wallet addresses</li>
                            <li>Network congestion or failed transactions</li>
                            <li>Smart contract vulnerabilities</li>
                            <li>Wallet security breaches</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Jurisdiction
                        </h2>
                        <p>
                            Online gambling may be restricted or prohibited in your jurisdiction.
                            You are solely responsible for ensuring compliance with applicable laws
                            in your country or region. By using this platform, you confirm that
                            online gambling is legal in your jurisdiction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-3">
                            Testnet Notice
                        </h2>
                        <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                            ⚠️ This platform is currently running on Solana Devnet for testing purposes.
                            All transactions use test SOL with no real monetary value.
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
