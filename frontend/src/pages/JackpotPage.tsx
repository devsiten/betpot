import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, ArrowRight, Zap, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { format } from 'date-fns';

export function JackpotPage() {
    const { data: jackpotData, isLoading } = useQuery({
        queryKey: ['jackpot'],
        queryFn: () => api.getJackpot(),
    });

    // Get all jackpots from the response
    const jackpots = (jackpotData as any)?.jackpots || [];
    const hasJackpots = jackpots.length > 0;

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
                    🔥 Featured Jackpots ({jackpots.length})
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">Active Jackpots</h1>
                <p className="text-text-secondary">Pick your winner and join the prize pool</p>
            </div>

            {/* Jackpots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {jackpots.map((jackpot: any) => (
                    <Link
                        key={jackpot.id}
                        to={`/events/${jackpot.id}`}
                        className="card p-6 hover:border-brand-300 transition-all group cursor-pointer bg-gradient-to-br from-brand-50 to-background-card shadow-card"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-brand-600" />
                                <span className="text-xs text-brand-600 font-medium uppercase">Jackpot</span>
                            </div>
                            <span className="text-xs text-text-muted">
                                {jackpot.category}
                            </span>
                        </div>

                        <h3 className="text-lg font-semibold text-text-primary group-hover:text-brand-600 transition-colors mb-3 line-clamp-2">
                            {jackpot.title}
                        </h3>

                        <div className="flex items-center gap-2 text-text-secondary text-sm mb-4">
                            <Clock className="w-4 h-4" />
                            {format(new Date(jackpot.eventTime), 'MMM dd, HH:mm')}
                        </div>

                        <div className="bg-background-secondary rounded-lg p-4 mb-4">
                            <p className="text-xs text-text-muted mb-1">Prize Pool</p>
                            <p className="text-2xl font-bold text-brand-600">
                                ${(jackpot.totalPool || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-text-muted mt-1">
                                {jackpot.ticketCount || 0} bets
                            </p>
                        </div>

                        {/* Options preview */}
                        <div className="grid grid-cols-2 gap-2">
                            {jackpot.options?.slice(0, 2).map((option: any) => (
                                <div key={option.id} className="bg-background-secondary rounded-lg p-2 text-center border border-border">
                                    <p className="text-sm text-text-primary truncate">{option.label}</p>
                                    <p className="text-xs text-text-muted">{option.ticketsSold || 0} bets</p>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-4 py-2 bg-brand-100 text-brand-700 rounded-lg font-medium text-sm group-hover:bg-brand-200 transition-colors flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4" />
                            Place Bet
                        </button>
                    </Link>
                ))}
            </div>

            {/* How it works */}
            <div className="p-6 card">
                <h3 className="text-lg font-semibold text-text-primary mb-4 text-center">How Jackpots Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div>
                        <div className="w-10 h-10 rounded-full bg-positive-100 flex items-center justify-center mx-auto mb-3 text-positive-600 font-bold border border-positive-200">1</div>
                        <p className="text-text-primary font-medium">Pick a Winner</p>
                        <p className="text-text-muted text-sm">Choose which outcome will win</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-3 text-brand-600 font-bold border border-brand-200">2</div>
                        <p className="text-text-primary font-medium">Place Your Bet</p>
                        <p className="text-text-muted text-sm">Pay with SOL from your wallet</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-full bg-positive-100 flex items-center justify-center mx-auto mb-3 text-positive-600 font-bold border border-positive-200">3</div>
                        <p className="text-text-primary font-medium">Win Big</p>
                        <p className="text-text-muted text-sm">If you're right, split the prize pool!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
