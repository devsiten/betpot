import { Hono } from 'hono';
import type { Env } from '../types';

const sportsApi = new Hono<{ Bindings: Env }>();

// ============================================================================
// SIMPLE IN-MEMORY CACHE - 2 minute TTL for faster loading
// ============================================================================
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCached(key: string): any | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCache(key: string, data: any): void {
    cache.set(key, { data, timestamp: Date.now() });
}

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
// API-SPORTS - Get LIVE matches (currently in progress)
// ============================================================================

interface ApiSportsLiveFixture {
    fixture: {
        id: number;
        date: string;
        timestamp: number;
        status: {
            long: string;
            short: string;
            elapsed: number | null;
        };
    };
    league: {
        id: number;
        name: string;
        country: string;
        logo: string;
        flag: string;
    };
    teams: {
        home: { id: number; name: string; logo: string; winner: boolean | null };
        away: { id: number; name: string; logo: string; winner: boolean | null };
    };
    goals: {
        home: number | null;
        away: number | null;
    };
    score: {
        halftime: { home: number | null; away: number | null };
        fulltime: { home: number | null; away: number | null };
        extratime: { home: number | null; away: number | null };
        penalty: { home: number | null; away: number | null };
    };
}

// Get all live matches across all leagues
sportsApi.get('/api-sports/live', async (c) => {
    const apiKey = c.env.API_SPORTS_KEY;
    const limit = parseInt(c.req.query('limit') || '100');

    try {
        const response = await fetch(
            'https://v3.football.api-sports.io/fixtures?live=all',
            {
                headers: {
                    'x-apisports-key': apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`API-Sports error: ${response.status}`);
        }

        const data: any = await response.json();
        const fixtures: ApiSportsLiveFixture[] = data.response || [];

        // Transform to our format with live data
        const transformed = fixtures.slice(0, limit).map(f => ({
            id: `live-${f.fixture.id}`,
            source: 'api-sports-live',
            title: `${f.teams.home.name} vs ${f.teams.away.name}`,
            sport: 'Football',
            league: f.league.name,
            leagueLogo: f.league.logo,
            country: f.league.country,
            countryFlag: f.league.flag,
            homeTeam: f.teams.home.name,
            homeTeamLogo: f.teams.home.logo,
            awayTeam: f.teams.away.name,
            awayTeamLogo: f.teams.away.logo,
            startTime: f.fixture.date,
            // LIVE DATA
            isLive: true,
            status: f.fixture.status.long,
            statusShort: f.fixture.status.short,
            elapsed: f.fixture.status.elapsed, // Current minute (45, 67, 90, etc.)
            homeScore: f.goals.home,
            awayScore: f.goals.away,
            halftimeScore: f.score.halftime,
            // Who's winning
            homeWinning: f.teams.home.winner,
            awayWinning: f.teams.away.winner,
        }));

        return c.json({
            success: true,
            data: transformed,
            total: transformed.length,
            totalAvailable: fixtures.length,
        });
    } catch (error: any) {
        console.error('API-Sports live error:', error);
        return c.json({ success: false, error: error.message || 'Failed to fetch live matches' }, 500);
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

// ============================================================================
// POLYMARKET SPORTS API - Football & Other Sports with Real Odds
// ============================================================================

// Football leagues configuration - ordered by priority
const FOOTBALL_LEAGUES = [
    // Top European Leagues
    { id: '10188', name: 'Premier League', code: 'epl', country: 'England', priority: 1 },
    { id: '10204', name: 'Champions League', code: 'ucl', country: 'Europe', priority: 2 },
    { id: '10193', name: 'La Liga', code: 'lal', country: 'Spain', priority: 3 },
    { id: '10203', name: 'Serie A', code: 'sea', country: 'Italy', priority: 4 },
    { id: '10194', name: 'Bundesliga', code: 'bun', country: 'Germany', priority: 5 },
    { id: '10195', name: 'Ligue 1', code: 'fl1', country: 'France', priority: 6 },
    { id: '10209', name: 'Europa League', code: 'uel', country: 'Europe', priority: 7 },
    { id: '10437', name: 'Conference League', code: 'col', country: 'Europe', priority: 8 },
    // Africa
    { id: '10786', name: 'AFCON', code: 'acn', country: 'Africa', priority: 9 },
    { id: '10240', name: 'CAF Competitions', code: 'caf', country: 'Africa', priority: 10 },
    // Other European
    { id: '10286', name: 'Eredivisie', code: 'ere', country: 'Netherlands', priority: 11 },
    { id: '10330', name: 'Liga Portugal', code: 'por', country: 'Portugal', priority: 12 },
    { id: '10292', name: 'Süper Lig', code: 'tur', country: 'Turkey', priority: 13 },
    { id: '10306', name: 'Russian Premier', code: 'rus', country: 'Russia', priority: 14 },
    // Domestic Cups
    { id: '10307', name: 'FA Cup', code: 'efa', country: 'England', priority: 15 },
    { id: '10230', name: 'EFL Cup', code: 'efl', country: 'England', priority: 16 },
    { id: '10316', name: 'Copa del Rey', code: 'cdr', country: 'Spain', priority: 17 },
    { id: '10317', name: 'DFB-Pokal', code: 'dfb', country: 'Germany', priority: 18 },
    { id: '10315', name: 'Coupe de France', code: 'cde', country: 'France', priority: 19 },
    { id: '10287', name: 'Coppa Italia', code: 'itc', country: 'Italy', priority: 20 },
    // Americas
    { id: '10189', name: 'MLS', code: 'mls', country: 'USA', priority: 21 },
    { id: '10290', name: 'Liga MX', code: 'mex', country: 'Mexico', priority: 22 },
    { id: '10285', name: 'Argentina Liga', code: 'arg', country: 'Argentina', priority: 23 },
    { id: '10359', name: 'Brasileirão', code: 'bra', country: 'Brazil', priority: 24 },
    { id: '10289', name: 'Copa Libertadores', code: 'lib', country: 'South America', priority: 25 },
    { id: '10291', name: 'Copa Sudamericana', code: 'sud', country: 'South America', priority: 26 },
    // Asia
    { id: '10360', name: 'J-League', code: 'jap', country: 'Japan', priority: 27 },
    { id: '10444', name: 'K League', code: 'kor', country: 'South Korea', priority: 28 },
    { id: '10361', name: 'Saudi Pro League', code: 'spl', country: 'Saudi Arabia', priority: 29 },
    { id: '10439', name: 'Chinese Super League', code: 'chi', country: 'China', priority: 30 },
    { id: '10364', name: 'Indian Super League', code: 'ind', country: 'India', priority: 31 },
    // Oceania
    { id: '10438', name: 'A-League', code: 'aus', country: 'Australia', priority: 32 },
];

// Other sports configuration
const OTHER_SPORTS = [
    { id: '10345', name: 'NBA', code: 'nba', type: 'Basketball' },
    { id: '10187', name: 'NFL', code: 'nfl', type: 'American Football' },
    { id: '10346', name: 'NHL', code: 'nhl', type: 'Hockey' },
    { id: '10500', name: 'UFC/MMA', code: 'mma', type: 'Fighting' },
    { id: '10365', name: 'ATP Tennis', code: 'atp', type: 'Tennis' },
    { id: '10366', name: 'WTA Tennis', code: 'wta', type: 'Tennis' },
    { id: '44', name: 'IPL Cricket', code: 'ipl', type: 'Cricket' },
    { id: '10470', name: 'NCAA Basketball', code: 'cbb', type: 'Basketball' },
    { id: '10210', name: 'College Football', code: 'cfb', type: 'American Football' },
];

interface PolymarketSportsEvent {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endDate: string;
    homeTeamName?: string;
    awayTeamName?: string;
    volume: number;
    liquidity: number;
    markets?: Array<{
        id: string;
        question: string;
        slug: string;
        outcomes: string;
        outcomePrices: string;
        sportsMarketType?: string;
        [key: string]: any;
    }>;
    series?: Array<{ id: string; title: string }>;
    tags?: Array<{ label: string }>;
    [key: string]: any;
}

// Helper function to transform Polymarket sports event
function transformSportsEvent(event: PolymarketSportsEvent, leagueName?: string) {
    // Extract H/D/A odds from markets
    let homeOdds = 0, drawOdds = 0, awayOdds = 0;
    let homeMarketId = '', drawMarketId = '', awayMarketId = '';
    const spreads: Array<{ label: string; price: number; line: number }> = [];
    const totals: Array<{ label: string; price: number; line: number }> = [];

    if (event.markets && event.markets.length > 0) {
        for (const market of event.markets) {
            const type = market.sportsMarketType;
            try {
                const prices = JSON.parse(market.outcomePrices || '[]');
                const yesPrice = parseFloat(prices[0] || '0');

                if (type === 'moneyline') {
                    // Determine if this is home, away, or draw
                    const question = market.question.toLowerCase();
                    if (question.includes('draw')) {
                        drawOdds = yesPrice;
                        drawMarketId = market.id;
                    } else if (event.homeTeamName && question.includes(event.homeTeamName.toLowerCase().split(' ')[0])) {
                        homeOdds = yesPrice;
                        homeMarketId = market.id;
                    } else if (event.awayTeamName && question.includes(event.awayTeamName.toLowerCase().split(' ')[0])) {
                        awayOdds = yesPrice;
                        awayMarketId = market.id;
                    }
                } else if (type === 'spreads' && market.line) {
                    spreads.push({
                        label: market.groupItemTitle || `Spread ${market.line}`,
                        price: yesPrice,
                        line: market.line,
                    });
                } else if (type === 'totals' && market.line) {
                    totals.push({
                        label: `O/U ${market.line}`,
                        price: yesPrice,
                        line: market.line,
                    });
                }
            } catch (e) {
                // Skip invalid market data
            }
        }
    }

    return {
        id: event.id,
        source: 'polymarket-sports',
        title: event.title || `${event.homeTeamName} vs ${event.awayTeamName}`,
        homeTeam: event.homeTeamName || '',
        awayTeam: event.awayTeamName || '',
        startTime: event.startTime || event.startDate,
        endTime: event.endDate,
        league: leagueName || event.series?.[0]?.title || '',
        volume: event.volume || 0,
        liquidity: event.liquidity || 0,
        options: [
            {
                label: event.homeTeamName || 'Home',
                type: 'home',
                price: homeOdds,
                percentage: Math.round(homeOdds * 100),
                marketId: homeMarketId,
            },
            {
                label: 'Draw',
                type: 'draw',
                price: drawOdds,
                percentage: Math.round(drawOdds * 100),
                marketId: drawMarketId,
            },
            {
                label: event.awayTeamName || 'Away',
                type: 'away',
                price: awayOdds,
                percentage: Math.round(awayOdds * 100),
                marketId: awayMarketId,
            },
        ],
        spreads,
        totals,
        rawData: event,
    };
}

// Get all available sports leagues (football prioritized)
sportsApi.get('/polymarket/sports/leagues', async (c) => {
    try {
        return c.json({
            success: true,
            data: {
                football: FOOTBALL_LEAGUES,
                other: OTHER_SPORTS,
            },
        });
    } catch (error: any) {
        console.error('Error fetching leagues:', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// Get events for a specific league by series ID
// Uses The Odds API for Champions League (10204) and Europa League (10209)
// Uses Polymarket for all other leagues
sportsApi.get('/polymarket/sports/league/:seriesId', async (c) => {
    const seriesId = c.req.param('seriesId');
    const limit = parseInt(c.req.query('limit') || '50');
    const apiKey = c.env.THE_ODDS_API_KEY;

    try {
        // Check if this is UCL, Europa, or Conference League - use The Odds API
        const oddsApiMapping: Record<string, { key: string; name: string }> = {
            '10204': { key: 'soccer_uefa_champs_league', name: 'Champions League' },
            '10209': { key: 'soccer_uefa_europa_league', name: 'Europa League' },
            '10437': { key: 'soccer_uefa_europa_conference_league', name: 'Conference League' },
        };

        if (oddsApiMapping[seriesId]) {
            // Fetch from The Odds API
            const league = oddsApiMapping[seriesId];
            const response = await fetch(
                `https://api.the-odds-api.com/v4/sports/${league.key}/events?apiKey=${apiKey}`
            );

            if (!response.ok) {
                // Fallback to Polymarket if Odds API fails
                console.log(`Odds API failed for ${league.name}, falling back to Polymarket`);
            } else {
                const events: any[] = await response.json();
                const now = new Date();

                const transformed = events
                    .filter(e => new Date(e.commence_time) > now)
                    .map(event => ({
                        id: `odds-${event.id}`,
                        source: 'odds-api',
                        title: `${event.home_team} vs ${event.away_team}`,
                        homeTeam: event.home_team,
                        awayTeam: event.away_team,
                        startTime: event.commence_time,
                        league: league.name,
                        volume: 0,
                        liquidity: 0,
                        options: [
                            { label: event.home_team, type: 'home', price: 0, percentage: 33, marketId: '' },
                            { label: 'Draw', type: 'draw', price: 0, percentage: 33, marketId: '' },
                            { label: event.away_team, type: 'away', price: 0, percentage: 33, marketId: '' },
                        ],
                    }))
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .slice(0, limit);

                return c.json({
                    success: true,
                    data: transformed,
                    league: league.name,
                    total: transformed.length,
                    source: 'odds-api',
                });
            }
        }

        // Default: Fetch from Polymarket
        const response = await fetch(
            `https://gamma-api.polymarket.com/events?limit=${limit}&active=true&closed=false&series_id=${seriesId}`
        );

        if (!response.ok) {
            throw new Error(`Polymarket API error: ${response.status}`);
        }

        const events: PolymarketSportsEvent[] = await response.json();

        // Find league name
        const league = FOOTBALL_LEAGUES.find(l => l.id === seriesId) || OTHER_SPORTS.find(s => s.id === seriesId);
        const leagueName = league?.name || '';

        // Filter out past events and deduplicate
        const now = new Date();
        const seenMatches = new Set<string>();

        const transformed = events
            .filter(e => {
                const startTime = e.startTime || e.endDate;
                if (startTime && new Date(startTime) < now) return false;
                // Skip "More Markets" variants
                if (e.title?.includes('More Markets')) return false;
                return true;
            })
            .map(e => transformSportsEvent(e, leagueName))
            .filter(e => {
                // Deduplicate by team matchup
                const home = (e.homeTeam || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const away = (e.awayTeam || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                if (home && away) {
                    const matchKey = [home, away].sort().join('_vs_');
                    if (seenMatches.has(matchKey)) return false;
                    seenMatches.add(matchKey);
                }
                return true;
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        return c.json({
            success: true,
            data: transformed,
            league: leagueName,
            total: transformed.length,
            source: 'polymarket',
        });
    } catch (error: any) {
        console.error('Sports API error:', error);
        return c.json({ success: false, error: error.message || 'Failed to fetch events' }, 500);
    }
});


// Get ALL sports events across all leagues (football + other sports)
// HYBRID: Champions League + Europa League from The Odds API, others from Polymarket
// Sort by: SOONEST EVENTS FIRST (by startTime)
sportsApi.get('/polymarket/sports/football/all', async (c) => {
    const limit = parseInt(c.req.query('limit') || '100');
    const apiKey = c.env.THE_ODDS_API_KEY;

    // Check cache first for fast response
    const cacheKey = `football-all-${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
        return c.json(cached);
    }

    try {
        // ========== PART 1: Fetch UCL + Europa + Conference League from The Odds API ==========
        const oddsApiLeagues = [
            { key: 'soccer_uefa_champs_league', name: 'Champions League' },
            { key: 'soccer_uefa_europa_league', name: 'Europa League' },
            { key: 'soccer_uefa_europa_conference_league', name: 'Conference League' },
        ];

        const oddsApiPromises = oddsApiLeagues.map(async (league) => {
            try {
                const response = await fetch(
                    `https://api.the-odds-api.com/v4/sports/${league.key}/events?apiKey=${apiKey}`
                );
                if (!response.ok) return [];
                const events: any[] = await response.json();

                // Transform Odds API format to our format
                return events.map(event => ({
                    id: `odds-${event.id}`,
                    source: 'odds-api',
                    title: `${event.home_team} vs ${event.away_team}`,
                    homeTeam: event.home_team,
                    awayTeam: event.away_team,
                    startTime: event.commence_time,
                    league: league.name,
                    volume: 0,
                    liquidity: 0,
                    options: [
                        { label: event.home_team, type: 'home', price: 0, percentage: 33, marketId: '' },
                        { label: 'Draw', type: 'draw', price: 0, percentage: 33, marketId: '' },
                        { label: event.away_team, type: 'away', price: 0, percentage: 33, marketId: '' },
                    ],
                }));
            } catch {
                return [];
            }
        });

        // ========== PART 2: Fetch all other leagues from Polymarket ==========
        // Exclude UCL (10204), Europa (10209), Conference (10437) since we get them from Odds API
        const polymarketSources = [...FOOTBALL_LEAGUES, ...OTHER_SPORTS].filter(
            s => s.id !== '10204' && s.id !== '10209' && s.id !== '10437'
        );

        const polymarketPromises = polymarketSources.map(async (source) => {
            try {
                const response = await fetch(
                    `https://gamma-api.polymarket.com/events?limit=30&active=true&closed=false&series_id=${source.id}`
                );
                if (!response.ok) return [];
                const events: PolymarketSportsEvent[] = await response.json();
                return events.map(e => transformSportsEvent(e, source.name));
            } catch {
                return [];
            }
        });

        // ========== Fetch all in parallel ==========
        const [oddsResults, polyResults] = await Promise.all([
            Promise.all(oddsApiPromises),
            Promise.all(polymarketPromises),
        ]);

        const allEvents = [...oddsResults.flat(), ...polyResults.flat()];

        // Current time for filtering
        const now = new Date();

        // ========== ENHANCED DEDUPLICATION ==========
        const seenIds = new Set<string>();
        const seenMatches = new Set<string>();

        const normalizeTeam = (name: string): string => {
            return name
                .toLowerCase()
                .replace(/fc|afc|sc|cf|ac$/gi, '')
                .replace(/^fc|^afc|^sc|^cf|^ac/gi, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();
        };

        const getMatchKey = (event: any): string => {
            const home = normalizeTeam(event.homeTeam || '');
            const away = normalizeTeam(event.awayTeam || '');
            return [home, away].sort().join('_vs_');
        };

        const uniqueEvents = allEvents.filter(e => {
            if (seenIds.has(e.id)) return false;
            seenIds.add(e.id);

            const matchKey = getMatchKey(e);
            if (matchKey && matchKey !== '_vs_') {
                if (seenMatches.has(matchKey)) return false;
                seenMatches.add(matchKey);
            }

            return true;
        });

        // Filter out past events and sort by SOONEST FIRST
        const sorted = uniqueEvents
            .filter(e => new Date(e.startTime) > now)
            .sort((a: any, b: any) => {
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            })
            .slice(0, limit);

        // Cache the response for faster subsequent loads
        const response = {
            success: true,
            data: sorted,
            total: sorted.length,
            totalAvailable: uniqueEvents.length,
        };
        setCache(cacheKey, response);

        return c.json(response);
    } catch (error: any) {
        console.error('Sports API error:', error);
        return c.json({ success: false, error: error.message || 'Failed to fetch events' }, 500);
    }
});



// Get trending sports events (for home page - sports first)
sportsApi.get('/polymarket/sports/trending', async (c) => {
    const limit = parseInt(c.req.query('limit') || '20');

    try {
        // Fetch football from top leagues
        const topFootballLeagues = ['10188', '10204', '10193', '10203']; // EPL, UCL, La Liga, Serie A

        const fetchPromises = topFootballLeagues.map(async (seriesId) => {
            try {
                const response = await fetch(
                    `https://gamma-api.polymarket.com/events?limit=5&active=true&closed=false&series_id=${seriesId}`
                );
                if (!response.ok) return [];
                const events: PolymarketSportsEvent[] = await response.json();
                const league = FOOTBALL_LEAGUES.find(l => l.id === seriesId);
                return events
                    .filter(e => e.homeTeamName && e.awayTeamName)
                    .map(e => transformSportsEvent(e, league?.name));
            } catch {
                return [];
            }
        });

        const results = await Promise.all(fetchPromises);
        const allEvents = results.flat();

        // DEDUPLICATE by ID and normalized match title
        const seenIds = new Set<string>();
        const seenMatches = new Set<string>();

        const normalizeTeam = (name: string): string => {
            return name
                .toLowerCase()
                .replace(/fc|afc|sc|cf|ac$/gi, '')
                .replace(/^fc|^afc|^sc|^cf|^ac/gi, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();
        };

        const getMatchKey = (event: any): string => {
            const home = normalizeTeam(event.homeTeam || '');
            const away = normalizeTeam(event.awayTeam || '');
            return [home, away].sort().join('_vs_');
        };

        const uniqueEvents = allEvents.filter(e => {
            if (seenIds.has(e.id)) return false;
            seenIds.add(e.id);

            const matchKey = getMatchKey(e);
            if (matchKey && matchKey !== '_vs_') {
                if (seenMatches.has(matchKey)) return false;
                seenMatches.add(matchKey);
            }

            return true;
        });

        // Sort by volume (highest first for trending) then by start time
        const sorted = uniqueEvents
            .sort((a, b) => {
                // Prioritize events happening soon with high volume
                const volumeDiff = (b.volume || 0) - (a.volume || 0);
                if (Math.abs(volumeDiff) > 10000) return volumeDiff;
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            })
            .slice(0, limit);

        return c.json({
            success: true,
            data: sorted,
            total: sorted.length,
            type: 'trending',
        });
    } catch (error: any) {
        console.error('Polymarket sports API error:', error);
        return c.json({ success: false, error: error.message || 'Failed to fetch events' }, 500);
    }
});


// Get other sports events (NBA, NFL, UFC, etc.)
sportsApi.get('/polymarket/sports/other/:sportCode', async (c) => {
    const sportCode = c.req.param('sportCode');
    const limit = parseInt(c.req.query('limit') || '20');

    // Find the sport
    const sport = OTHER_SPORTS.find(s => s.code === sportCode);
    if (!sport) {
        return c.json({ success: false, error: 'Sport not found' }, 404);
    }

    try {
        const response = await fetch(
            `https://gamma-api.polymarket.com/events?limit=${limit}&active=true&closed=false&series_id=${sport.id}`
        );

        if (!response.ok) {
            throw new Error(`Polymarket API error: ${response.status}`);
        }

        const events: PolymarketSportsEvent[] = await response.json();

        // Transform events (some sports don't have draw option)
        const transformed = events
            .filter(e => e.homeTeamName && e.awayTeamName)
            .map(e => {
                const base = transformSportsEvent(e, sport.name);
                // Remove draw option for sports that don't have draws
                if (['nba', 'nfl', 'nhl', 'mma', 'atp', 'wta'].includes(sportCode)) {
                    base.options = base.options.filter(o => o.type !== 'draw');
                }
                return base;
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        return c.json({
            success: true,
            data: transformed,
            sport: sport.name,
            total: transformed.length,
        });
    } catch (error: any) {
        console.error('Polymarket sports API error:', error);
        return c.json({ success: false, error: error.message || 'Failed to fetch events' }, 500);
    }
});

export { sportsApi };

