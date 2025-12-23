import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Zap, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import clsx from 'clsx';

export function HomePage() {
  const [displayCount, setDisplayCount] = useState(40);

  // Fetch all Polymarket events for Trending section with auto-refresh
  const { data: polymarketData, isLoading: loadingPolymarket } = useQuery({
    queryKey: ['polymarket-all'],
    queryFn: () => api.getPolymarketEvents(), // Get all events
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });



  const { data: jackpotData } = useQuery({
    queryKey: ['jackpot'],
    queryFn: () => api.getJackpot(),
  });

  const allMarkets = polymarketData?.data || [];
  const liveMarkets = allMarkets.slice(0, displayCount);
  const hasMore = allMarkets.length > displayCount;
  const jackpot = jackpotData?.data;

  return (
    <div className="pt-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden mb-8">
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            {/* Left - Hero Text */}
            <div className="flex-1 text-left">
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
                <span className="text-text-primary">Bet on What</span>
                <br />
                <span className="gradient-text">You Believe In</span>
              </h1>
              <p className="text-lg text-text-secondary max-w-xl mb-6">
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

            {/* Right - How It Works Visual */}
            <div className="flex-1 max-w-md">
              <div className="bg-background-card rounded-2xl p-5 border border-border shadow-card">
                <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider mb-4">How It Works</h3>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-positive-100 flex items-center justify-center flex-shrink-0 border border-positive-200">
                      <span className="text-positive-600 font-bold text-lg">1</span>
                    </div>
                    <div>
                      <h4 className="text-text-primary font-semibold text-sm">Browse Markets</h4>
                      <p className="text-text-muted text-xs mt-0.5">Explore trending events. These feed into our Jackpot picks.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0 border border-brand-200">
                      <span className="text-brand-600 font-bold text-lg">2</span>
                    </div>
                    <div>
                      <h4 className="text-text-primary font-semibold text-sm">Place Your Bet</h4>
                      <p className="text-text-muted text-xs mt-0.5">Go to Jackpot, pick your outcome, and buy tickets.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-positive-100 flex items-center justify-center flex-shrink-0 border border-positive-200">
                      <span className="text-positive-600 font-bold text-lg">3</span>
                    </div>
                    <div>
                      <h4 className="text-text-primary font-semibold text-sm">Collect Winnings</h4>
                      <p className="text-text-muted text-xs mt-0.5">If you win, claim your share from the prize pool!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JACKPOT SECTION */}
      {jackpot && (
        <section className="max-w-7xl mx-auto mb-12">
          <div className="relative overflow-hidden rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 via-background-card to-brand-50 shadow-card">
            <div className="relative p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Jackpot Header */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-soft">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-brand-600 text-xs font-medium">🔥 Featured Match</span>
                        <span className="badge badge-success">Live</span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-semibold text-text-primary mt-1">{jackpot.title}</h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-brand-500" />
                      {format(new Date(jackpot.eventTime), 'MMM dd, HH:mm')}
                    </span>
                    <span>|</span>
                    <span>{jackpot.ticketCount || 0} bets placed</span>
                  </div>
                </div>

                {/* Jackpot Pool */}
                <div className="text-center lg:text-right">
                  <p className="text-xs font-medium text-brand-600 mb-1">Total Prize Pool</p>
                  <p className="text-3xl md:text-4xl font-bold text-text-primary">
                    ${(jackpot.totalPool || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                {jackpot.options?.map((option) => (
                  <div
                    key={option.id}
                    className="p-4 rounded-lg bg-background border border-brand-100 hover:border-brand-300 transition-all cursor-pointer group"
                  >
                    <p className="text-text-primary font-medium group-hover:text-brand-600 transition-colors">{option.label}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-text-muted">{option.ticketsSold || 0} bets</span>
                      <span className="text-lg font-semibold text-brand-600">${option.poolAmount?.toFixed(0) || 0}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-6 flex justify-center">
                <Link
                  to={`/events/${jackpot.id}`}
                  className="btn btn-primary"
                >
                  <Trophy className="w-4 h-4" />
                  Place Your Bet
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Ending Soon - Jackpot Events Only */}
      {jackpot && (
        <section className="max-w-7xl mx-auto pb-8">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-positive-600" />
              <h3 className="text-lg font-bold text-text-primary">Ending Soon</h3>
              <span className="badge badge-warning text-xs">Jackpot</span>
            </div>
            <Link
              to={`/events/${jackpot.id}`}
              className="block p-4 bg-background-secondary rounded-lg border border-brand-100 hover:border-brand-300 transition-all cursor-pointer"
            >
              <p className="text-base text-text-primary font-medium">{jackpot.title}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  {jackpot.options?.slice(0, 2).map((opt: any, idx: number) => (
                    <span key={idx} className={clsx('text-xs font-bold', idx === 0 ? 'text-positive-600' : 'text-negative-500')}>
                      {opt.label}: ${opt.poolAmount?.toFixed(0) || 0}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-text-muted">
                  {format(new Date(jackpot.eventTime), 'MMM dd, HH:mm')}
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

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
                  <Link
                    key={event.id}
                    to={`/events/${event.id}/chat`}
                    className="card card-hover p-0 group overflow-hidden block cursor-pointer"
                  >
                    {/* Event Image */}
                    {event.image && (
                      <div className="h-24 bg-gradient-to-br from-positive-100 to-brand-100 relative overflow-hidden">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-text-primary group-hover:text-brand-600 transition-colors line-clamp-2 mb-2">
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
                  </Link>
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
