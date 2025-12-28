import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Zap, Clock, Lock, CheckCircle, Calendar } from 'lucide-react';
import { api } from '@/services/api';
import { getSolPrice } from '@/utils/sol';
import { format, isMonday, isTuesday, isWednesday, isThursday, isFriday, isSaturday, isSunday } from 'date-fns';
import clsx from 'clsx';
import { EventCountdown } from '@/components/CountdownTimer';

type TabType = 'live' | 'upcoming' | 'locked' | 'results';

const TABS: { id: TabType; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'live', label: 'Live Events', icon: Zap, description: 'Open for betting now' },
    { id: 'upcoming', label: 'Event of the Week', icon: Calendar, description: 'Coming soon' },
    { id: 'locked', label: 'Locked', icon: Lock, description: 'Waiting for results' },
    { id: 'results', label: 'Results', icon: CheckCircle, description: 'Completed events' },
];

// Group events by day of week
function groupByWeekday(events: any[]): Record<string, any[]> {
    const days: Record<string, any[]> = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
    };

    events.forEach((event) => {
        const date = new Date(event.eventTime);
        if (isMonday(date)) days.Monday.push(event);
        else if (isTuesday(date)) days.Tuesday.push(event);
        else if (isWednesday(date)) days.Wednesday.push(event);
        else if (isThursday(date)) days.Thursday.push(event);
        else if (isFriday(date)) days.Friday.push(event);
        else if (isSaturday(date)) days.Saturday.push(event);
        else if (isSunday(date)) days.Sunday.push(event);
    });

    return days;
}

