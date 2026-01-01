import { ExternalLink, Wallet, Coins, Trophy, Gift, Clock, Info, CheckCircle } from 'lucide-react';
import { BetPotLogoIcon } from '@/components/icons/BetPotLogo';

export function TestnetGuidePage() {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
                <div className="flex justify-center mb-4">
                    <BetPotLogoIcon size={64} />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-text-primary dark:text-white mb-4">
                    BETPOT Testnet Guide
                </h1>
                <p className="text-xl text-text-secondary dark:text-gray-300 max-w-2xl mx-auto">
                    Welcome to the future of decentralized betting.
                    Here's everything you need to participate in our testnet.
                </p>
            </div>

            {/* What is BETPOT */}
            <section className="bg-background-card dark:bg-gray-900 rounded-2xl p-6 md:p-8 border border-border dark:border-gray-800 shadow-card mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                        <Info className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary dark:text-white">What is BETPOT?</h2>
                </div>
                <p className="text-text-secondary dark:text-gray-300 leading-relaxed mb-4">
                    BetPot is a prediction jackpot platform where everyone who picks the right outcome splits the prize pool.
                    We bring the thrill of prediction markets to Web3 with a simple mechanic: pick the winning outcome,
                    buy your tickets, and claim your share of the prize pool if you win.
                </p>
                <p className="text-text-secondary dark:text-gray-300 leading-relaxed">
                    All transactions happen on-chain for complete transparency. Currently testing on Solana Devnet
                    with more chains coming soon. Uses SOL for betting and gas fees.
                </p>
            </section>

            {/* How It Works */}
            <section className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-6 flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    How It Works
                </h2>

                <div className="grid gap-4">
                    {[
                        {
                            step: '1',
                            title: 'Browse Jackpots',
                            description: 'Head to the Jackpot page to see all active betting events. Each event has a question with multiple outcomes to choose from.'
                        },
                        {
                            step: '2',
                            title: 'Pick Your Outcome',
                            description: 'Select the outcome you think will win. You can purchase as many tickets as you want (each jackpot has a maximum ticket limit).'
                        },
                        {
                            step: '3',
                            title: 'Wait for Resolution',
                            description: 'Events typically resolve within 2-3 hours. Once the outcome is determined, winners are calculated automatically.'
                        },
                        {
                            step: '4',
                            title: 'Claim Your Winnings',
                            description: 'If you won, go to your Dashboard to claim your share of the prize pool. Winnings are paid in SOL directly to your wallet.'
                        }
                    ].map((item) => (
                        <div key={item.step} className="flex gap-4 bg-background-card dark:bg-gray-900 rounded-xl p-5 border border-border dark:border-gray-800 shadow-soft">
                            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 border border-brand-200 dark:border-brand-700">
                                <span className="text-brand-700 dark:text-brand-400 font-bold">{item.step}</span>
                            </div>
                            <div>
                                <h3 className="text-text-primary dark:text-white font-semibold mb-1">{item.title}</h3>
                                <p className="text-text-secondary dark:text-gray-400 text-sm">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Fees */}
            <section className="bg-gradient-to-r from-brand-50 to-positive-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 md:p-8 border border-brand-200 dark:border-gray-700 mb-8">
                <h2 className="text-xl font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    Platform Fees
                </h2>
                <ul className="space-y-3 text-text-secondary dark:text-gray-300">
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <span><strong className="text-text-primary dark:text-white">1% Platform Fee</strong> on each transaction</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <span><strong className="text-text-primary dark:text-white">SOL</strong> for ticket purchases, payouts, and gas fees</span>
                    </li>
                </ul>
            </section>

            {/* Get Testnet Tokens */}
            <section className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-6 flex items-center gap-3">
                    <Gift className="w-6 h-6 text-positive-600 dark:text-positive-400" />
                    Get Testnet SOL
                </h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">
                    To participate in the testnet, you'll need Devnet SOL for gas and betting.
                    Get it for free from the official Solana faucet:
                </p>

                <div className="grid md:grid-cols-1 gap-4">
                    {/* SOL Faucet */}
                    <a
                        href="https://faucet.solana.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 bg-background-card dark:bg-gray-900 hover:bg-background-secondary dark:hover:bg-gray-800 rounded-xl p-6 border border-border dark:border-gray-800 hover:border-positive-300 dark:hover:border-positive-600 transition-all shadow-soft"
                    >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-positive-400 to-positive-600 flex items-center justify-center">
                            <Wallet className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-text-primary dark:text-white font-semibold group-hover:text-positive-600 dark:group-hover:text-positive-400 transition-colors">
                                Solana Faucet
                            </h3>
                            <p className="text-text-muted dark:text-gray-400 text-sm">Get free Devnet SOL for gas and betting</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-text-muted dark:text-gray-400 group-hover:text-positive-600 dark:group-hover:text-positive-400" />
                    </a>
                </div>
            </section>

            {/* Quick Tips */}
            <section className="bg-background-card dark:bg-gray-900 rounded-2xl p-6 md:p-8 border border-border dark:border-gray-800 shadow-card mb-8">
                <h2 className="text-xl font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    Quick Tips
                </h2>
                <ul className="space-y-3 text-text-secondary dark:text-gray-300">
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>Connect with <strong className="text-text-primary dark:text-white">Phantom</strong> or <strong className="text-text-primary dark:text-white">Solflare</strong> wallet (other wallets not supported)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>Make sure your wallet is set to <strong className="text-text-primary dark:text-white">Devnet</strong> network before connecting</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>After connecting, click <strong className="text-text-primary dark:text-white">Sign In</strong> to authenticate your wallet</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>Check the <strong className="text-text-primary dark:text-white">Dashboard</strong> after events resolve to claim winnings</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>Sessions expire after <strong className="text-text-primary dark:text-white">2 hours</strong> of inactivity for security</span>
                    </li>
                </ul>
            </section>

            {/* How to Switch to Devnet */}
            <section className="bg-gradient-to-r from-positive-50 to-brand-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 md:p-8 border border-positive-200 dark:border-gray-700 mb-8">
                <h2 className="text-xl font-bold text-text-primary dark:text-white mb-6 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-positive-600 dark:text-positive-400" />
                    How to Switch to Devnet
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Phantom Instructions */}
                    <div className="bg-background-card dark:bg-gray-900 rounded-xl p-5 border border-border dark:border-gray-800">
                        <h3 className="font-bold text-text-primary dark:text-white mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-400">P</span>
                            Phantom Wallet
                        </h3>
                        <ol className="space-y-2 text-text-secondary dark:text-gray-400 text-sm">
                            <li className="flex gap-2">
                                <span className="font-bold text-brand-600 dark:text-brand-400">1.</span>
                                <span>Go to <strong className="text-text-primary dark:text-white">Settings</strong></span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-brand-600 dark:text-brand-400">2.</span>
                                <span>Click <strong className="text-text-primary dark:text-white">Developer Settings</strong></span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-brand-600 dark:text-brand-400">3.</span>
                                <span>Click <strong className="text-text-primary dark:text-white">Solana</strong></span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-brand-600 dark:text-brand-400">4.</span>
                                <span>Select <strong className="text-text-primary dark:text-white">Devnet</strong></span>
                            </li>
                        </ol>
                    </div>

                    {/* Solflare Instructions */}
                    <div className="bg-background-card dark:bg-gray-900 rounded-xl p-5 border border-border dark:border-gray-800">
                        <h3 className="font-bold text-text-primary dark:text-white mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-orange-400">S</span>
                            Solflare Wallet
                        </h3>
                        <ol className="space-y-2 text-text-secondary dark:text-gray-400 text-sm">
                            <li className="flex gap-2">
                                <span className="font-bold text-brand-600 dark:text-brand-400">1.</span>
                                <span>Go to <strong className="text-text-primary dark:text-white">Settings</strong></span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-brand-600 dark:text-brand-400">2.</span>
                                <span>Click <strong className="text-text-primary dark:text-white">General</strong></span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-brand-600 dark:text-brand-400">3.</span>
                                <span>Click <strong className="text-text-primary dark:text-white">Network</strong></span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-brand-600 dark:text-brand-400">4.</span>
                                <span>Select <strong className="text-text-primary dark:text-white">Devnet</strong></span>
                            </li>
                        </ol>
                    </div>
                </div>

                <p className="text-sm text-text-muted dark:text-gray-500 mt-4 text-center">
                    After switching to Devnet, connect your wallet and sign in to the platform.
                </p>
            </section>

            {/* Supported Wallets */}
            <section className="text-center py-8">
                <p className="text-text-muted dark:text-gray-400 text-sm mb-6">Supported Wallets for Testnet</p>
                <div className="flex items-center justify-center gap-8 flex-wrap">
                    <div className="flex items-center gap-3 px-4 py-3 bg-background-card dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-soft">
                        <div className="w-10 h-10 rounded-lg bg-positive-100 dark:bg-positive-900/30 flex items-center justify-center border border-positive-200 dark:border-positive-700">
                            <Wallet className="w-5 h-5 text-positive-600 dark:text-positive-400" />
                        </div>
                        <span className="text-text-primary dark:text-white font-medium">Phantom</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-background-card dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-soft">
                        <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center border border-brand-200 dark:border-brand-700">
                            <Wallet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <span className="text-text-primary dark:text-white font-medium">Solflare</span>
                    </div>
                </div>
                <p className="text-text-muted dark:text-gray-400 text-xs mt-4">More wallets and chains coming soon</p>
            </section>
        </div>
    );
}
