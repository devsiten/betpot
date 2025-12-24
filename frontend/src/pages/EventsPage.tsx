import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, RefreshCw, Bitcoin, Vote, Trophy, Film, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import clsx from 'clsx';

// Main category tabs
const mainCategories = [
  { key: 'sports', label: 'Sports', icon: Trophy },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin },
  { key: 'politics', label: 'Politics', icon: Vote },
  { key: 'entertainment', label: 'Entertainment', icon: Film },
  { key: 'finance', label: 'Finance', icon: TrendingUp },
];

// Available sports leagues for the Odds API
const sportsLeagues = [
  { key: 'soccer_epl', label: 'Premier League' },
  { key: 'soccer_spain_la_liga', label: 'La Liga' },
  { key: 'soccer_germany_bundesliga', label: 'Bundesliga' },
  { key: 'soccer_italy_serie_a', label: 'Serie A' },
  { key: 'soccer_uefa_champs_league', label: 'Champions League' },
  { key: 'basketball_nba', label: 'NBA' },
  { key: 'americanfootball_nfl', label: 'NFL' },
];

export function EventsPage() {
  const [selectedCategory, setSelectedCategory] = useState('sports');
  const [selectedLeague, setSelectedLeague] = useState('soccer_epl');
  const [displayCount, setDisplayCount] = useState(24);

  // Reset displayCount when category changes
  const handleCategoryChange = (key: string) => {
    setSelectedCategory(key);
    setDisplayCount(24);
  };

  // Fetch SPORTS from Odds API (real sports with Home/Draw/Win)
  const { data: sportsData, isLoading: loadingSports, refetch: refetchSports } = useQuery({
    queryKey: ['odds-api-events', selectedLeague],
    queryFn: () => api.getExternalEvents(selectedLeague),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    enabled: selectedCategory === 'sports',
  });

  // Fetch Polymarket events for other categories
  const { data: polymarketData, isLoading: loadingPolymarket, refetch: refetchPolymarket } = useQuery({
    queryKey: ['polymarket-events', selectedCategory],
    queryFn: () => api.getPolymarketEvents(selectedCategory),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: selectedCategory !== 'sports',
  });

  const isLoading = selectedCategory === 'sports' ? loadingSports : loadingPolymarket;
  const refetch = selectedCategory === 'sports' ? refetchSports : refetchPolymarket;

  // Get events based on category
  const allEvents = selectedCategory === 'sports'
    ? (sportsData?.data || [])
    : (polymarketData?.data || []);

  const events = allEvents.slice(0, displayCount);
  const hasMore = allEvents.length > displayCount;

  // Helper function to extract options from Polymarket event data
  const getPolymarketOptions = (event: any) => {
    let opts = event.options;

    // If no options or empty, try to get from first market in rawData.markets
    if ((!opts || opts.length === 0) && event.rawData?.markets?.[0]) {
      const firstMarket = event.rawData.markets[0];
      if (firstMarket.outcomes && firstMarket.outcomePrices) {
        try {
          const outcomes = JSON.parse(firstMarket.outcomes);
          const prices = JSON.parse(firstMarket.outcomePrices);
          opts = outcomes.map((label: string, i: number) => ({
            label,
            percentage: Math.round(parseFloat(prices[i] || '0') * 100)
          }));
        } catch (e) {
          opts = [];
        }
      }
    }

    return opts || [];
  };

  // Render sports event card (Home/Draw/Win style)
  const renderSportsCard = (event: any) => {
    const isJackpot = (event as any).isJackpot;
    const CardWrapper = isJackpot ? Link : 'div';
    const cardProps = isJackpot
      ? { to: `/events/${event.id}`, className: "card card-hover p-0 overflow-hidden block cursor-pointer" }
      : { className: "card p-0 overflow-hidden block" };

    return (
      <CardWrapper key={event.id} {...cardProps as any}>
        {/* Event Header */}
        <div className="p-5 border-b border-border bg-background-secondary">
          <div className="flex items-start justify-between mb-3">
            <span className="badge badge-success">Live</span>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-background-secondary px-2 py-1 rounded border border-border">
              {event.sport || 'Sports'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-text-primary leading-tight line-clamp-2">
            {event.title}
          </h3>
          {/* Start Time / Match Date */}
          {event.startTime && (
            <div className="flex items-center gap-1 text-xs text-positive-600 font-mono mt-2">
              <Clock className="w-3 h-3" />
              {format(new Date(event.startTime), 'MMM dd, yyyy HH:mm')}
            </div>
          )}
        </div>

        {/* Betting Options - Home/Draw/Win Style */}
        <div className="p-5">
          {event.options && event.options.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {event.options.slice(0, 3).map((option: any, idx: number) => {
                // Determine the display label and color
                let displayLabel = option.label;
                let bgColor = 'bg-positive-100';
                let borderColor = 'border-positive-200';
                let textColor = 'text-positive-700';

                if (option.type === 'home' || idx === 0) {
                  displayLabel = 'Home';
                  bgColor = 'bg-positive-100';
                  borderColor = 'border-positive-200';
                  textColor = 'text-positive-700';
                } else if (option.type === 'draw' || option.label === 'Draw') {
                  displayLabel = 'Draw';
                  bgColor = 'bg-background-secondary';
                  borderColor = 'border-border-dark';
                  textColor = 'text-text-secondary';
                } else if (option.type === 'away' || idx === 2) {
                  displayLabel = 'Away';
                  bgColor = 'bg-negative-100';
                  borderColor = 'border-negative-200';
                  textColor = 'text-negative-600';
                }

                return (
                  <div
                    key={idx}
                    className={clsx(
                      'p-3 rounded-xl border-2 text-center transition-all hover:scale-105',
                      bgColor, borderColor
                    )}
                  >
                    <span className={clsx('block text-xs font-bold uppercase tracking-wider mb-1', textColor)}>
                      {displayLabel}
                    </span>
                    <span className={clsx('block text-sm font-medium', textColor)}>
                      {option.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-3 rounded-lg bg-background-secondary text-text-muted text-xs">
              No odds available
            </div>
          )}
        </div>
      </CardWrapper>
    );
  };

  // Render Polymarket event card (Yes/No style with expiration)
  const renderPolymarketCard = (event: any) => {
    const opts = getPolymarketOptions(event);
    const isJackpot = (event as any).isJackpot;
    const CardWrapper = isJackpot ? Link : 'div';
    const cardProps = isJackpot
      ? { to: `/events/${event.id}`, className: "card card-hover p-0 overflow-hidden block cursor-pointer" }
      : { className: "card p-0 overflow-hidden block" };

    return (
      <CardWrapper key={event.id} {...cardProps as any}>
        {/* Event Image */}
        {event.image && (
          <div className="h-32 bg-gradient-to-br from-positive-100 to-brand-100 relative overflow-hidden">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover opacity-90"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Event Header */}
        <div className="p-5 border-b border-border bg-background-secondary">
          <div className="flex items-start justify-between mb-3">
            <span className="badge badge-success">{event.active !== false ? 'Live' : 'Upcoming'}</span>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-background-secondary px-2 py-1 rounded border border-border">
              {selectedCategory}
            </span>
          </div>
          <h3 className="text-lg font-bold text-text-primary leading-tight line-clamp-2">
            {event.title}
          </h3>

          {/* Expiration Date */}
          {(event.endTime || event.rawData?.endDate) && (
            <div className="flex items-center gap-1 text-xs text-brand-600 font-mono mt-2">
              <Clock className="w-3 h-3" />
              Ends: {format(new Date(event.endTime || event.rawData?.endDate), 'MMM dd, yyyy')}
            </div>
          )}
        </div>

        {/* Betting Options - Yes/No Style */}
        <div className="p-5">
          {opts.length === 0 ? (
            <div className="text-center p-3 rounded-lg bg-background-secondary text-text-muted text-xs">
              No outcome data
            </div>
          ) : opts.length === 2 ? (
            <div className="flex gap-3">
              {opts.map((option: any, idx: number) => {
                const displayLabel = option.label === 'Yes' || option.label === 'No'
                  ? option.label
                  : (idx === 0 ? 'Yes' : 'No');
                const percentage = option.percentage ?? Math.round((option.price || 0) * 100);

                return (
                  <div
                    key={idx}
                    className={clsx(
                      'flex-1 text-center p-3 rounded-xl border-2 transition-all',
                      idx === 0
                        ? 'bg-positive-100 border-positive-200'
                        : 'bg-negative-100 border-negative-200'
                    )}
                  >
                    <span className={clsx(
                      'block text-xs font-bold uppercase tracking-wider mb-1',
                      idx === 0 ? 'text-positive-700' : 'text-negative-600'
                    )}>
                      {displayLabel}
                    </span>
                    <span className={clsx(
                      'block text-2xl font-bold',
                      idx === 0 ? 'text-positive-700' : 'text-negative-600'
                    )}>
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {opts.slice(0, 3).map((option: any, idx: number) => {
                const lbl = option.label?.toLowerCase() || '';
                const isFirst = idx === 0 || lbl === 'yes' || lbl === 'home';
                const isLast = idx === 2 || lbl === 'no' || lbl === 'away';

                const bgColor = isFirst ? 'bg-positive-100 border-positive-200'
                  : isLast ? 'bg-negative-100 border-negative-200'
                    : 'bg-amber-50 border-amber-200';
                const textColor = isFirst ? 'text-positive-700'
                  : isLast ? 'text-negative-600'
                    : 'text-amber-700';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-center ${bgColor}`}
                  >
                    <span className={`block text-xs font-bold truncate ${textColor}`}>
                      {option.label}
                    </span>
                    {option.percentage !== undefined && (
                      <span className={`block text-lg font-bold mt-1 ${textColor}`}>
                        {option.percentage}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map((tag: string, idx: number) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 bg-background-secondary text-text-muted rounded border border-border">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardWrapper>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">Prediction Markets</h1>
        <p className="text-text-secondary mt-1 font-mono text-sm">Browse live events across sports, crypto, politics, and more</p>
      </div>

      {/* Main Category Tabs */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
        {mainCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold uppercase text-sm tracking-wider transition-all whitespace-nowrap',
                selectedCategory === cat.key
                  ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-soft'
                  : 'bg-background-secondary text-text-secondary hover:text-text-primary border border-border hover:border-border-dark'
              )}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Sports League Selector (only for sports) */}
      {selectedCategory === 'sports' && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {sportsLeagues.map((league) => (
            <button
              key={league.key}
              onClick={() => setSelectedLeague(league.key)}
              className={clsx(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                selectedLeague === league.key
                  ? 'bg-background-secondary text-text-primary border border-border-dark'
                  : 'bg-background-secondary text-text-muted hover:text-text-primary hover:border-border-dark border border-border'
              )}
            >
              {league.label}
            </button>
          ))}
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => refetch()}
          className="btn btn-ghost text-xs"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-40 bg-background-secondary animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 card">
          <Calendar className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary text-lg font-bold">No events found</p>
          <p className="text-text-muted text-sm mt-1 font-mono">Try selecting a different category or league</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: any) => (
            selectedCategory === 'sports'
              ? renderSportsCard(event)
              : renderPolymarketCard(event)
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!isLoading && allEvents.length > 0 && (
        <div className="text-center mt-8 space-y-3">
          <p className="text-text-muted text-sm font-mono">
            Showing {events.length} of {allEvents.length} events
          </p>
          {hasMore && (
            <button
              onClick={() => setDisplayCount(prev => prev + 24)}
              className="btn btn-primary"
            >
              Load More Events
            </button>
          )}
        </div>
      )}
    </div>
  );
}
