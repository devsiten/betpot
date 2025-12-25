import { Globe, Ticket, Gift, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
    {
        icon: Globe,
        title: 'Browse Markets',
        description: 'Explore trending events across sports, crypto, politics and more. These feed into our Jackpot picks.',
        color: 'from-cyan-500 to-blue-500',
    },
    {
        icon: Ticket,
        title: 'Place Your Bet',
        description: 'Go to Jackpot, pick your outcome, and buy tickets. The more tickets you buy, the higher your potential winnings!',
        color: 'from-purple-500 to-pink-500',
    },
    {
        icon: Gift,
        title: 'Collect Winnings',
        description: 'If you win, claim your share from the prize pool! Winners split the pot based on their ticket count.',
        color: 'from-green-500 to-emerald-500',
    },
];

export function HowItWorksPage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <div className="relative overflow-hidden py-20">
                <div className="absolute inset-0 bg-gradient-to-b from-brand-500/10 to-transparent" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-text-primary dark:text-white mb-4">
                        How It Works
                    </h1>
                    <p className="text-xl text-text-secondary dark:text-gray-300 max-w-2xl mx-auto">
                        Get started with BETPOT in 3 simple steps
                    </p>
                </div>
            </div>

            {/* Steps Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className="relative group"
                        >
                            {/* Step Number */}
                            <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg z-10">
                                {index + 1}
                            </div>

                            {/* Card */}
                            <div className="bg-background-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-2xl p-8 h-full hover:border-brand-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10">
                                {/* Icon */}
                                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}>
                                    <step.icon className="w-8 h-8 text-white" />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-text-primary dark:text-white mb-3">
                                    {step.title}
                                </h3>
                                <p className="text-text-secondary dark:text-gray-300 leading-relaxed">
                                    {step.description}
                                </p>
                            </div>

                            {/* Arrow (between cards on desktop) */}
                            {index < steps.length - 1 && (
                                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                                    <ArrowRight className="w-8 h-8 text-brand-500" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-gradient-to-br from-brand-500/20 to-purple-500/20 dark:from-brand-500/10 dark:to-purple-500/10 rounded-3xl p-12 text-center border border-brand-500/30">
                    <h2 className="text-3xl font-bold text-text-primary dark:text-white mb-4">
                        Ready to Start Winning?
                    </h2>
                    <p className="text-text-secondary dark:text-gray-300 mb-8 max-w-xl mx-auto">
                        Connect your wallet and place your first bet on the Jackpot event!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/jackpot"
                            className="btn bg-gradient-to-r from-brand-500 to-purple-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-brand-500/30 transition-all"
                        >
                            Go to Jackpot
                        </Link>
                        <Link
                            to="/events"
                            className="btn bg-white/10 dark:bg-gray-800 text-text-primary dark:text-white px-8 py-3 rounded-xl font-bold hover:bg-white/20 dark:hover:bg-gray-700 transition-all border border-border dark:border-gray-700"
                        >
                            Browse Markets
                        </Link>
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <h2 className="text-2xl font-bold text-text-primary dark:text-white text-center mb-8">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                    <div className="bg-background-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-xl p-6">
                        <h3 className="font-bold text-text-primary dark:text-white mb-2">What is BETPOT?</h3>
                        <p className="text-text-secondary dark:text-gray-300">BETPOT is a decentralized prediction market platform where you can bet on real-world events using cryptocurrency.</p>
                    </div>
                    <div className="bg-background-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-xl p-6">
                        <h3 className="font-bold text-text-primary dark:text-white mb-2">How do I get started?</h3>
                        <p className="text-text-secondary dark:text-gray-300">Connect your Solana wallet (Phantom or Solflare), get some USDC on Devnet, and place your first bet!</p>
                    </div>
                    <div className="bg-background-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-xl p-6">
                        <h3 className="font-bold text-text-primary dark:text-white mb-2">How are winnings calculated?</h3>
                        <p className="text-text-secondary dark:text-gray-300">Winners split the prize pool proportionally based on how many tickets they purchased for the winning outcome.</p>
                    </div>
                    <div className="bg-background-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-xl p-6">
                        <h3 className="font-bold text-text-primary dark:text-white mb-2">Is this real money?</h3>
                        <p className="text-text-secondary dark:text-gray-300">Currently we're running on Solana Devnet with test USDC. It's completely free to try!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
