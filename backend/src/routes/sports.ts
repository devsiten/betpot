import { Hono } from 'hono';
import type { Env } from '../types';

const sportsApi = new Hono<{ Bindings: Env }>();

// ============================================================================
// THE ODDS API - Get upcoming sports events with odds
// ============================================================================

interface OddsApiEvent {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers?: Array<{
        key: string;
        title: string;
        markets: Array<{
            key: string;
            outcomes: Array<{
                name: string;
                price: number;
            }>;
        }>;
    }>;
}

// Get list of available sports
sportsApi.get('/odds-api/sports', async (c) => {
    const apiKey = c.env.THE_ODDS_API_KEY;

    try {
        const response = await fetch(
            `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`Odds API error: ${response.status}`);
        }

        const sports = await response.json();
        return c.json({ success: true, data: sports });
    } catch (error) {
        console.error('Odds API error:', error);
        return c.json({ success: false, error: 'Failed to fetch sports' }, 500);
    }
});

// Get upcoming events for a sport
sportsApi.get('/odds-api/events/:sport', async (c) => {
    const apiKey = c.env.THE_ODDS_API_KEY;
    const sport = c.req.param('sport');

    try {
        // Use the simple events endpoint (works with free tier)
        const url = `https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${apiKey}`;
        console.log('Fetching from:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Odds API error response:', response.status, errorText);
            return c.json({ success: false, error: `API error: ${response.status}` }, 500);
        }

        const events: OddsApiEvent[] = await response.json();
        console.log('Got events:', events.length);

        // Transform to our format
        const transformed = events.map(event => ({
            id: event.id,
            source: 'odds-api',
            title: `${event.home_team} vs ${event.away_team}`,
            sport: event.sport_title,
            sportKey: event.sport_key,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            startTime: event.commence_time,
            options: [
                { label: event.home_team, type: 'home' },
                { label: event.away_team, type: 'away' },
                { label: 'Draw', type: 'draw' },
            ],
            rawData: event,
        }));

        return c.json({ success: true, data: transformed });
    } catch (error: any) {
        console.error('Odds API error:', error);
        return c.json({ success: false, error: error.message || 'Failed to fetch events' }, 500);
    }
});

// ============================================================================
// API-SPORTS - Get football/soccer fixtures
// ============================================================================

interface ApiSportsFixture {
    fixture: {
        id: number;
        date: string;
        status: { long: string };
    };
    league: {
        id: number;
        name: string;
        country: string;
        logo: string;
    };
    teams: {
        home: { id: number; name: string; logo: string };
        away: { id: number; name: string; logo: string };
    };
    goals: {
        home: number | null;
        away: number | null;
    };
}

// Get list of available leagues
sportsApi.get('/api-sports/leagues', async (c) => {
    const apiKey = c.env.API_SPORTS_KEY;

    try {
        const response = await fetch(
            'https://v3.football.api-sports.io/leagues?current=true',
            {
                headers: {
                    'x-apisports-key': apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`API-Sports error: ${response.status}`);
        }

        const data = await response.json();
        return c.json({ success: true, data: data.response });
    } catch (error) {
        console.error('API-Sports error:', error);
        return c.json({ success: false, error: 'Failed to fetch leagues' }, 500);
    }
});

// Get upcoming fixtures for a league
sportsApi.get('/api-sports/fixtures/:leagueId', async (c) => {
    const apiKey = c.env.API_SPORTS_KEY;
    const leagueId = c.param('leagueId');

    // Get fixtures for next 7 days
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
        const response = await fetch(
            `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2024&from=${today}&to=${nextWeek}`,
            {
                headers: {
                    'x-apisports-key': apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`API-Sports error: ${response.status}`);
        }

        const data = await response.json();
        const fixtures: ApiSportsFixture[] = data.response;

        // Transform to our format
        const transformed = fixtures.map(f => ({
            id: `apisports-${f.fixture.id}`,
            source: 'api-sports',
            title: `${f.teams.home.name} vs ${f.teams.away.name}`,
            sport: 'Football',
            league: f.league.name,
            leagueLogo: f.league.logo,
            homeTeam: f.teams.home.name,
            homeTeamLogo: f.teams.home.logo,
            awayTeam: f.teams.away.name,
            awayTeamLogo: f.teams.away.logo,
            startTime: f.fixture.date,
            status: f.fixture.status.long,
            options: [
                { label: f.teams.home.name, type: 'home' },
                { label: f.teams.away.name, type: 'away' },
                { label: 'Draw', type: 'draw' },
            ],
            rawData: f,
        }));

        return c.json({ success: true, data: transformed });
    } catch (error) {
        console.error('API-Sports error:', error);
        return c.json({ success: false, error: 'Failed to fetch fixtures' }, 500);
    }
});

// ============================================================================
// COMBINED - Search across all sources
// ============================================================================

sportsApi.get('/search', async (c) => {
    const query = c.query('q') || '';
    const sport = c.query('sport') || 'soccer_epl'; // Default to EPL
    const apiKey = c.env.THE_ODDS_API_KEY;

    try {
        const response = await fetch(
            `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${apiKey}&regions=us&markets=h2h`
        );

        if (!response.ok) {
            return c.json({ success: true, data: [] });
        }

        const events: OddsApiEvent[] = await response.json();

        // Filter by query if provided
        const filtered = query
            ? events.filter(e =>
                e.home_team.toLowerCase().includes(query.toLowerCase()) ||
                e.away_team.toLowerCase().includes(query.toLowerCase())
            )
            : events;

        const transformed = filtered.slice(0, 20).map(event => ({
            id: event.id,
            source: 'odds-api',
            title: `${event.home_team} vs ${event.away_team}`,
            sport: event.sport_title,
            sportKey: event.sport_key,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            startTime: event.commence_time,
            options: [
                { label: event.home_team, type: 'home' },
                { label: event.away_team, type: 'away' },
                { label: 'Draw', type: 'draw' },
            ],
        }));

        return c.json({ success: true, data: transformed });
    } catch (error) {
        console.error('Search error:', error);
        return c.json({ success: true, data: [] });
    }
});

// ============================================================================
// POLYMARKET API - Crypto, Politics, Sports Prediction Markets
// ============================================================================

interface PolymarketEvent {
    id: string;
    title: string;
    slug: string;
    description: string;
    startDate: string;
    endDate: string;
    image: string;
    icon: string;
    active: boolean;
    closed: boolean;
    liquidity: number;
    volume: number;
    outcomes?: string[];
    outcomePrices?: string[];
    tags?: { id: string; label: string; slug: string }[];
    // For group markets, options are nested inside markets array
    markets?: Array<{
        id: string;
        question: string;
        slug: string;
        outcomes: string;
        outcomePrices: string;
        [key: string]: any;
    }>;
}

// Get all Polymarket events
sportsApi.get('/polymarket/events', async (c) => {
    try {
        const response = await fetch(
            'https://gamma-api.polymarket.com/events?closed=false&limit=100'
        );

        if (!response.ok) {
            throw new Error(`Polymarket API error: ${response.status}`);
        }

        const events: PolymarketEvent[] = await response.json();

        // Transform to our format
        const transformed = events.map(event => {
            // Try to get options from top-level first
            let options: Array<{ label: string; price: number; percentage: number }> = [];

            if (event.outcomes && event.outcomes.length > 0 && event.outcomePrices && event.outcomePrices.length > 0) {
                // Top-level outcomes (simple binary markets)
                options = event.outcomes.map((outcome, i) => ({
                    label: outcome,
                    price: parseFloat(event.outcomePrices?.[i] || '0'),
                    percentage: Math.round(parseFloat(event.outcomePrices?.[i] || '0') * 100),
                }));
            } else if (event.markets && event.markets.length > 0) {
                // Try to get from first market (group markets have nested data)
                const firstMarket = event.markets[0];
                if (firstMarket.outcomes && firstMarket.outcomePrices) {
                    try {
                        const outcomes = JSON.parse(firstMarket.outcomes);
                        const prices = JSON.parse(firstMarket.outcomePrices);
                        options = outcomes.map((label: string, i: number) => ({
                            label,
                            price: parseFloat(prices[i] || '0'),
                            percentage: Math.round(parseFloat(prices[i] || '0') * 100),
                        }));
                    } catch (e) {
                        // Parsing failed, leave options empty
                    }
                }
            }

            return {
                id: event.id,
                source: 'polymarket',
                title: event.title,
                description: event.description,
                image: event.image || event.icon,
                startTime: event.startDate,
                endTime: event.endDate,
                volume: event.volume,
                liquidity: event.liquidity,
                active: event.active,
                options,
                tags: event.tags?.map(t => t.label) || [],
                rawData: event,
            };
        });

        return c.json({ success: true, data: transformed });
    } catch (error: any) {
        console.error('Polymarket API error:', error);
        return c.json({ success: false, error: error.message || 'Failed to fetch events' }, 500);
    }
});

// Get Polymarket events by category
sportsApi.get('/polymarket/events/:category', async (c) => {
    const category = c.req.param('category');

    try {
        const response = await fetch(
            'https://gamma-api.polymarket.com/events?closed=false&limit=200'
        );

        if (!response.ok) {
            throw new Error(`Polymarket API error: ${response.status}`);
        }

        const allEvents: PolymarketEvent[] = await response.json();

        // Strict category filtering - more comprehensive keywords
        const categoryKeywords: Record<string, string[]> = {
            crypto: [
                'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'sol',
                'token', 'coin', 'defi', 'blockchain', 'binance', 'coinbase',
                'dogecoin', 'doge', 'xrp', 'ripple', 'cardano', 'ada', 'polygon',
                'matic', 'avalanche', 'avax', 'chainlink', 'link', 'litecoin',
                'ltc', 'shiba', 'pepe', 'meme coin', 'nft', 'web3', 'dao',
                'stablecoin', 'usdc', 'usdt', 'tether', 'mining', 'halving'
            ],
            politics: [
                'election', 'trump', 'biden', 'president', 'congress', 'senate',
                'vote', 'political', 'government', 'republican', 'democrat',
                'governor', 'mayor', 'parliament', 'prime minister', 'cabinet',
                'impeach', 'bill', 'legislation', 'poll', 'ballot', 'campaign',
                'nominee', 'candidate', 'party', 'conservative', 'liberal',
                'left', 'right', 'swing state', 'electoral', 'gop', 'dnc', 'rnc',
                'harris', 'pence', 'obama', 'desantis', 'newsom', 'pelosi',
                'mcconnell', 'schumer', 'vance', 'walz'
            ],
            sports: [
                // US Sports
                'nfl', 'nba', 'mlb', 'nhl', 'mls', 'hockey', 'football', 'basketball',
                'baseball', 'soccer', 'super bowl', 'championship', 'playoff',
                'world cup', 'olympics', 'world series', 'stanley cup',
                // European Football
                'uefa', 'fifa', 'premier league', 'epl', 'la liga', 'bundesliga',
                'serie a', 'ligue 1', 'eredivisie', 'champions league', 'europa league',
                // Specific Clubs & Players
                'manchester', 'liverpool', 'arsenal', 'chelsea', 'tottenham',
                'real madrid', 'barcelona', 'bayern', 'psg', 'juventus', 'inter', 'milan',
                'dortmund', 'napoli', 'roma', 'atlanta', 'fiorentina', 'lazio',
                'lyon', 'marseille', 'monaco', 'lille',
                // Other Sports
                'tennis', 'golf', 'boxing', 'ufc', 'mma', 'f1', 'formula 1',
                'nascar', 'pga', 'wimbledon', 'us open', 'masters', 'march madness',
                'cricket', 'rugby', 'afl', 'nrl'
            ],
            entertainment: [
                'movie', 'tv', 'oscar', 'grammy', 'emmy', 'celebrity', 'film',
                'music', 'album', 'box office', 'netflix', 'disney', 'hbo',
                'streaming', 'billboard', 'concert', 'tour', 'award', 'golden globe',
                'bafta', 'mtv', 'vma', 'bet', 'hollywood', 'actor', 'actress',
                'singer', 'rapper', 'band', 'taylor swift', 'drake', 'beyonce',
                'kanye', 'rihanna', 'kardashian', 'youtube', 'tiktok', 'viral',
                'grammy', 'spotify', 'apple music'
            ],
            finance: [
                'stock', 'fed', 'interest rate', 'inflation', 'gdp', 'recession',
                'market', 'dow', 'nasdaq', 's&p', 'treasury', 'bond', 'yield',
                'federal reserve', 'jerome powell', 'janet yellen', 'rate cut',
                'rate hike', 'cpi', 'ppi', 'unemployment', 'jobs', 'payroll',
                'earnings', 'ipo', 'merger', 'acquisition', 'wall street', 'nyse',
                'sec', 'bank', 'banking', 'credit', 'debt', 'deficit', 'tariff'
            ],
            news: [
                // Breaking news keywords - current events, world affairs
                'breaking', 'news', 'update', 'announce', 'report', 'confirm',
                'war', 'peace', 'treaty', 'sanctions', 'crisis', 'disaster',
                'earthquake', 'hurricane', 'flood', 'fire', 'attack', 'explosion',
                'arrest', 'investigation', 'scandal', 'controversy', 'lawsuit',
                'trial', 'verdict', 'court', 'judge', 'fbi', 'cia', 'pentagon',
                'white house', 'united nations', 'nato', 'eu', 'uk', 'china',
                'russia', 'ukraine', 'israel', 'gaza', 'iran', 'north korea'
            ],
        };

        const keywords = categoryKeywords[category.toLowerCase()] || [];

        // Pagination support
        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam ? parseInt(limitParam) : 100;
        const offset = offsetParam ? parseInt(offsetParam) : 0;

        let filtered: PolymarketEvent[];

        // Special handling for 'latest' category - events ending within 1 week
        if (category.toLowerCase() === 'latest') {
            const oneWeekFromNow = new Date();
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

            filtered = allEvents.filter(event => {
                if (!event.endDate) return false;
                const endDate = new Date(event.endDate);
                return endDate >= new Date() && endDate <= oneWeekFromNow;
            }).sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());
        }
        // If no keywords (unknown category), return all events sorted by volume
        else if (keywords.length === 0) {
            filtered = allEvents.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        }
        // STRICT filtering - match TITLE ONLY (not description) for accurate categorization
        else {
            filtered = allEvents.filter(event => {
                const titleLower = event.title.toLowerCase();
                const tags = event.tags?.map(t => t.label.toLowerCase()).join(' ') || '';
                // Only check title and tags, NOT description (to avoid false matches)
                const combined = `${titleLower} ${tags}`;

                return keywords.some(keyword => combined.includes(keyword));
            });
        }

        // Apply pagination
        const paginatedEvents = filtered.slice(offset, offset + limit);
        const hasMore = offset + limit < filtered.length;

        // Transform to our format - only show events that truly match the category
        const transformed = paginatedEvents.map(event => {
            // Try to get options from top-level first
            let options: Array<{ label: string; price: number; percentage: number }> = [];

            if (event.outcomes && event.outcomes.length > 0 && event.outcomePrices && event.outcomePrices.length > 0) {
                // Top-level outcomes (simple binary markets)
                options = event.outcomes.map((outcome, i) => ({
                    label: outcome,
                    price: parseFloat(event.outcomePrices?.[i] || '0'),
                    percentage: Math.round(parseFloat(event.outcomePrices?.[i] || '0') * 100),
                }));
            } else if (event.markets && event.markets.length > 0) {
                // Try to get from first market (group markets have nested data)
                const firstMarket = event.markets[0];
                if (firstMarket.outcomes && firstMarket.outcomePrices) {
                    try {
                        const outcomes = JSON.parse(firstMarket.outcomes);
                        const prices = JSON.parse(firstMarket.outcomePrices);
                        options = outcomes.map((label: string, i: number) => ({
                            label,
                            price: parseFloat(prices[i] || '0'),
                            percentage: Math.round(parseFloat(prices[i] || '0') * 100),
                        }));
                    } catch (e) {
                        // Parsing failed, leave options empty
                    }
                }
            }

            return {
                id: event.id,
                source: 'polymarket',
                category: category,
                title: event.title,
                description: event.description,
                image: event.image || event.icon,
                startTime: event.startDate,
                endTime: event.endDate,
                volume: event.volume,
                liquidity: event.liquidity,
                active: event.active,
                options,
                tags: event.tags?.map(t => t.label) || [],
                rawData: event,  // Include full event data for frontend fallback
            };
        });

        return c.json({
            success: true,
            data: transformed,
            total: transformed.length,
            totalFiltered: filtered.length,
            hasMore,
            offset,
            limit,
        });
    } catch (error: any) {
        console.error('Polymarket API error:', error);
        return c.json({ success: false, error: error.message || 'Failed to fetch events' }, 500);
    }
});

export { sportsApi };
