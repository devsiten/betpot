import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Zap, Clock, Lock, CheckCircle, Calendar } from 'lucide-react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import clsx from 'clsx';
import { EventCountdown } from '@/components/CountdownTimer';

// Tab types
type TabType = 'sports' | 'jackpot' | 'live' | 'news' | 'betpot-news' | 'leaderboard';

// Jackpot sub-tab types
type JackpotSubTab = 'live' | 'upcoming' | 'locked' | 'results';

const JACKPOT_TABS: { id: JackpotSubTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'live', label: 'Live Events', icon: Zap, description: 'Open for betting now' },
  { id: 'upcoming', label: 'Upcoming', icon: Calendar, description: 'Coming soon' },
  { id: 'locked', label: 'Locked', icon: Lock, description: 'Waiting for results' },
  { id: 'results', label: 'Results', icon: CheckCircle, description: 'Completed events' },
];

// Jackpot Event Card Component
function JackpotEventCard({ event, variant = 'default' }: { event: any; variant?: 'default' | 'locked' | 'result' }) {
  const isLocked = variant === 'locked';
  const isResult = variant === 'result';

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
      {(event.eventTime || event.resolvedAt) && (
        <div className="flex items-center gap-2 text-text-secondary dark:text-gray-300 text-xs md:text-sm font-medium mb-2">
          <Clock className="w-3 h-3 md:w-4 md:h-4" />
          {format(new Date(event.eventTime || event.resolvedAt), 'MMM dd, yyyy HH:mm')}
        </div>
      )}

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
          ${(event.totalPool || 0).toLocaleString()}
        </p>
        <p className="text-xs text-text-muted dark:text-gray-400 font-medium mt-1">
          {event.ticketCount || 0} bets
        </p>
      </div>

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

// Jackpot Tab Content Component
function JackpotTabContent({
  jackpotData,
  jackpotResultsData,
  loadingResults
}: {
  jackpotData: any;
  jackpotResultsData: any;
  loadingResults: boolean;
}) {
  const [activeSubTab, setActiveSubTab] = useState<JackpotSubTab>('live');

  const allJackpots = jackpotData?.jackpots || [];

  // Filter events by status
  const liveEvents = useMemo(() => allJackpots.filter((j: any) => j.status === 'open'), [allJackpots]);
  const upcomingEvents = useMemo(() => allJackpots.filter((j: any) => j.status === 'upcoming'), [allJackpots]);
  const lockedEvents = useMemo(() => allJackpots.filter((j: any) => j.status === 'locked'), [allJackpots]);
  const resolvedEvents = jackpotResultsData?.data || [];

  const tabCounts: Record<JackpotSubTab, number> = {
    live: liveEvents.length,
    upcoming: upcomingEvents.length,
    locked: lockedEvents.length,
    results: resolvedEvents.length,
  };

  const renderSubTabContent = () => {
    if (activeSubTab === 'results' && loadingResults) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"></div>
        </div>
      );
    }

    const getEvents = () => {
      switch (activeSubTab) {
        case 'live': return liveEvents;
        case 'upcoming': return upcomingEvents;
        case 'locked': return lockedEvents;
        case 'results': return resolvedEvents;
        default: return [];
      }
    };

    const events = getEvents();
    const variant = activeSubTab === 'locked' ? 'locked' : activeSubTab === 'results' ? 'result' : 'default';

    if (events.length === 0) {
      const emptyMessages: Record<JackpotSubTab, { icon: React.ElementType; title: string; desc: string }> = {
        live: { icon: Zap, title: 'No Live Events', desc: 'Check back soon or browse upcoming events' },
        upcoming: { icon: Calendar, title: 'No Upcoming Events', desc: 'New events will be scheduled soon' },
        locked: { icon: Lock, title: 'No Locked Events', desc: 'Events waiting for results will appear here' },
        results: { icon: CheckCircle, title: 'No Results Yet', desc: 'Completed events will appear here' },
      };
      const msg = emptyMessages[activeSubTab];
      const Icon = msg.icon;

      return (
        <div className="text-center py-12">
          <Icon className="w-12 h-12 text-text-muted dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">{msg.title}</h3>
          <p className="text-text-secondary dark:text-gray-400">{msg.desc}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {events.map((event: any) => (
          <JackpotEventCard key={event.id} event={event} variant={variant} />
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Sub-Tab Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
          {JACKPOT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            const count = tabCounts[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
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
          {JACKPOT_TABS.find(t => t.id === activeSubTab)?.description}
        </p>
      </div>

      {/* Sub-Tab Content */}
      <div className="min-h-[400px]">
        {renderSubTabContent()}
      </div>
    </div>
  );
}

export function HomePage() {
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>('sports');
  const [displayCount, setDisplayCount] = useState(100);
  const [searchWallet, setSearchWallet] = useState('');
  const [searchResult, setSearchResult] = useState<{ rank: number; volumePoints: number; displayName: string } | null>(null);
  const [searching, setSearching] = useState(false);

  // Reset display count when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setDisplayCount(100);
    setSearchWallet('');
    setSearchResult(null);
  };

  // Search for user rank by wallet
  const handleSearch = async () => {
    if (!searchWallet.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const result = await api.searchUserRank(searchWallet.trim());
      if (result.success && result.data) {
        setSearchResult(result.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  // Helper to get cached data from localStorage
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(`betpot_cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (e) { /* ignore */ }
    return undefined;
  };

  // Helper to save data to localStorage
  const saveCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(`betpot_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) { /* ignore */ }
  };

  // ============ SPORTS - Polymarket Sports API ============
  const { data: sportsData, isLoading: loadingSports } = useQuery({
    queryKey: ['all-sports'],
    queryFn: async () => {
      const result = await api.getAllFootballEvents(200);
      saveCachedData('sports', result);
      return result;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    enabled: activeTab === 'sports',
    placeholderData: getCachedData('sports'),
  });

  // ============ JACKPOT - Internal Jackpot Events ============
  const { data: jackpotData, isLoading: loadingJackpots } = useQuery({
    queryKey: ['jackpot'],
    queryFn: () => api.getJackpot(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: activeTab === 'jackpot',
  });

  // Fetch resolved jackpots for results tab
  const { data: jackpotResultsData, isLoading: loadingJackpotResults } = useQuery({
    queryKey: ['jackpot-results'],
    queryFn: () => api.getJackpotResults(),
    enabled: activeTab === 'jackpot',
  });

  // ============ LIVE NOW - API-Sports Real-time ============
  const { data: liveData, isLoading: loadingLive } = useQuery({
    queryKey: ['live-matches'],
    queryFn: async () => {
      const result = await api.getLiveMatches(200);
      saveCachedData('live', result);
      return result;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: activeTab === 'live',
    placeholderData: getCachedData('live'),
  });

  // ============ ENDING SOON - Internal Events ============
  const { data: eventsData } = useQuery({
    queryKey: ['events-ending-soon'],
    queryFn: async () => {
      const result = await api.getEvents({ status: 'open', limit: 4 });
      saveCachedData('ending-soon', result);
      return result;
    },
    staleTime: 30 * 1000,
    placeholderData: getCachedData('ending-soon'),
  });

  // ============ NEWS - External News ============
  const { data: newsData, isLoading: loadingNews } = useQuery({
    queryKey: ['external-news'],
    queryFn: async () => {
      const result = await api.getNews('sports');
      saveCachedData('news', result);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'news',
    placeholderData: getCachedData('news'),
  });

  // ============ BETPOT NEWS - Internal Blog ============
  const { data: blogData, isLoading: loadingBlog } = useQuery({
    queryKey: ['betpot-blog'],
    queryFn: async () => {
      const result = await api.getBlogPosts();
      saveCachedData('blog', result);
      return result;
    },
    staleTime: 60 * 1000,
    enabled: activeTab === 'betpot-news',
    placeholderData: getCachedData('blog'),
  });

  // ============ LEADERBOARD ============
  const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const result = await api.getLeaderboard();
      saveCachedData('leaderboard', result);
      return result;
    },
    staleTime: 30 * 1000,
    enabled: activeTab === 'leaderboard',
    placeholderData: getCachedData('leaderboard'),
  });

  // Get data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'sports':
        return sportsData?.data || [];
      case 'jackpot':
        return []; // Jackpot has special rendering
      case 'live':
        return liveData?.data || [];
      case 'news':
        return newsData?.data || [];
      case 'betpot-news':
        return blogData?.data || [];
      default:
        return [];
    }
  };

  const isLoading = activeTab === 'sports' ? loadingSports
    : activeTab === 'jackpot' ? loadingJackpots
      : activeTab === 'live' ? loadingLive
        : activeTab === 'news' ? loadingNews
          : activeTab === 'leaderboard' ? loadingLeaderboard
            : loadingBlog;

  // Get raw events and apply FRONTEND DEDUPLICATION for sports
  const rawEvents = getCurrentData();
  const seenMatches = new Set<string>();
  const allEvents = activeTab === 'sports'
    ? rawEvents.filter((event: any) => {
      // Skip events with "More Markets" in title
      if (event.title?.includes('More Markets')) return false;

      // Get team names from event or parse from title
      let homeTeam = event.homeTeam || '';
      let awayTeam = event.awayTeam || '';

      if ((!homeTeam || !awayTeam) && event.title) {
        const vsMatch = event.title.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s+-\s+|$)/i);
        if (vsMatch) {
          homeTeam = vsMatch[1].trim();
          awayTeam = vsMatch[2].trim();
        }
      }

      // Normalize and deduplicate
      const home = homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '');
      const away = awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (home && away) {
        const matchKey = [home, away].sort().join('_vs_');
        if (seenMatches.has(matchKey)) return false;
        seenMatches.add(matchKey);
      }
      return true;
    })
    : rawEvents;

  const displayedEvents = allEvents.slice(0, displayCount);
  const hasMore = allEvents.length > displayCount;

  // Get ending soon events
  const endingSoonEvents = (eventsData?.data || [])
    .filter((e: any) => e.eventTime && new Date(e.eventTime) > new Date())
    .sort((a: any, b: any) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime())
    .slice(0, 4);

  // ============ RENDER CARD BASED ON TAB ============
  const renderCard = (event: any) => {
    if (activeTab === 'sports') {
      return renderSportsCard(event);
    } else {
      return renderLiveCard(event);
    }
  };

  // Render sports card (H/D/A format)
  const renderSportsCard = (event: any) => {
    // Extract team names - fallback to parsing from title if missing
    let homeTeam = event.homeTeam;
    let awayTeam = event.awayTeam;

    // If team names missing, try parsing from title "Team A vs Team B"
    if ((!homeTeam || !awayTeam) && event.title) {
      const vsMatch = event.title.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s+-\s+|$)/i);
      if (vsMatch) {
        homeTeam = vsMatch[1].trim();
        awayTeam = vsMatch[2].trim();
      }
    }

    // Skip card if still no team names
    if (!homeTeam && !awayTeam) {
      return null;
    }

    return (
      <div key={event.id} className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-border dark:border-gray-700 bg-background-secondary dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="badge badge-success text-[9px] bg-positive-100 dark:bg-positive-900 text-positive-700 dark:text-positive-300">{event.league || 'Football'}</span>
            {event.startTime && (
              <span className="text-[10px] text-text-muted dark:text-gray-400 font-mono">
                {format(new Date(event.startTime), 'MMM dd HH:mm')}
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-text-primary dark:text-white line-clamp-2">
            {homeTeam || 'TBD'} vs {awayTeam || 'TBD'}
          </h4>
        </div>
        <div className="p-4 dark:bg-gray-900">
          {event.options && event.options.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {event.options.slice(0, 3).map((opt: any, idx: number) => (
                <div
                  key={idx}
                  className={clsx(
                    'p-2 rounded-lg border text-center',
                    idx === 0 && 'bg-positive-50 dark:bg-positive-900/30 border-positive-200 dark:border-positive-700',
                    idx === 1 && 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600',
                    idx === 2 && 'bg-negative-50 dark:bg-negative-900/30 border-negative-200 dark:border-negative-700'
                  )}
                >
                  <span className={clsx(
                    'block text-[10px] font-bold uppercase',
                    idx === 0 && 'text-positive-700 dark:text-positive-400',
                    idx === 1 && 'text-gray-600 dark:text-gray-300',
                    idx === 2 && 'text-negative-600 dark:text-negative-400'
                  )}>
                    {idx === 0 ? 'Home' : idx === 1 ? 'Draw' : 'Away'}
                  </span>
                  <span className={clsx(
                    'block text-sm font-bold',
                    idx === 0 && 'text-positive-700 dark:text-positive-300',
                    idx === 1 && 'text-gray-600 dark:text-gray-200',
                    idx === 2 && 'text-negative-600 dark:text-negative-300'
                  )}>
                    {opt.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-xs text-text-muted dark:text-gray-500 py-2">No odds available</div>
          )}
        </div>
      </div>
    );
  };


  // Render LIVE match card (with scores)
  const renderLiveCard = (event: any) => (
    <div key={event.id} className="card p-0 overflow-hidden bg-gradient-to-br from-positive-50 to-green-50 dark:from-positive-900/20 dark:to-green-900/20 border-positive-200 dark:border-positive-800">
      <div className="p-4 border-b border-positive-200 dark:border-positive-800 bg-positive-50/50 dark:bg-positive-900/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-positive-500"></span>
            </span>
            <span className="text-xs font-bold text-positive-600 dark:text-positive-400">
              {event.elapsed ? `${event.elapsed}'` : 'LIVE'}
            </span>
          </div>
          <span className="text-[10px] text-text-muted dark:text-gray-400 font-mono">{event.league}</span>
        </div>
        <h4 className="text-sm font-bold text-text-primary dark:text-white">
          {event.homeTeam} vs {event.awayTeam}
        </h4>
      </div>

      <div className="p-4 dark:bg-gray-900/50">
        {/* Score display */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-center flex-1">
            {event.homeTeamLogo && (
              <img src={event.homeTeamLogo} alt="" className="w-8 h-8 mx-auto mb-1 object-contain" />
            )}
            <span className={clsx(
              'block text-xs font-bold truncate',
              event.homeWinning ? 'text-positive-600 dark:text-positive-400' : 'text-text-primary dark:text-white'
            )}>
              {event.homeTeam}
            </span>
          </div>

          <div className="text-center">
            <span className="text-3xl font-black text-text-primary dark:text-white">
              {event.homeScore ?? 0} - {event.awayScore ?? 0}
            </span>
            <span className="block text-[10px] text-positive-500 dark:text-positive-400 font-mono mt-1">
              {event.status}
            </span>
          </div>

          <div className="text-center flex-1">
            {event.awayTeamLogo && (
              <img src={event.awayTeamLogo} alt="" className="w-8 h-8 mx-auto mb-1 object-contain" />
            )}
            <span className={clsx(
              'block text-xs font-bold truncate',
              event.awayWinning ? 'text-positive-600 dark:text-positive-400' : 'text-text-primary dark:text-white'
            )}>
              {event.awayTeam}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden mb-8">
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            {/* Left - Hero Text */}
            <div className="flex-1 max-w-xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-text-primary dark:text-white leading-tight mb-6 uppercase">
                <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-positive-500 bg-clip-text text-transparent drop-shadow-lg">
                  BET ON WHAT
                </span>
                <br />
                <span className="bg-gradient-to-r from-positive-500 to-brand-600 bg-clip-text text-transparent drop-shadow-lg">
                  YOU BELIEVE IN
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-text-secondary dark:text-gray-300 mb-8 font-medium backdrop-blur-sm bg-background-card/30 dark:bg-gray-800/50 p-4 rounded-xl border border-border/50 dark:border-gray-700/50 shadow-soft">
                BetPot is a prediction jackpot platform where everyone who picks the right outcome splits the prize pool.
              </p>
            </div>

            {/* Right - Ending Soon */}
            <div className="flex-1 max-w-md">
              <div className="bg-gradient-to-br from-background-card/80 to-background-secondary/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-border/50 dark:border-gray-700/50 shadow-elevated">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider drop-shadow-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Ending Soon
                  </h3>
                  <Link to="/jackpot" className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium">
                    View All →
                  </Link>
                </div>

                {endingSoonEvents.length > 0 ? (
                  <div className="space-y-2">
                    {endingSoonEvents.map((event: any) => (
                      <Link
                        key={event.id}
                        to={event.isJackpot ? '/jackpot' : `/events/${event.id}`}
                        className="block bg-gradient-to-r from-positive-50 to-brand-50 dark:from-positive-900/30 dark:to-brand-900/30 rounded-xl p-3 border border-positive-200 dark:border-positive-800 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            event.isJackpot
                              ? "bg-gradient-to-br from-brand-400 to-brand-600"
                              : "bg-gradient-to-br from-positive-400 to-positive-600"
                          )}>
                            {event.isJackpot ? (
                              <Trophy className="w-4 h-4 text-white" />
                            ) : (
                              <Clock className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-text-primary dark:text-white font-bold text-xs truncate">{event.title}</h4>
                            <EventCountdown
                              startTime={event.startTime || event.eventTime}
                              lockTime={event.lockTime || event.eventTime}
                              eventTime={event.eventTime}
                              status={event.status}
                              className="text-[10px]"
                            />
                          </div>
                          {event.isJackpot && (
                            <div className="text-right">
                              <p className="text-[10px] text-text-muted dark:text-gray-400">Pool</p>
                              <p className="text-xs font-bold text-positive-600 dark:text-positive-400">${(event.totalPool || 0).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-background-secondary flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-text-muted" />
                    </div>
                    <p className="text-text-muted text-sm">No events ending soon</p>
                    <Link to="/events" className="text-brand-500 text-sm font-medium hover:underline mt-2 inline-block">
                      Browse Events →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TABBED SECTION ============ */}
      <section className="max-w-7xl mx-auto pb-16">
        {/* Tab Buttons */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
            <button
              onClick={() => handleTabChange('sports')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex-shrink-0 whitespace-nowrap',
                activeTab === 'sports'
                  ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              <span>⚽</span> Sports
            </button>
            <button
              onClick={() => handleTabChange('jackpot')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex-shrink-0 whitespace-nowrap',
                activeTab === 'jackpot'
                  ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              <Trophy className="w-4 h-4" /> Jackpot
            </button>
            <button
              onClick={() => handleTabChange('live')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex-shrink-0 whitespace-nowrap',
                activeTab === 'live'
                  ? 'bg-gradient-to-r from-positive-500 to-green-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-positive-500"></span>
              </span>
              Live
            </button>
            <button
              onClick={() => handleTabChange('news')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex-shrink-0 whitespace-nowrap',
                activeTab === 'news'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              News
            </button>
            <button
              onClick={() => handleTabChange('betpot-news')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex-shrink-0 whitespace-nowrap',
                activeTab === 'betpot-news'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              BetPot News
            </button>
            <button
              onClick={() => handleTabChange('leaderboard')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex-shrink-0 whitespace-nowrap',
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              Leaderboard
            </button>
          </div>
          <Link to="/events" className="btn btn-ghost text-sm">
            View All →
          </Link>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4">
                <div className="h-32 bg-background-secondary animate-pulse rounded-lg mb-3" />
                <div className="h-4 bg-background-secondary animate-pulse rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : activeTab === 'jackpot' ? (
          /* Jackpot Content - Full page experience */
          <JackpotTabContent
            jackpotData={jackpotData}
            jackpotResultsData={jackpotResultsData}
            loadingResults={loadingJackpotResults}
          />
        ) : activeTab === 'leaderboard' ? (
          /* Leaderboard Table */
          <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-border dark:border-gray-800 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
              <h3 className="text-lg font-bold text-text-primary dark:text-white">
                Top 100 Volume Leaders
              </h3>
              {leaderboardData?.data?.userRank && (
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  Your rank: <span className="font-bold text-brand-600 dark:text-brand-400">#{leaderboardData.data.userRank.rank}</span> of {leaderboardData.data.userRank.totalUsers.toLocaleString()} users
                </p>
              )}
            </div>

            {/* Search Section */}
            <div className="p-4 border-b border-border dark:border-gray-800 bg-background-secondary/50 dark:bg-gray-800/50">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={searchWallet}
                  onChange={(e) => setSearchWallet(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by wallet address..."
                  className="flex-1 px-4 py-2 bg-background-card dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg text-text-primary dark:text-white placeholder-text-muted dark:placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchWallet.trim()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {searchResult && (
                <div className="mt-3 p-3 bg-positive-50 dark:bg-positive-900/20 border border-positive-200 dark:border-positive-800 rounded-lg">
                  <p className="text-sm text-text-primary dark:text-white">
                    <span className="font-medium">{searchResult.displayName}</span> -
                    Rank <span className="font-bold text-brand-600 dark:text-brand-400">#{searchResult.rank}</span> with
                    <span className="font-bold text-positive-600 dark:text-positive-400"> {searchResult.volumePoints.toLocaleString()}</span> pts
                  </p>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-background-secondary dark:bg-gray-800 text-left">
                    <th className="px-4 py-3 text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider text-right">Volume Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-gray-800">
                  {leaderboardData?.data?.leaderboard?.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-text-muted dark:text-gray-500">
                        No users on leaderboard yet. Be the first!
                      </td>
                    </tr>
                  ) : (
                    leaderboardData?.data?.leaderboard?.map((user) => (
                      <tr key={user.walletAddress} className="hover:bg-background-secondary/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={clsx(
                            'inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm',
                            user.rank === 1 && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                            user.rank === 2 && 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                            user.rank === 3 && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                            user.rank > 3 && 'bg-background-secondary dark:bg-gray-800 text-text-secondary dark:text-gray-400'
                          )}>
                            {user.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary dark:text-white">{user.displayName}</p>
                          <p className="text-xs text-text-muted dark:text-gray-500 font-mono">{user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-brand-600 dark:text-brand-400">{user.volumePoints.toLocaleString()}</span>
                          <span className="text-xs text-text-muted dark:text-gray-500 ml-1">pts</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'news' || activeTab === 'betpot-news' ? (
          /* News/Blog Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedEvents.length === 0 ? (
              <div className="col-span-full text-center py-16 card">
                <p className="text-text-secondary text-lg font-bold">
                  {activeTab === 'news' ? 'No news available' : 'No blog posts yet'}
                </p>
              </div>
            ) : (
              displayedEvents.map((item: any, idx: number) => (
                <Link
                  key={item.id || idx}
                  to={activeTab === 'betpot-news' ? `/betpot-news/${item.id}` : `/news`}
                  onClick={(e) => {
                    if (activeTab === 'news') {
                      e.preventDefault();
                      if (item.url) {
                        window.open(item.url, '_blank');
                      }
                    }
                  }}
                  className="card overflow-hidden hover:border-brand-300 dark:hover:border-brand-600 transition-all group"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-brand-600 via-brand-500 to-positive-500 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold opacity-80">⚽ SPORTS</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium uppercase">
                        {item.source || item.category || 'News'}
                      </span>
                      {item.publishedAt && (
                        <span className="text-[10px] text-text-muted dark:text-gray-500">
                          {format(new Date(item.publishedAt || item.createdAt), 'MMM dd')}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-text-primary dark:text-white line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {item.title}
                    </h4>
                    {(item.description || item.excerpt) && (
                      <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-2 mt-2">
                        {item.description || item.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : displayedEvents.length === 0 ? (
          /* Empty State for Sports/Predictions/Live */
          <div className="text-center py-16 card">
            <div className="w-16 h-16 rounded-2xl bg-background-secondary flex items-center justify-center mx-auto mb-4">
              {activeTab === 'live' ? (
                <span className="text-2xl">LIVE</span>
              ) : activeTab === 'sports' ? (
                <span className="text-2xl">SPORTS</span>
              ) : (
                <Trophy className="w-8 h-8 text-text-muted" />
              )}
            </div>
            <p className="text-text-secondary text-lg font-bold">
              {activeTab === 'live'
                ? 'No live matches right now'
                : activeTab === 'sports'
                  ? 'No sports events available'
                  : 'No predictions available'}
            </p>
            <p className="text-text-muted text-sm mt-1">
              {activeTab === 'live' && 'Check back during match times!'}
            </p>
          </div>
        ) : (
          /* Events Grid - Responsive for all devices */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {displayedEvents.map(renderCard)}
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && displayedEvents.length > 0 && (
          <div className="text-center mt-8 space-y-3">
            <p className="text-text-muted text-sm font-mono">
              Showing {displayedEvents.length} of {allEvents.length} {activeTab === 'live' ? 'live matches' : activeTab === 'sports' ? 'sports events' : 'predictions'}
            </p>
            {hasMore && (
              <button
                onClick={() => setDisplayCount(prev => prev + 50)}
                className="btn btn-primary"
              >
                Load More ({allEvents.length - displayCount} remaining)
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
