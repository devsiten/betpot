import { ExternalLink, Wallet, Coins, Trophy, Gift, Clock, Info, CheckCircle } from 'lucide-react';

export function TestnetGuidePage() {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                    BETPOT Testnet Guide
                </h1>
                <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                    Welcome to the future of decentralized betting.
                    Here's everything you need to participate in our testnet.
                </p>
            </div>

            {/* What is BETPOT */}
            <section className="bg-background-card rounded-2xl p-6 md:p-8 border border-border shadow-card mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                        <Info className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary">What is BETPOT?</h2>
                </div>
                <p className="text-text-secondary leading-relaxed mb-4">
                    BETPOT is a decentralized jackpot betting platform. We bring the thrill of prediction markets
                    to Web3 with a simple yet exciting mechanic: pick the winning outcome, buy your tickets, and claim your share
                    of the prize pool if you win.
                </p>
                <p className="text-text-secondary leading-relaxed">
                    All transactions happen on-chain for complete transparency. Currently testing on Solana Devnet
                    with more chains coming soon. Uses USDC for betting and native tokens for gas fees.
                </p>
            </section>

            {/* How It Works */}
            <section className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-brand-600" />
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
                        <div key={item.step} className="flex gap-4 bg-background-card rounded-xl p-5 border border-border shadow-soft">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 border border-brand-200">
                                <span className="text-brand-700 font-bold">{item.step}</span>
                            </div>
                            <div>
                                <h3 className="text-text-primary font-semibold mb-1">{item.title}</h3>
                                <p className="text-text-secondary text-sm">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Fees */}
            <section className="bg-gradient-to-r from-brand-50 to-positive-50 rounded-2xl p-6 md:p-8 border border-brand-200 mb-8">
                <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-brand-600" />
                    Platform Fees
                </h2>
                <ul className="space-y-3 text-text-secondary">
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-brand-600" />
                        <span><strong className="text-text-primary">1% Platform Fee</strong> on each transaction</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-brand-600" />
                        <span><strong className="text-text-primary">USDC</strong> for ticket purchases and payouts</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-brand-600" />
                        <span><strong className="text-text-primary">Native tokens</strong> for gas fees (SOL on Solana testnet)</span>
                    </li>
                </ul>
            </section>

            {/* Get Testnet Tokens */}
            <section className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
                    <Gift className="w-6 h-6 text-positive-600" />
                    Get Testnet Tokens
                </h2>
                <p className="text-text-secondary mb-6">
                    To participate in the testnet, you'll need Devnet SOL (for gas) and Devnet USDC (for betting).
                    Get them for free from these faucets:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* SOL Faucet */}
                    <a
                        href="https://faucet.solana.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 bg-background-card hover:bg-background-secondary rounded-xl p-6 border border-border hover:border-positive-300 transition-all shadow-soft"
                    >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-positive-400 to-positive-600 flex items-center justify-center">
                            <Wallet className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-text-primary font-semibold group-hover:text-positive-600 transition-colors">
                                Solana Faucet
                            </h3>
                            <p className="text-text-muted text-sm">Get free Devnet SOL for gas fees</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-text-muted group-hover:text-positive-600" />
                    </a>

                    {/* USDC Faucet */}
                    <a
                        href="https://spl-token-faucet.com/?token-name=USDC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 bg-background-card hover:bg-background-secondary rounded-xl p-6 border border-border hover:border-brand-300 transition-all shadow-soft"
                    >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                            <Coins className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-text-primary font-semibold group-hover:text-brand-600 transition-colors">
                                USDC Faucet
                            </h3>
                            <p className="text-text-muted text-sm">Get free Devnet USDC for betting</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-text-muted group-hover:text-brand-600" />
                    </a>
                </div>
            </section>

            {/* Quick Tips */}
            <section className="bg-background-card rounded-2xl p-6 md:p-8 border border-border shadow-card mb-8">
                <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-600" />
                    Quick Tips
                </h2>
                <ul className="space-y-3 text-text-secondary">
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>Connect with <strong className="text-text-primary">Phantom</strong> or <strong className="text-text-primary">Solflare</strong> wallet (other wallets not supported)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>Make sure your wallet is set to <strong className="text-text-primary">Devnet</strong> network</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>After connecting, click <strong className="text-text-primary">Sign In</strong> to authenticate your wallet</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>Check the <strong className="text-text-primary">Dashboard</strong> after events resolve to claim winnings</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600">•</span>
                        <span>Sessions expire after <strong className="text-text-primary">2 hours</strong> of inactivity for security</span>
                    </li>
                </ul>
            </section>

            {/* Supported Wallets */}
            <section className="text-center py-8">
                <p className="text-text-muted text-sm mb-6">Supported Wallets for Testnet</p>
                <div className="flex items-center justify-center gap-8 flex-wrap">
                    <div className="flex items-center gap-3 px-4 py-3 bg-background-card rounded-xl border border-border shadow-soft">
                        <div className="w-10 h-10 rounded-lg bg-positive-100 flex items-center justify-center border border-positive-200">
                            <Wallet className="w-5 h-5 text-positive-600" />
                        </div>
                        <span className="text-text-primary font-medium">Phantom</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-background-card rounded-xl border border-border shadow-soft">
                        <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center border border-brand-200">
                            <Wallet className="w-5 h-5 text-brand-600" />
                        </div>
                        <span className="text-text-primary font-medium">Solflare</span>
                    </div>
                </div>
                <p className="text-text-muted text-xs mt-4">More wallets and chains coming soon</p>
            </section>
        </div>
    );
}
