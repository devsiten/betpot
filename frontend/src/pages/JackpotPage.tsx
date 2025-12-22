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
                <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading jackpots...</p>
            </div>
        );
    }

    if (!hasJackpots) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold text-white mb-2">No Jackpots Right Now</h1>
                <p className="text-gray-400 mb-8">Check back soon for the next big jackpot!</p>
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
                <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
                    <Trophy className="w-4 h-4" />
                    🔥 Featured Jackpots ({jackpots.length})
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Active Jackpots</h1>
                <p className="text-gray-400">Pick your winner and join the prize pool</p>
            </div>

            {/* Jackpots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {jackpots.map((jackpot: any) => (
                    <Link
                        key={jackpot.id}
                        to={`/events/${jackpot.id}`}
                        className="card p-6 hover:border-yellow-500/50 transition-all group cursor-pointer bg-gradient-to-br from-yellow-900/10 to-orange-900/10"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                <span className="text-xs text-yellow-400 font-medium uppercase">Jackpot</span>
                            </div>
                            <span className="text-xs text-gray-500">
                                {jackpot.category}
                            </span>
                        </div>

                        <h3 className="text-lg font-semibold text-white group-hover:text-yellow-400 transition-colors mb-3 line-clamp-2">
                            {jackpot.title}
                        </h3>

                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                            <Clock className="w-4 h-4" />
                            {format(new Date(jackpot.eventTime), 'MMM dd, HH:mm')}
                        </div>

                        <div className="bg-black/30 rounded-lg p-4 mb-4">
                            <p className="text-xs text-gray-500 mb-1">Prize Pool</p>
                            <p className="text-2xl font-bold text-yellow-400">
                                ${(jackpot.totalPool || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {jackpot.ticketCount || 0} bets
                            </p>
                        </div>

                        {/* Options preview */}
                        <div className="grid grid-cols-2 gap-2">
                            {jackpot.options?.slice(0, 2).map((option: any) => (
                                <div key={option.id} className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-sm text-white truncate">{option.label}</p>
                                    <p className="text-xs text-gray-500">{option.ticketsSold || 0} bets</p>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-medium text-sm group-hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4" />
                            Place Bet
                        </button>
                    </Link>
                ))}
            </div>

            {/* How it works */}
            <div className="p-6 card">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">How Jackpots Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div>
                        <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-3 text-teal-400 font-bold">1</div>
                        <p className="text-white font-medium">Pick a Winner</p>
                        <p className="text-gray-500 text-sm">Choose which outcome will win</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-3 text-teal-400 font-bold">2</div>
                        <p className="text-white font-medium">Place Your Bet</p>
                        <p className="text-gray-500 text-sm">Pay with SOL from your wallet</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3 text-green-400 font-bold">3</div>
                        <p className="text-white font-medium">Win Big</p>
                        <p className="text-gray-500 text-sm">If you're right, split the prize pool!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
