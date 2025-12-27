import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Check, Loader2, RefreshCw, Calendar, Bitcoin, Vote, Film, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Football leagues - COMPLETE list matching Browse Markets page
const sportCategories = [
    // All Football option
    { key: 'all', label: '⚽ All Football' },
    // Featured
    { key: '10188', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
    { key: '10204', label: '🏆 Champions League' },
    { key: '10193', label: '🇪🇸 La Liga' },
    { key: '10203', label: '🇮🇹 Serie A' },
    { key: '10194', label: '🇩🇪 Bundesliga' },
    { key: '10195', label: '🇫🇷 Ligue 1' },
    // Europe
    { key: '10209', label: '🏆 Europa League' },
    { key: '10437', label: '🏆 Conference League' },
    { key: '10286', label: '🇳🇱 Eredivisie' },
    { key: '10330', label: '🇵🇹 Liga Portugal' },
    { key: '10292', label: '🇹🇷 Süper Lig' },
    // Cups
    { key: '10307', label: '🏆 FA Cup' },
    { key: '10230', label: '🏆 EFL Cup' },
    { key: '10316', label: '🏆 Copa del Rey' },
    { key: '10317', label: '🏆 DFB-Pokal' },
    // Africa
    { key: '10786', label: '🌍 AFCON' },
    { key: '10240', label: '🌍 CAF' },
    // Americas
    { key: '10189', label: '🇺🇸 MLS' },
    { key: '10290', label: '🇲🇽 Liga MX' },
    { key: '10285', label: '🇦🇷 Argentina' },
    { key: '10359', label: '🇧🇷 Brasileirão' },
    { key: '10289', label: '🏆 Libertadores' },
    // Asia
    { key: '10360', label: '🇯🇵 J-League' },
    { key: '10361', label: '🇸🇦 Saudi Pro' },
    { key: '10444', label: '🇰🇷 K League' },
    { key: '10438', label: '🇦🇺 A-League' },
    // Other Sports
    { key: '10345', label: '🏀 NBA' },
    { key: '10187', label: '🏈 NFL' },
    { key: '10346', label: '🏒 NHL' },
    { key: '10500', label: '🥊 UFC/MMA' },
    { key: '10365', label: '🎾 Tennis ATP' },
    { key: '10470', label: '🏀 NCAA Basketball' },
];

// Polymarket categories
const polymarketCategories = [
    { key: 'crypto', label: 'Crypto', icon: Bitcoin },
    { key: 'politics', label: 'Politics', icon: Vote },
    { key: 'sports', label: 'Sports', icon: Trophy },
    { key: 'entertainment', label: 'Entertainment', icon: Film },
    { key: 'finance', label: 'Finance', icon: TrendingUp },
    { key: 'news', label: 'News', icon: TrendingUp },
    { key: 'latest', label: 'Ending Soon', icon: TrendingUp },
];

interface ExternalEvent {
    id: string;
    source: string;
    title: string;
    sport?: string;
    category?: string;
    sportKey?: string;
    homeTeam?: string;
    awayTeam?: string;
    description?: string;
    image?: string;
    startTime: string;
    volume?: number;
    options: Array<{ label: string; type?: string; percentage?: number }>;
}

export function AdminMarkets() {
    const [eventSource, setEventSource] = useState<'sports' | 'polymarket' | 'myevents'>('sports');
    const [selectedSport, setSelectedSport] = useState('10188'); // Premier League as default
    const [selectedPolyCategory, setSelectedPolyCategory] = useState('crypto');
    const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
    const [ticketPrice, setTicketPrice] = useState('10');
    const [ticketLimit, setTicketLimit] = useState('1000');
    const queryClient = useQueryClient();

    // Fetch sports events from Polymarket (same source as Browse Markets)
    const { data: sportsData, isLoading: loadingSports, refetch: refetchSports } = useQuery({
        queryKey: ['admin-sports-events', selectedSport],
        queryFn: () => selectedSport === 'all'
            ? api.getAllFootballEvents()
            : api.getPolymarketSportsEvents(selectedSport),
        staleTime: 5 * 60 * 1000,
        enabled: eventSource === 'sports',
    });

    // Fetch Polymarket events
    const { data: polymarketData, isLoading: loadingPolymarket, refetch: refetchPolymarket } = useQuery({
        queryKey: ['admin-polymarket-events', selectedPolyCategory],
        queryFn: () => api.getPolymarketEvents(selectedPolyCategory),
        staleTime: 5 * 60 * 1000,
        enabled: eventSource === 'polymarket',
    });

    // Fetch internal (manually created) events for My Events tab
    const { data: internalEventsData, isLoading: loadingInternal, refetch: refetchInternal } = useQuery({
        queryKey: ['admin-internal-events'],
        queryFn: () => api.getAdminEvents({ limit: 50 }),
        staleTime: 1 * 60 * 1000,
        enabled: eventSource === 'myevents',
    });

    // Fetch current jackpot
    const { data: jackpotData } = useQuery({
        queryKey: ['admin-jackpot'],
        queryFn: () => api.getJackpot(),
    });

    // Create jackpot mutation
    const createJackpotMutation = useMutation({
        mutationFn: async (event: ExternalEvent) => {
            // For internal events, just update them to be jackpot
            if (eventSource === 'myevents' || event.source === 'internal') {
                return api.setEventJackpot(event.id, true);
            }

            // Determine the correct category
            // Sports events from odds-api always use 'sports' category
            // Polymarket events use their category or the selected polymarket category
            const validCategories = ['sports', 'finance', 'crypto', 'politics', 'entertainment', 'news', 'other'];
            let category: string;

            if (eventSource === 'sports') {
                category = 'sports';
            } else {
                // For Polymarket, use event category, selected category, or fallback
                category = event.category || selectedPolyCategory || 'other';
                // Map 'latest' to 'other' since it's not a real category
                if (!validCategories.includes(category)) {
                    category = 'other';
                }
            }

            // Validate options - backend requires min 2, max 6
            if (!event.options || event.options.length < 2) {
                throw new Error('Event must have at least 2 betting options. This event cannot be used.');
            }
            if (event.options.length > 6) {
                // Take only first 6 options
                event.options = event.options.slice(0, 6);
            }

            // Validate eventTime - must be ISO 8601 format
            if (!event.startTime) {
                throw new Error('Event has no start time. Cannot create jackpot.');
            }

            // Ensure eventTime is valid ISO format
            const eventDate = new Date(event.startTime);
            if (isNaN(eventDate.getTime())) {
                throw new Error('Invalid event time format.');
            }
            const eventTimeISO = eventDate.toISOString();

            const payload = {
                externalId: event.id,
                externalSource: event.source,
                title: event.title,
                description: event.description || `${event.homeTeam || ''} vs ${event.awayTeam || ''}`.trim() || event.title,
                category: category as 'sports' | 'finance' | 'crypto' | 'politics' | 'entertainment' | 'news' | 'other',
                options: event.options.map(opt => ({
                    label: opt.label,
                    ticketLimit: parseInt(ticketLimit),
                })),
                eventTime: eventTimeISO,
                ticketPrice: parseFloat(ticketPrice),
                isJackpot: true,
                externalData: event,
            };

            // Debug log
            console.log('Creating jackpot with payload:', JSON.stringify(payload, null, 2));

            // Create event from external data with jackpot flag
            return api.createJackpotFromExternal(payload);
        },
        onSuccess: () => {
            toast.success('Jackpot created successfully!');
            queryClient.invalidateQueries({ queryKey: ['admin-jackpot'] });
            queryClient.invalidateQueries({ queryKey: ['jackpot'] });
            setSelectedEvent(null);
        },
        onError: (error: any) => {
            // Show the actual error from the API
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create jackpot';
            console.error('Jackpot creation error:', error?.response?.data || error);
            toast.error(errorMessage);
        },
    });

    const isLoading = eventSource === 'sports'
        ? loadingSports
        : eventSource === 'polymarket'
            ? loadingPolymarket
            : loadingInternal;

    // Convert internal events to ExternalEvent format for My Events tab
    const internalEventsFormatted = (internalEventsData?.data || [])
        .filter((e: any) => !e.isJackpot && e.status !== 'cancelled' && e.status !== 'resolved')
        .map((e: any) => ({
            id: e.id,
            source: 'internal',
            title: e.title,
            description: e.description,
            category: e.category,
            startTime: e.startTime,
            options: e.options || [],
        }));

    const externalEvents = eventSource === 'sports'
        ? (sportsData?.data || [])
        : eventSource === 'polymarket'
            ? (polymarketData?.data || [])
            : internalEventsFormatted;
    const currentJackpot = jackpotData?.data;

    const handleRefresh = () => {
        if (eventSource === 'sports') {
            refetchSports();
        } else if (eventSource === 'polymarket') {
            refetchPolymarket();
        } else {
            refetchInternal();
        }
    };

    const handleSetJackpot = (event: ExternalEvent) => {
        setSelectedEvent(event);
    };

    const confirmJackpot = () => {
        if (selectedEvent) {
            createJackpotMutation.mutate(selectedEvent);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">Jackpot Manager</h1>
                <p className="text-text-secondary mt-1 font-mono text-sm">Select events to feature as Jackpot</p>
            </div>

            {/* Current Jackpot */}
            {currentJackpot && (
                <div className="card p-6 mb-8 border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-orange-900/20">
                    <div className="flex items-center gap-3 mb-4">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        <div>
                            <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest">Current Jackpot</p>
                            <h2 className="text-xl font-bold text-text-primary">{currentJackpot.title}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-text-secondary font-mono">
                        <span>Pool: ${(currentJackpot.totalPool || 0).toLocaleString()}</span>
                        <span>Positions: {currentJackpot.ticketCount || 0}</span>
                        <span>Ends: {format(new Date(currentJackpot.eventTime), 'MMM dd, HH:mm')}</span>
                    </div>
                </div>
            )}

            {/* Source Toggle */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => setEventSource('sports')}
                    className={clsx(
                        'px-5 py-2.5 rounded-xl font-bold uppercase text-sm tracking-wider transition-all',
                        eventSource === 'sports'
                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)]'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    )}
                >
                    Live Sports
                </button>
                <button
                    onClick={() => setEventSource('polymarket')}
                    className={clsx(
                        'px-5 py-2.5 rounded-xl font-bold uppercase text-sm tracking-wider transition-all',
                        eventSource === 'polymarket'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    )}
                >
                    Prediction Markets
                </button>
                <button
                    onClick={() => setEventSource('myevents')}
                    className={clsx(
                        'px-5 py-2.5 rounded-xl font-bold uppercase text-sm tracking-wider transition-all',
                        eventSource === 'myevents'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    )}
                >
                    My Events
                </button>
            </div>

            {/* Category Tabs */}
            <div className="card p-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex gap-2 flex-wrap">
                        {eventSource === 'sports' ? (
                            sportCategories.map((sport) => (
                                <button
                                    key={sport.key}
                                    onClick={() => setSelectedSport(sport.key)}
                                    className={clsx(
                                        'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
                                        selectedSport === sport.key
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                            : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                                    )}
                                >
                                    {sport.label}
                                </button>
                            ))
                        ) : (
                            polymarketCategories.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.key}
                                        onClick={() => setSelectedPolyCategory(cat.key)}
                                        className={clsx(
                                            'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2',
                                            selectedPolyCategory === cat.key
                                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                                                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {cat.label}
                                    </button>
                                );
                            })
                        )}
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="btn btn-ghost text-xs"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Events Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card p-6">
                            <div className="h-40 bg-white/5 animate-pulse rounded-lg" />
                        </div>
                    ))}
                </div>
            ) : externalEvents.length === 0 ? (
                <div className="text-center py-16 card">
                    <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-text-primary text-lg font-bold">No upcoming events</p>
                    <p className="text-text-secondary text-sm mt-1 font-mono">Try selecting a different sport</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {externalEvents.slice(0, 24).map((event: any) => (
                        <div
                            key={event.id}
                            className={clsx(
                                'card p-0 overflow-hidden transition-all',
                                selectedEvent?.id === event.id && 'ring-2 ring-yellow-500'
                            )}
                        >
                            {/* Event Image (Polymarket) */}
                            {event.image && (
                                <div className="h-24 bg-gradient-to-br from-purple-900/30 to-pink-900/30 relative overflow-hidden">
                                    <img
                                        src={event.image}
                                        alt={event.title}
                                        className="w-full h-full object-cover opacity-80"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            )}

                            {/* Event Header */}
                            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="badge badge-success">{eventSource === 'polymarket' ? 'Live' : 'Upcoming'}</span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                                        {event.sport || event.category || selectedPolyCategory}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-text-primary leading-tight line-clamp-2">
                                    {event.title}
                                </h3>
                                <div className="flex items-center gap-4 mt-2">
                                    {event.startTime && (
                                        <p className="text-xs text-gray-500 font-mono">
                                            {format(new Date(event.startTime), 'MMM dd, yyyy')}
                                        </p>
                                    )}
                                    {event.volume && (
                                        <p className="text-xs text-cyan-400 font-mono">
                                            Vol: ${(event.volume / 1000000).toFixed(1)}M
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Options with Percentages */}
                            <div className="p-5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Betting Options</p>
                                <div className="space-y-2">
                                    {event.options?.slice(0, 3).map((option: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className={clsx(
                                                'p-3 rounded-lg border flex items-center justify-between',
                                                option.percentage !== undefined && option.percentage > 50
                                                    ? 'bg-green-500/10 border-green-500/30'
                                                    : 'bg-black/40 border-white/10'
                                            )}
                                        >
                                            <span className="text-sm font-medium text-text-primary truncate flex-1">
                                                {option.label}
                                            </span>
                                            {option.percentage !== undefined ? (
                                                <span className={clsx(
                                                    'text-lg font-bold ml-2',
                                                    option.percentage > 50 ? 'text-green-400' : 'text-gray-400'
                                                )}>
                                                    {option.percentage}%
                                                </span>
                                            ) : option.type && (
                                                <span className="text-xs text-gray-500 uppercase ml-2">
                                                    {option.type === 'home' ? 'Home' : option.type === 'away' ? 'Away' : 'Draw'}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Set as Jackpot Button */}
                                <button
                                    onClick={() => handleSetJackpot(event)}
                                    className={clsx(
                                        'mt-4 w-full py-3 rounded-xl font-bold uppercase text-sm tracking-wider transition-all flex items-center justify-center gap-2',
                                        selectedEvent?.id === event.id
                                            ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                                            : 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg'
                                    )}
                                >
                                    {selectedEvent?.id === event.id ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Selected
                                        </>
                                    ) : (
                                        <>
                                            <Trophy className="w-4 h-4" />
                                            Set as Jackpot
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card max-w-lg w-full p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Trophy className="w-10 h-10 text-yellow-500" />
                            <div>
                                <h2 className="text-xl font-bold text-text-primary">Confirm Jackpot</h2>
                                <p className="text-text-secondary text-sm">This will be the featured bet on the homepage</p>
                            </div>
                        </div>

                        <div className="bg-black/40 rounded-xl p-4 mb-6">
                            <h3 className="text-lg font-bold text-text-primary mb-2">{selectedEvent.title}</h3>
                            <p className="text-sm text-text-secondary font-mono">
                                {format(new Date(selectedEvent.startTime), 'MMM dd, yyyy • HH:mm')}
                            </p>
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                {selectedEvent.options?.map((opt, idx) => (
                                    <div key={idx} className="text-center p-2 bg-white/5 rounded-lg">
                                        <span className="block text-xs text-gray-500">{opt.type}</span>
                                        <span className="block text-sm text-text-primary truncate">{opt.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="label">Ticket Price (SOL)</label>
                                <input
                                    type="number"
                                    value={ticketPrice}
                                    onChange={(e) => setTicketPrice(e.target.value)}
                                    className="input"
                                    step="0.1"
                                    min="0.1"
                                />
                            </div>
                            <div>
                                <label className="label">Ticket Limit per Option</label>
                                <input
                                    type="number"
                                    value={ticketLimit}
                                    onChange={(e) => setTicketLimit(e.target.value)}
                                    className="input"
                                    min="10"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmJackpot}
                                disabled={createJackpotMutation.isPending}
                                className="btn flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-text-primary dark:text-white font-bold"
                            >
                                {createJackpotMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Trophy className="w-4 h-4" />
                                        Create Jackpot
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
