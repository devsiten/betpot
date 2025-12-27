import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, ArrowRight, Zap, Clock, Lock } from 'lucide-react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import clsx from 'clsx';
import { EventCountdown } from '@/components/CountdownTimer';

export function JackpotPage() {
    const { data: jackpotData, isLoading } = useQuery({
        queryKey: ['jackpot'],
        queryFn: () => api.getJackpot(),
    });

    // Get all jackpots from the response
    const allJackpots = (jackpotData as any)?.jackpots || [];

    // Separate into active (open) and waiting for result (locked)
    const activeJackpots = allJackpots.filter((j: any) => j.status === 'open');
    const pendingJackpots = allJackpots.filter((j: any) => j.status === 'locked');

    const hasJackpots = allJackpots.length > 0;


    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-text-muted mt-4">Loading jackpots...</p>
            </div>
        );
    }

    if (!hasJackpots) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <Trophy className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h1 className="text-2xl font-semibold text-text-primary mb-2">No Jackpots Right Now</h1>
                <p className="text-text-secondary mb-8">Check back soon for the next big jackpot!</p>
                <Link to="/events" className="btn btn-primary">
                    Browse All Markets
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                    <Trophy className="w-4 h-4" />
                    Featured Jackpots ({allJackpots.length})
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">Jackpots</h1>
                <p className="text-text-secondary mb-4">Pick your winner and join the prize pool</p>
                <Link
                    to="/jackpot/results"
                    className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium text-sm"
                >
                    <Trophy className="w-4 h-4" />
                    View Recent Results
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Active Jackpots */}
            {activeJackpots.length > 0 && (
                <>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-positive-500" />
                        Active - Place Your Bets ({activeJackpots.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {activeJackpots.map((jackpot: any) => (
                            <Link
                                key={jackpot.id}
                                to={`/events/${jackpot.id}`}
                                className="card p-6 hover:border-brand-300 dark:hover:border-brand-600 transition-all group cursor-pointer bg-gradient-to-br from-brand-50 to-background-card dark:from-gray-800 dark:to-gray-900 shadow-card"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                        <span className="text-xs text-brand-600 dark:text-brand-400 font-medium uppercase">Jackpot</span>
                                    </div>
                                    <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">
                                        {jackpot.category}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-text-primary dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors mb-3 line-clamp-2">
                                    {jackpot.title}
                                </h3>

                                {/* Event Time */}
                                <div className="flex items-center gap-2 text-text-secondary dark:text-gray-300 text-sm font-medium mb-2">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(jackpot.eventTime), 'MMM dd, yyyy HH:mm')}
                                </div>

                                {/* Countdown Timer */}
                                <div className="mb-4">
                                    <EventCountdown
                                        startTime={jackpot.startTime}
                                        lockTime={jackpot.lockTime}
                                        eventTime={jackpot.eventTime}
                                        status={jackpot.status}
                                    />
                                </div>

                                <div className="bg-background-secondary dark:bg-gray-800 rounded-lg p-4 mb-4">
                                    <p className="text-xs text-text-muted dark:text-gray-400 font-medium mb-1">Prize Pool</p>
                                    <p className="text-2xl font-bold text-text-primary dark:text-white">
                                        ${(jackpot.totalPool || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-text-muted dark:text-gray-400 font-medium mt-1">
                                        {jackpot.ticketCount || 0} bets
                                    </p>
                                </div>

                                {/* Options preview with colors */}
                                <div className="grid grid-cols-2 gap-2">
                                    {jackpot.options?.slice(0, 2).map((option: any, idx: number) => {
                                        // Determine colors based on option label
                                        const label = option.label?.toLowerCase() || '';
                                        const isPositive = label === 'yes' || label === 'home' || idx === 0;
                                        const isDraw = label === 'draw';

                                        const bgColor = isDraw
                                            ? 'bg-gray-100 border-gray-300'
                                            : isPositive
                                                ? 'bg-positive-100 border-positive-300'
                                                : 'bg-negative-100 border-negative-300';
                                        const textColor = isDraw
                                            ? 'text-text-secondary dark:text-gray-300'
                                            : isPositive
                                                ? 'text-positive-700'
                                                : 'text-negative-700';

                                        return (
                                            <div key={option.id} className={`rounded-lg p-2 text-center border ${bgColor}`}>
                                                <p className={`text-sm font-medium truncate ${textColor}`}>{option.label}</p>
                                                <p className="text-xs text-text-muted dark:text-gray-400">{option.ticketsSold || 0} bets</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className={clsx(
                                    'w-full mt-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors',
                                    jackpot.status === 'open'
                                        ? 'bg-brand-100 text-brand-700 group-hover:bg-brand-200'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                )}>
                                    {jackpot.status === 'open' ? (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Place Bet
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            Locked
                                        </>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {/* Waiting for Result */}
            {pendingJackpots.length > 0 && (
                <>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-500" />
                        Waiting for Result ({pendingJackpots.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {pendingJackpots.map((jackpot: any) => (
                            <div
                                key={jackpot.id}
                                className="card p-6 bg-gradient-to-br from-yellow-50 to-background-card dark:from-yellow-900/20 dark:to-gray-900 border-yellow-200 dark:border-yellow-800 shadow-card opacity-80"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium uppercase">Waiting</span>
                                    </div>
                                    <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">
                                        {jackpot.category}
                                    </span>
                                </div>

                                <h2 className="text-lg font-bold text-text-primary dark:text-white mb-3 line-clamp-2">
                                    {jackpot.title}
                                </h2>

                                {/* Pool */}
                                <div className="flex items-center justify-between p-3 bg-yellow-100/50 dark:bg-yellow-900/30 rounded-lg mb-4">
                                    <span className="text-sm text-yellow-700 dark:text-yellow-300">Prize Pool</span>
                                    <span className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                                        ${((jackpot.totalPool || 0) * (1 - 0.01)).toFixed(2)}
                                    </span>
                                </div>

                                <div className="text-center py-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 rounded-lg font-medium text-sm">
                                    Results Coming Soon
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* How it works */}
            <div className="p-6 card dark:bg-gray-900 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4 text-center">How Jackpots Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div>
                        <div className="w-10 h-10 rounded-full bg-positive-100 dark:bg-positive-900/30 flex items-center justify-center mx-auto mb-3 text-positive-600 dark:text-positive-400 font-bold border border-positive-200 dark:border-positive-700">1</div>
                        <p className="text-text-primary dark:text-white font-medium">Pick a Winner</p>
                        <p className="text-text-muted dark:text-gray-400 text-sm">Choose which outcome will win</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-3 text-brand-600 dark:text-brand-400 font-bold border border-brand-200 dark:border-brand-700">2</div>
                        <p className="text-text-primary dark:text-white font-medium">Place Your Bet</p>
                        <p className="text-text-muted dark:text-gray-400 text-sm">Pay with USDC from your wallet</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-full bg-positive-100 dark:bg-positive-900/30 flex items-center justify-center mx-auto mb-3 text-positive-600 dark:text-positive-400 font-bold border border-positive-200 dark:border-positive-700">3</div>
                        <p className="text-text-primary dark:text-white font-medium">Win Big</p>
                        <p className="text-text-muted dark:text-gray-400 text-sm">If you're right, split the prize pool!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
