import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Zap, Clock, TrendingUp } from 'lucide-react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import clsx from 'clsx';
import { EventCountdown } from '@/components/CountdownTimer';

// Tab types
type TabType = 'sports' | 'predictions' | 'live';

export function HomePage() {
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>('sports');
  const [displayCount, setDisplayCount] = useState(100);

  // Reset display count when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setDisplayCount(100);
  };

  // ============ SPORTS - Polymarket Sports API ============
  const { data: sportsData, isLoading: loadingSports } = useQuery({
    queryKey: ['all-sports'],
    queryFn: () => api.getAllFootballEvents(200),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    enabled: activeTab === 'sports',
  });

  // ============ PREDICTIONS - Polymarket Events API ============
  const { data: predictionsData, isLoading: loadingPredictions } = useQuery({
    queryKey: ['predictions-all'],
    queryFn: () => api.getPolymarketEvents(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: activeTab === 'predictions',
  });

  // ============ LIVE NOW - API-Sports Real-time ============
  const { data: liveData, isLoading: loadingLive } = useQuery({
    queryKey: ['live-matches'],
    queryFn: () => api.getLiveMatches(200),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: activeTab === 'live',
  });

  // ============ ENDING SOON - Internal Events ============
  const { data: eventsData } = useQuery({
    queryKey: ['events-ending-soon'],
    queryFn: () => api.getEvents({ status: 'open', limit: 4 }),
    staleTime: 30 * 1000,
  });

  // Get data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'sports':
        return sportsData?.data || [];
      case 'predictions':
        return predictionsData?.data || [];
      case 'live':
        return liveData?.data || [];
      default:
        return [];
    }
  };

  const isLoading = activeTab === 'sports' ? loadingSports
    : activeTab === 'predictions' ? loadingPredictions
      : loadingLive;

  const allEvents = getCurrentData();
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
    } else if (activeTab === 'predictions') {
      return renderPredictionCard(event);
    } else {
      return renderLiveCard(event);
    }
  };

  // Render sports card (H/D/A format)
  const renderSportsCard = (event: any) => (
    <div key={event.id} className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-border bg-background-secondary">
        <div className="flex items-center justify-between mb-2">
          <span className="badge badge-success text-[9px]">{event.league || 'Football'}</span>
          {event.startTime && (
            <span className="text-[10px] text-text-muted font-mono">
              {format(new Date(event.startTime), 'MMM dd HH:mm')}
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold text-text-primary line-clamp-2">
          {event.homeTeam} vs {event.awayTeam}
        </h4>
      </div>
      <div className="p-4">
        {event.options && event.options.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {event.options.slice(0, 3).map((opt: any, idx: number) => (
              <div
                key={idx}
                className={clsx(
                  'p-2 rounded-lg border text-center',
                  idx === 0 && 'bg-positive-50 border-positive-200',
                  idx === 1 && 'bg-gray-50 border-gray-200',
                  idx === 2 && 'bg-negative-50 border-negative-200'
                )}
              >
                <span className={clsx(
                  'block text-[10px] font-bold uppercase',
                  idx === 0 && 'text-positive-700',
                  idx === 1 && 'text-gray-600',
                  idx === 2 && 'text-negative-600'
                )}>
                  {idx === 0 ? 'Home' : idx === 1 ? 'Draw' : 'Away'}
                </span>
                <span className={clsx(
                  'block text-sm font-bold',
                  idx === 0 && 'text-positive-700',
                  idx === 1 && 'text-gray-600',
                  idx === 2 && 'text-negative-600'
                )}>
                  {opt.percentage}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-xs text-text-muted py-2">No odds available</div>
        )}
      </div>
    </div>
  );

  // Render prediction card (Yes/No button format)
  const renderPredictionCard = (event: any) => {
    // Get options - handle both array and nested formats
    let options = event.options || [];
    if ((!options || options.length === 0) && event.rawData?.markets?.[0]) {
      const firstMarket = event.rawData.markets[0];
      if (firstMarket.outcomes && firstMarket.outcomePrices) {
        try {
          const outcomes = JSON.parse(firstMarket.outcomes);
          const prices = JSON.parse(firstMarket.outcomePrices);
          options = outcomes.map((label: string, i: number) => ({
            label,
            percentage: Math.round(parseFloat(prices[i] || '0') * 100)
          }));
        } catch (e) {
          options = [];
        }
      }
    }

    return (
      <div key={event.id} className="card p-0 overflow-hidden">
        {/* Event Image */}
        {event.image && (
          <div className="h-24 bg-gradient-to-br from-positive-100 to-brand-100 relative overflow-hidden">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover opacity-90"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            {event.tags?.[0] && (
              <span className="badge badge-primary text-[9px]">{event.tags[0]}</span>
            )}
            {event.endTime && (
              <span className="text-[10px] text-text-muted font-mono">
                Ends {format(new Date(event.endTime), 'MMM dd')}
              </span>
            )}
          </div>

          <h4 className="text-sm font-bold text-text-primary line-clamp-2 mb-3">
            {event.title}
          </h4>

          {/* Yes/No Button Format (instead of progress bars) */}
          {options.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {options.slice(0, 2).map((opt: any, idx: number) => (
                <div
                  key={idx}
                  className={clsx(
                    'p-3 rounded-lg border text-center transition-all hover:scale-[1.02]',
                    idx === 0
                      ? 'bg-positive-50 dark:bg-positive-900/30 border-positive-300 dark:border-positive-700'
                      : 'bg-negative-50 dark:bg-negative-900/30 border-negative-300 dark:border-negative-700'
                  )}
                >
                  <span className={clsx(
                    'block text-xs font-bold uppercase mb-1',
                    idx === 0 ? 'text-positive-700 dark:text-positive-400' : 'text-negative-600 dark:text-negative-400'
                  )}>
                    {opt.label === 'Yes' ? '✓ Yes' : opt.label === 'No' ? '✗ No' : opt.label}
                  </span>
                  <span className={clsx(
                    'block text-lg font-black',
                    idx === 0 ? 'text-positive-600 dark:text-positive-300' : 'text-negative-500 dark:text-negative-300'
                  )}>
                    {opt.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };


  // Render LIVE match card (with scores)
  const renderLiveCard = (event: any) => (
    <div key={event.id} className="card p-0 overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
      <div className="p-4 border-b border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold text-red-600">
              {event.elapsed ? `${event.elapsed}'` : 'LIVE'}
            </span>
          </div>
          <span className="text-[10px] text-text-muted font-mono">{event.league}</span>
        </div>
        <h4 className="text-sm font-bold text-text-primary">
          {event.homeTeam} vs {event.awayTeam}
        </h4>
      </div>

      <div className="p-4">
        {/* Score display */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-center flex-1">
            {event.homeTeamLogo && (
              <img src={event.homeTeamLogo} alt="" className="w-8 h-8 mx-auto mb-1 object-contain" />
            )}
            <span className={clsx(
              'block text-xs font-bold truncate',
              event.homeWinning ? 'text-positive-600' : 'text-text-primary'
            )}>
              {event.homeTeam}
            </span>
          </div>

          <div className="text-center">
            <span className="text-3xl font-black text-text-primary">
              {event.homeScore ?? 0} - {event.awayScore ?? 0}
            </span>
            <span className="block text-[10px] text-red-500 font-mono mt-1">
              {event.status}
            </span>
          </div>

          <div className="text-center flex-1">
            {event.awayTeamLogo && (
              <img src={event.awayTeamLogo} alt="" className="w-8 h-8 mx-auto mb-1 object-contain" />
            )}
            <span className={clsx(
              'block text-xs font-bold truncate',
              event.awayWinning ? 'text-positive-600' : 'text-text-primary'
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
                The decentralized jackpot platform. Browse live markets, discuss events with the community, and place your bets on featured jackpots.
              </p>

              <div className="flex items-center gap-4">
                <Link to="/jackpot" className="btn btn-primary">
                  <Trophy className="w-4 h-4" />
                  Jackpot
                </Link>
                <Link to="/events" className="btn btn-secondary">
                  Browse Markets
                </Link>
              </div>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTabChange('sports')}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold uppercase text-sm tracking-wider transition-all',
                activeTab === 'sports'
                  ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              <span>⚽</span> Sports
            </button>
            <button
              onClick={() => handleTabChange('predictions')}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold uppercase text-sm tracking-wider transition-all',
                activeTab === 'predictions'
                  ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              <TrendingUp className="w-4 h-4" /> Predictions
            </button>
            <button
              onClick={() => handleTabChange('live')}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold uppercase text-sm tracking-wider transition-all',
                activeTab === 'live'
                  ? 'bg-gradient-to-r from-red-500 to-red-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live
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
        ) : displayedEvents.length === 0 ? (
          <div className="text-center py-16 card">
            <div className="w-16 h-16 rounded-2xl bg-background-secondary flex items-center justify-center mx-auto mb-4">
              {activeTab === 'live' ? (
                <span className="text-2xl">🔴</span>
              ) : activeTab === 'sports' ? (
                <span className="text-2xl">⚽</span>
              ) : (
                <TrendingUp className="w-8 h-8 text-text-muted" />
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
          /* Events Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
