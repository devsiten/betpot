import { ExternalLink, Wallet, Coins, Trophy, Gift, Clock, Info, CheckCircle } from 'lucide-react';

export function TestnetGuidePage() {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    BETPOT Testnet Guide
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Welcome to the future of decentralized betting.
                    Here's everything you need to participate in our testnet.
                </p>
            </div>

            {/* What is BETPOT */}
            <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                        <Info className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">What is BETPOT?</h2>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                    BETPOT is a decentralized jackpot betting platform. We bring the thrill of prediction markets
                    to Web3 with a simple yet exciting mechanic: pick the winning outcome, buy your tickets, and claim your share
                    of the prize pool if you win.
                </p>
                <p className="text-gray-300 leading-relaxed">
                    All transactions happen on-chain for complete transparency. Currently testing on Solana Devnet
                    with more chains coming soon. Uses USDC for betting and native tokens for gas fees.
                </p>
            </section>

            {/* How It Works */}
            <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-teal-400" />
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
                            description: 'If you won, go to your Dashboard to claim your share of the prize pool. Winnings are paid in USDC directly to your wallet.'
                        }
                    ].map((item) => (
                        <div key={item.step} className="flex gap-4 bg-white/5 rounded-xl p-5 border border-white/10">
                            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-teal-400 font-bold">{item.step}</span>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                                <p className="text-gray-400 text-sm">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Fees */}
            <section className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-2xl p-6 md:p-8 border border-teal-500/20 mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-teal-400" />
                    Platform Fees
                </h2>
                <ul className="space-y-3 text-gray-300">
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-teal-400" />
                        <span><strong className="text-white">1% Platform Fee</strong> on each transaction</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-teal-400" />
                        <span><strong className="text-white">USDC</strong> for ticket purchases and payouts</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-teal-400" />
                        <span><strong className="text-white">Native tokens</strong> for gas fees (SOL on Solana testnet)</span>
                    </li>
                </ul>
            </section>

            {/* Get Testnet Tokens */}
            <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <Gift className="w-6 h-6 text-purple-400" />
                    Get Testnet Tokens
                </h2>
                <p className="text-gray-400 mb-6">
                    To participate in the testnet, you'll need Devnet SOL (for gas) and Devnet USDC (for betting).
                    Get them for free from these faucets:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* SOL Faucet */}
                    <a
                        href="https://faucet.solana.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
                    >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Wallet className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors">
                                Solana Faucet
                            </h3>
                            <p className="text-gray-400 text-sm">Get free Devnet SOL for gas fees</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-purple-400" />
                    </a>

                    {/* USDC Faucet */}
                    <a
                        href="https://spl-token-faucet.com/?token-name=USDC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-xl p-6 border border-white/10 hover:border-teal-500/50 transition-all"
                    >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                            <Coins className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-semibold group-hover:text-teal-400 transition-colors">
                                USDC Faucet
                            </h3>
                            <p className="text-gray-400 text-sm">Get free Devnet USDC for betting</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-teal-400" />
                    </a>
                </div>
            </section>

            {/* Quick Tips */}
            <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10 mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    Quick Tips
                </h2>
                <ul className="space-y-3 text-gray-300">
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        <span>Connect with <strong className="text-white">Phantom</strong> or <strong className="text-white">Solflare</strong> wallet (other wallets not supported)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        <span>Make sure your wallet is set to <strong className="text-white">Devnet</strong> network</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        <span>After connecting, click <strong className="text-white">Sign In</strong> to authenticate your wallet</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        <span>Check the <strong className="text-white">Dashboard</strong> after events resolve to claim winnings</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        <span>Sessions expire after <strong className="text-white">2 hours</strong> of inactivity for security</span>
                    </li>
                </ul>
            </section>

            {/* Supported Wallets */}
            <section className="text-center py-8">
                <p className="text-gray-500 text-sm mb-6">Supported Wallets for Testnet</p>
                <div className="flex items-center justify-center gap-8 flex-wrap">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-white font-medium">Phantom</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-orange-400" />
                        </div>
                        <span className="text-white font-medium">Solflare</span>
                    </div>
                </div>
                <p className="text-gray-600 text-xs mt-4">More wallets and chains coming soon</p>
            </section>
        </div>
    );
}
