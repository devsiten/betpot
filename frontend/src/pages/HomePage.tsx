import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Zap, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import clsx from 'clsx';
import { EventCountdown } from '@/components/CountdownTimer';

export function HomePage() {
  const [displayCount, setDisplayCount] = useState(40);

  // Fetch all Polymarket events for Trending section with auto-refresh
  const { data: polymarketData, isLoading: loadingPolymarket } = useQuery({
    queryKey: ['polymarket-all'],
    queryFn: () => api.getPolymarketEvents(), // Get all events
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });



  // Fetch internal events sorted by eventTime (ending soon first)
  const { data: eventsData } = useQuery({
    queryKey: ['events-ending-soon'],
    queryFn: () => api.getEvents({ status: 'open', limit: 4 }),
    staleTime: 30 * 1000,
  });

  const allMarkets = polymarketData?.data || [];
  const liveMarkets = allMarkets.slice(0, displayCount);
  const hasMore = allMarkets.length > displayCount;

  // Get ending soon events (internal events sorted by eventTime)
  const endingSoonEvents = (eventsData?.data || [])
    .filter((e: any) => e.eventTime && new Date(e.eventTime) > new Date())
    .sort((a: any, b: any) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime())
    .slice(0, 4);

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
                  <h3 className="text-base font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider drop-shadow-sm flex items-center gap-2"><Zap className="w-4 h-4" /> Ending Soon</h3>
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

      {/* Trending Markets */}
      <section className="max-w-7xl mx-auto pb-16">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-positive-500 animate-pulse"></div>
            <h2 className="text-xl font-semibold text-text-primary">Trending</h2>
          </div>
          <Link to="/events" className="btn btn-ghost text-sm">
            View All
          </Link>
        </div>

        {loadingPolymarket ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4">
                <div className="h-32 bg-background-secondary animate-pulse rounded-lg mb-3" />
                <div className="h-4 bg-background-secondary animate-pulse rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {liveMarkets.length === 0 ? (
              <div className="col-span-full text-center py-16 border border-dashed border-border rounded-xl">
                <p className="text-text-muted">No live markets right now.</p>
              </div>
            ) : (
              liveMarkets.map((event: any) => {
                return (
                  <div
                    key={event.id}
                    className="card p-0 overflow-hidden block"
                  >
                    {/* Event Image */}
                    {event.image && (
                      <div className="h-24 bg-gradient-to-br from-positive-100 to-brand-100 relative overflow-hidden">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover opacity-90"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-text-primary line-clamp-2 mb-2">
                        {event.title}
                      </h3>

                      {/* Expiry Date */}
                      {(event.endTime || event.rawData?.endDate) && (
                        <div className="flex items-center gap-1 text-[10px] text-brand-600 font-mono mb-3">
                          <Clock className="w-3 h-3" />
                          Ends: {format(new Date(event.endTime || event.rawData?.endDate), 'MMM dd, yyyy')}
                        </div>
                      )}

                      {/* Probabilities - Polymarket Yes/No Style */}
                      <div className="flex gap-2">
                        {(() => {
                          // Get options - handle both direct options and group market structure
                          let opts = event.options;

                          // If no options, try to get from first market in rawData.markets
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

                          if (!opts || opts.length === 0) {
                            return (
                              <div className="flex-1 text-center p-2 rounded-lg bg-background-secondary text-text-muted text-xs">
                                No data
                              </div>
                            );
                          }

                          return opts.slice(0, 2).map((option: any, idx: number) => {
                            const displayLabel = option.label === 'Yes' || option.label === 'No'
                              ? option.label
                              : (idx === 0 ? 'Yes' : 'No');
                            const percentage = option.percentage ?? Math.round((option.price || 0) * 100);

                            return (
                              <div
                                key={idx}
                                className={clsx(
                                  'flex-1 text-center p-2 rounded-lg text-xs font-bold',
                                  idx === 0
                                    ? 'bg-positive-100 text-positive-700 border border-positive-200'
                                    : 'bg-negative-100 text-negative-600 border border-negative-200'
                                )}
                              >
                                <span className="block text-[10px] text-text-muted mb-0.5">{displayLabel}</span>
                                <span className="text-lg">{percentage}%</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Load More Button */}
        {!loadingPolymarket && allMarkets.length > 0 && (
          <div className="text-center mt-8 space-y-3">
            <p className="text-text-muted text-sm font-mono">
              Showing {liveMarkets.length} of {allMarkets.length} markets
            </p>
            {hasMore && (
              <button
                onClick={() => setDisplayCount(prev => prev + 20)}
                className="btn btn-primary"
              >
                Load More Markets
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