// Event Card Component
function EventCard({ event, variant = 'default', solPrice }: { event: any; variant?: 'default' | 'locked' | 'result'; solPrice: number }) {
    const isLocked = variant === 'locked';
    const isResult = variant === 'result';
    const usdToSol = (usd: number) => usd / solPrice;

    return (
        <Link
            to={`/events/${event.id}`}
            className={clsx(
                'card p-4 md:p-6 transition-all group cursor-pointer shadow-card',
                isLocked && 'opacity-80 bg-gradient-to-br from-yellow-50 to-background-card dark:from-yellow-900/20 dark:to-gray-900 border-yellow-200 dark:border-yellow-800',
                isResult && 'bg-gradient-to-br from-green-50 to-background-card dark:from-green-900/20 dark:to-gray-900 border-green-200 dark:border-green-800',
                !isLocked && !isResult && 'hover:border-brand-300 dark:hover:border-brand-600 bg-gradient-to-br from-brand-50 to-background-card dark:from-gray-800 dark:to-gray-900'
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Trophy className={clsx(
                        'w-4 h-4 md:w-5 md:h-5',
                        isResult ? 'text-green-600 dark:text-green-400' :
                            isLocked ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-brand-600 dark:text-brand-400'
                    )} />
                    <span className={clsx(
                        'text-xs font-medium uppercase',
                        isResult ? 'text-green-600 dark:text-green-400' :
                            isLocked ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-brand-600 dark:text-brand-400'
                    )}>
                        {isResult ? 'Completed' : isLocked ? 'Locked' : 'Jackpot'}
                    </span>
                </div>
                <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">
                    {event.category}
                </span>
            </div>

            {/* Title */}
            <h3 className="text-base md:text-lg font-bold text-text-primary dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors mb-2 line-clamp-2">
                {event.title}
            </h3>

            {/* Event Time */}
            <div className="flex items-center gap-2 text-text-secondary dark:text-gray-300 text-xs md:text-sm font-medium mb-3">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                {format(new Date(event.eventTime), 'MMM dd, yyyy HH:mm')}
            </div>

            {/* Countdown (only for live/upcoming) */}
            {!isLocked && !isResult && (
                <div className="mb-3">
                    <EventCountdown
                        startTime={event.startTime}
                        lockTime={event.lockTime}
                        eventTime={event.eventTime}
                        status={event.status}
                    />
                </div>
            )}

            {/* Prize Pool */}
            <div className={clsx(
                'rounded-lg p-3 md:p-4 mb-3',
                isResult ? 'bg-green-100/50 dark:bg-green-900/30' :
                    isLocked ? 'bg-yellow-100/50 dark:bg-yellow-900/30' :
                        'bg-background-secondary dark:bg-gray-800'
            )}>
                <p className="text-xs text-text-muted dark:text-gray-400 font-medium mb-1">Prize Pool</p>
                <p className={clsx(
                    'text-xl md:text-2xl font-bold',
                    isResult ? 'text-green-700 dark:text-green-300' :
                        isLocked ? 'text-yellow-700 dark:text-yellow-300' :
                            'text-text-primary dark:text-white'
                )}>
                    {usdToSol(event.totalPool || 0).toFixed(4)} SOL
                </p>
                <p className="text-xs text-text-muted dark:text-gray-400 font-medium mt-1">
                    ≈ ${(event.totalPool || 0).toLocaleString()} • {event.ticketCount || 0} bets
                </p>
            </div>

            {/* Winner (for results) */}
            {isResult && event.winningOption && (
                <div className="bg-green-100 dark:bg-green-900/40 rounded-lg p-3 mb-3">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">Winner</p>
                    <p className="font-bold text-green-800 dark:text-green-200">{event.winningOption.label}</p>
                </div>
            )}

            {/* Options Preview */}
            {!isResult && event.options && (
                <div className="grid grid-cols-2 gap-2">
                    {event.options.slice(0, 2).map((option: any, idx: number) => {
                        const label = option.label?.toLowerCase() || '';
                        const isPositive = label === 'yes' || label === 'home' || idx === 0;
                        const bgColor = isPositive
                            ? 'bg-positive-100 dark:bg-positive-900/30 border-positive-300 dark:border-positive-700'
                            : 'bg-negative-100 dark:bg-negative-900/30 border-negative-300 dark:border-negative-700';
                        const textColor = isPositive
                            ? 'text-positive-700 dark:text-positive-300'
                            : 'text-negative-700 dark:text-negative-300';

                        return (
                            <div key={option.id} className={`rounded-lg p-2 text-center border ${bgColor}`}>
                                <p className={`text-xs md:text-sm font-medium truncate ${textColor}`}>{option.label}</p>
                                <p className="text-xs text-text-muted dark:text-gray-400">{option.ticketsSold || 0} bets</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Status Button */}
            <div className={clsx(
                'w-full mt-4 py-2 rounded-lg font-medium text-xs md:text-sm flex items-center justify-center gap-2 transition-colors',
                isResult ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                    isLocked ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                        'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 group-hover:bg-brand-200 dark:group-hover:bg-brand-800/40'
            )}>
                {isResult ? (
                    <>
                        <CheckCircle className="w-4 h-4" />
                        View Results
                    </>
                ) : isLocked ? (
                    <>
                        <Lock className="w-4 h-4" />
                        Results Coming Soon
                    </>
                ) : (
                    <>
                        <Zap className="w-4 h-4" />
                        Place Bet
                    </>
                )}
            </div>
        </Link>
    );
}

// Result Card Component - for resolved events with different data structure
function ResultCard({ event, solPrice }: { event: any; solPrice: number }) {
    const usdToSol = (usd: number) => usd / solPrice;

    return (
        <Link
            to={`/events/${event.id}`}
            className="card p-4 md:p-6 transition-all group cursor-pointer shadow-card bg-gradient-to-br from-green-50 to-background-card dark:from-green-900/20 dark:to-gray-900 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-600"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium uppercase text-green-600 dark:text-green-400">
                        {event.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                    </span>
                </div>
                {event.resolvedAt && (
                    <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">
                        {format(new Date(event.resolvedAt), 'MMM dd, yyyy')}
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className="text-base md:text-lg font-bold text-text-primary dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-3 line-clamp-2">
                {event.title}
            </h3>

            {/* Winner */}
            {event.winningOption && (
                <div className="bg-green-100 dark:bg-green-900/40 rounded-lg p-3 mb-3">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">🏆 Winner</p>
                    <p className="font-bold text-green-800 dark:text-green-200">{event.winningOption.label}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-background-secondary dark:bg-gray-800 rounded-lg p-2 text-center">
                    <p className="text-xs text-text-muted dark:text-gray-400">Prize Pool</p>
                    <p className="font-bold text-text-primary dark:text-white text-sm">
                        {usdToSol(event.totalPayout || event.totalPool || 0).toFixed(4)} SOL
                    </p>
                    <p className="text-xs text-text-muted dark:text-gray-500">
                        ≈ ${(event.totalPayout || event.totalPool || 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-background-secondary dark:bg-gray-800 rounded-lg p-2 text-center">
                    <p className="text-xs text-text-muted dark:text-gray-400">Winners</p>
                    <p className="font-bold text-green-600 dark:text-green-400 text-sm">
                        {event.winningTickets || 0}
                    </p>
                    <p className="text-xs text-text-muted dark:text-gray-500">tickets</p>
                </div>
                <div className="bg-background-secondary dark:bg-gray-800 rounded-lg p-2 text-center">
                    <p className="text-xs text-text-muted dark:text-gray-400">Losers</p>
                    <p className="font-bold text-red-600 dark:text-red-400 text-sm">
                        {event.losingTickets || 0}
                    </p>
                    <p className="text-xs text-text-muted dark:text-gray-500">tickets</p>
                </div>
            </div>

            {/* Action Button */}
            <div className="w-full py-2 rounded-lg font-medium text-xs md:text-sm flex items-center justify-center gap-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                <CheckCircle className="w-4 h-4" />
                View Details
            </div>
        </Link>
    );
}

export function JackpotPage() {
    const [activeTab, setActiveTab] = useState<TabType>('live');
    const [solPrice, setSolPrice] = useState<number>(125);

    // Fetch SOL price on mount
    useEffect(() => {
        getSolPrice().then(setSolPrice);
    }, []);

    // Fetch all jackpots
    const { data: jackpotData, isLoading: loadingJackpots } = useQuery({
        queryKey: ['jackpot'],
        queryFn: () => api.getJackpot(),
    });

    // Fetch resolved jackpots for results tab
    const { data: resultsData, isLoading: loadingResults } = useQuery({
        queryKey: ['jackpot-results'],
        queryFn: () => api.getJackpotResults(),
        enabled: activeTab === 'results',
    });

    const allJackpots = (jackpotData as any)?.jackpots || [];

    // Filter events by status
    const liveEvents = useMemo(() => allJackpots.filter((j: any) => j.status === 'open'), [allJackpots]);
    const upcomingEvents = useMemo(() => allJackpots.filter((j: any) => j.status === 'upcoming'), [allJackpots]);
    const lockedEvents = useMemo(() => allJackpots.filter((j: any) => j.status === 'locked'), [allJackpots]);
    const resolvedEvents = (resultsData as any)?.data || [];

    // Group upcoming events by weekday
    const upcomingByDay = useMemo(() => groupByWeekday(upcomingEvents), [upcomingEvents]);

    // Get count for each tab
    const tabCounts: Record<TabType, number> = {
        live: liveEvents.length,
        upcoming: upcomingEvents.length,
        locked: lockedEvents.length,
        results: resolvedEvents.length,
    };

    const isLoading = loadingJackpots || (activeTab === 'results' && loadingResults);

    // Render content based on active tab
    function renderTabContent() {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"></div>
                </div>
            );
        }

        switch (activeTab) {
            case 'live':
                if (liveEvents.length === 0) {
                    return (
                        <div className="text-center py-12">
                            <Zap className="w-12 h-12 text-text-muted dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">No Live Events</h3>
                            <p className="text-text-secondary dark:text-gray-400 mb-4">Check back soon or browse upcoming events</p>
                            <button onClick={() => setActiveTab('upcoming')} className="btn btn-primary">
                                View Upcoming Events
                            </button>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {liveEvents.map((event: any) => (
                            <EventCard key={event.id} event={event} solPrice={solPrice} />
                        ))}
                    </div>
                );

            case 'upcoming':
                if (upcomingEvents.length === 0) {
                    return (
                        <div className="text-center py-12">
                            <Calendar className="w-12 h-12 text-text-muted dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">No Upcoming Events</h3>
                            <p className="text-text-secondary dark:text-gray-400">New events will be scheduled soon</p>
                        </div>
                    );
                }
                return (
                    <div className="space-y-8">
                        {Object.entries(upcomingByDay).map(([day, events]) => {
                            if (events.length === 0) return null;
                            return (
                                <div key={day}>
                                    <h3 className="text-lg font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-brand-500 dark:text-brand-400" />
                                        {day}
                                        <span className="text-sm font-normal text-text-secondary dark:text-gray-400">
                                            ({events.length} event{events.length !== 1 ? 's' : ''})
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                        {events.map((event: any) => (
                                            <EventCard key={event.id} event={event} solPrice={solPrice} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'locked':
                if (lockedEvents.length === 0) {
                    return (
                        <div className="text-center py-12">
                            <Lock className="w-12 h-12 text-text-muted dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">No Locked Events</h3>
                            <p className="text-text-secondary dark:text-gray-400">Events waiting for results will appear here</p>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {lockedEvents.map((event: any) => (
                            <EventCard key={event.id} event={event} variant="locked" solPrice={solPrice} />
                        ))}
                    </div>
                );

            case 'results':
                if (resolvedEvents.length === 0) {
                    return (
                        <div className="text-center py-12">
                            <CheckCircle className="w-12 h-12 text-text-muted dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">No Results Yet</h3>
                            <p className="text-text-secondary dark:text-gray-400">Completed events will appear here</p>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {resolvedEvents.map((event: any) => (
                            <ResultCard key={event.id} event={event} solPrice={solPrice} />
                        ))}
                    </div>
                );
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
            {/* Header */}
            <div className="text-center mb-6 md:mb-8">
                <div className="inline-flex items-center gap-2 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                    <Trophy className="w-4 h-4" />
                    Featured Jackpots
                </div>
                <h1 className="text-2xl md:text-4xl font-bold text-text-primary dark:text-white mb-2">Jackpots</h1>
                <p className="text-text-secondary dark:text-gray-400">Pick your winner and join the prize pool</p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 md:mb-8">
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const count = tabCounts[tab.id];

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    'flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 rounded-xl font-medium text-xs md:text-sm transition-all',
                                    isActive
                                        ? 'bg-brand-600 dark:bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                                        : 'bg-background-secondary dark:bg-gray-800 text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-text-primary dark:hover:text-white'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                                {count > 0 && (
                                    <span className={clsx(
                                        'px-1.5 py-0.5 rounded-full text-xs font-bold',
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <p className="text-center text-text-muted dark:text-gray-500 text-xs md:text-sm mt-3">
                    {TABS.find(t => t.id === activeTab)?.description}
                </p>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {renderTabContent()}
            </div>

            {/* How it works */}
            <div className="mt-12 p-6 card dark:bg-gray-900 dark:border-gray-800">
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
                        <p className="text-text-muted dark:text-gray-400 text-sm">Pay with SOL from your wallet</p>
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
