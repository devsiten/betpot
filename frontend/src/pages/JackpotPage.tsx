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

    const jackpot = jackpotData?.data;

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading jackpot...</p>
            </div>
        );
    }

    if (!jackpot) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold text-white mb-2">No Jackpot Right Now</h1>
                <p className="text-gray-400 mb-8">Check back soon for the next big jackpot!</p>
                <Link to="/events" className="btn btn-primary">
                    Browse All Markets
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Jackpot Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
                    <Trophy className="w-4 h-4" />
                    🔥 Featured Jackpot
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{jackpot.title}</h1>
                <div className="flex items-center justify-center gap-4 text-gray-400">
                    <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {format(new Date(jackpot.eventTime), 'MMM dd, yyyy • HH:mm')}
                    </span>
                </div>
            </div>

            {/* Prize Pool */}
            <div className="card p-8 text-center mb-8 bg-gradient-to-br from-yellow-900/20 via-[#232f42] to-orange-900/20 border-yellow-500/30">
                <p className="text-yellow-400 text-sm font-medium mb-2">Total Prize Pool</p>
                <p className="text-5xl md:text-6xl font-bold text-white mb-2">
                    ${(jackpot.totalPool || 0).toLocaleString()}
                </p>
                <p className="text-gray-400">{jackpot.ticketCount || 0} bets placed</p>
            </div>

            {/* Betting Options */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4 text-center">Pick Your Winner</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {jackpot.options?.map((option) => (
                        <Link
                            key={option.id}
                            to={`/events/${jackpot.id}?option=${option.optionId}`}
                            className="card p-6 hover:border-yellow-500/50 transition-all group cursor-pointer text-center"
                        >
                            <p className="text-xl font-semibold text-white group-hover:text-yellow-400 transition-colors mb-2">
                                {option.label}
                            </p>
                            <p className="text-2xl font-bold text-yellow-400">${option.poolAmount?.toFixed(0) || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">{option.ticketsSold || 0} bets</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Place Bet Button */}
            <div className="text-center">
                <Link
                    to={`/events/${jackpot.id}`}
                    className="btn btn-primary text-lg px-8 py-4"
                >
                    <Zap className="w-5 h-5" />
                    Place Your Bet
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </div>

            {/* How it works */}
            <div className="mt-12 p-6 card">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">How Jackpot Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div>
                        <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-3 text-teal-400 font-bold">1</div>
                        <p className="text-white font-medium">Pick a Winner</p>
                        <p className="text-gray-500 text-sm">Choose which team/outcome will win</p>
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
