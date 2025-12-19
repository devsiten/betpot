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
    const sport = c.param('sport');

    try {
        const response = await fetch(
            `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`
        );

        if (!response.ok) {
            throw new Error(`Odds API error: ${response.status}`);
        }

        const events: OddsApiEvent[] = await response.json();

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
    } catch (error) {
        console.error('Odds API error:', error);
        return c.json({ success: false, error: 'Failed to fetch events' }, 500);
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

export { sportsApi };
