import { Hono } from 'hono';
import type { AppContext } from '../types';

export const newsRoutes = new Hono<AppContext>();

// NewsData.io API key for general news
const NEWSDATA_API_KEY = 'pub_75eb09e27965435aa9b07ff9eb72fe92';

interface NewsArticle {
    id: string;
    title: string;
    description: string;
    content: string;
    imageUrl: string | null;
    source: string;
    category: string;
    publishedAt: string;
    url: string;
}

// RSS Feed URLs (no API key needed - completely free!)
const RSS_FEEDS = {
    football: [
        { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN' },
        { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
        { url: 'https://www.skysports.com/rss/12040', source: 'Sky Sports' },
    ],
    sports: [
        { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN' },
        { url: 'https://feeds.bbci.co.uk/sport/rss.xml', source: 'BBC Sport' },
    ],
};

// Simple XML parser for RSS feeds
function parseRSSItems(xml: string, source: string, category: string): NewsArticle[] {
    const articles: NewsArticle[] = [];

    // Extract items using regex (works in Cloudflare Workers without XML parser)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let index = 0;

    while ((match = itemRegex.exec(xml)) !== null && index < 20) {
        const itemContent = match[1];

        // Extract title
        const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';

        // Extract link - try multiple patterns
        let url = '';
        // Pattern 1: <link>URL</link> or <link><![CDATA[URL]]></link>
        const linkMatch1 = itemContent.match(/<link>([^<]+)<\/link>/);
        if (linkMatch1) url = linkMatch1[1].trim();

        // Pattern 2: CDATA in link
        if (!url) {
            const linkMatch2 = itemContent.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/);
            if (linkMatch2) url = linkMatch2[1].trim();
        }

        // Pattern 3: guid as fallback (often contains the URL)
        if (!url) {
            const guidMatch = itemContent.match(/<guid[^>]*>([^<]+)<\/guid>/);
            if (guidMatch && guidMatch[1].startsWith('http')) url = guidMatch[1].trim();
        }

        // Pattern 4: Look for any http URL in the item
        if (!url) {
            const anyUrlMatch = itemContent.match(/>(https?:\/\/[^\s<>"]+)</);
            if (anyUrlMatch) url = anyUrlMatch[1].trim();
        }

        // Extract description
        const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s);
        let description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';
        // Remove HTML tags from description
        description = description.replace(/<[^>]*>/g, '').substring(0, 300);

        // Extract pubDate
        const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
        const publishedAt = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

        // Extract image - try multiple patterns
        let imageUrl: string | null = null;

        // Pattern 1: media:content with url attribute
        const mediaContentMatch = itemContent.match(/<media:content[^>]+url="([^"]+)"/i);
        if (mediaContentMatch) imageUrl = mediaContentMatch[1];

        // Pattern 2: media:thumbnail
        if (!imageUrl) {
            const thumbnailMatch = itemContent.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
            if (thumbnailMatch) imageUrl = thumbnailMatch[1];
        }

        // Pattern 3: enclosure with type="image"
        if (!imageUrl) {
            const enclosureMatch = itemContent.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image/i);
            if (enclosureMatch) imageUrl = enclosureMatch[1];
        }

        // Pattern 4: enclosure with any url (ESPN often uses this)
        if (!imageUrl) {
            const enclosureUrlMatch = itemContent.match(/<enclosure[^>]+url="([^"]+)"/i);
            if (enclosureUrlMatch && /\.(jpg|jpeg|png|gif|webp)/i.test(enclosureUrlMatch[1])) {
                imageUrl = enclosureUrlMatch[1];
            }
        }

        // Pattern 5: img tag in description/content
        if (!imageUrl) {
            const imgMatch = itemContent.match(/<img[^>]+src="([^"]+)"/i);
            if (imgMatch) imageUrl = imgMatch[1];
        }

        // Pattern 6: Any URL with image extension
        if (!imageUrl) {
            const anyImageMatch = itemContent.match(/["'](https?:\/\/[^"']+\.(jpg|jpeg|png|gif|webp)[^"']*)["']/i);
            if (anyImageMatch) imageUrl = anyImageMatch[1];
        }

        if (title && url) {
            articles.push({
                id: `rss-${source.toLowerCase().replace(/\s/g, '-')}-${index}-${Date.now()}`,
                title,
                description: description || title,
                content: description || title,
                imageUrl,
                source,
                category,
                publishedAt,
                url,
            });
            index++;
        }
    }

    return articles;
}

// Fetch RSS feed
async function fetchRSSFeed(feedUrl: string, source: string, category: string): Promise<NewsArticle[]> {
    try {
        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BetPot/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml',
            },
        });

        if (!response.ok) {
            console.error(`RSS fetch failed for ${source}: ${response.status}`);
            return [];
        }

        const xml = await response.text();
        return parseRSSItems(xml, source, category);
    } catch (error) {
        console.error(`RSS fetch error for ${source}:`, error);
        return [];
    }
}

// Fetch from NewsData.io API
async function fetchNewsDataAPI(category: string): Promise<NewsArticle[]> {
    const categoryMap: Record<string, string> = {
        sports: 'sports',
        crypto: 'business',
        politics: 'politics',
        entertainment: 'entertainment',
        general: 'top',
        finance: 'business',
    };

    const newsCategory = categoryMap[category] || 'top';
    const apiUrl = `https://newsdata.io/api/1/latest?apikey=${NEWSDATA_API_KEY}&language=en&category=${newsCategory}`;

    try {
        const response = await fetch(apiUrl);
        const data: any = await response.json();

        if (data.status === 'success' && data.results) {
            return data.results.slice(0, 15).map((item: any, index: number) => ({
                id: item.article_id || `newsdata-${index}-${Date.now()}`,
                title: item.title || '',
                description: item.description || item.title || '',
                content: item.content || item.description || '',
                imageUrl: item.image_url || null,
                source: item.source_name || item.source_id || 'News',
                category: category,
                publishedAt: item.pubDate || new Date().toISOString(),
                url: item.link || '',
            }));
        }
    } catch (error) {
        console.error('NewsData API error:', error);
    }

    return [];
}

// Get external news (public)
newsRoutes.get('/', async (c) => {
    const category = c.req.query('category') || 'sports';

    try {
        let articles: NewsArticle[] = [];

        // For sports/football, use RSS feeds + NewsData API
        if (category === 'sports' || category === 'football') {
            const feeds = category === 'football' ? RSS_FEEDS.football : RSS_FEEDS.sports;

            // Fetch all RSS feeds in parallel
            const rssPromises = feeds.map(feed => fetchRSSFeed(feed.url, feed.source, category));
            const rssResults = await Promise.all(rssPromises);

            // Combine all RSS articles
            for (const result of rssResults) {
                articles.push(...result);
            }

            // Also fetch from NewsData API and combine
            const newsDataArticles = await fetchNewsDataAPI('sports');
            articles.push(...newsDataArticles);

            // Shuffle and limit to avoid showing same source in sequence
            articles = articles.sort(() => Math.random() - 0.5).slice(0, 40);

            console.log(`Fetched ${articles.length} ${category} articles from RSS + NewsData`);
        } else {
            // For other categories, use only NewsData API
            articles = await fetchNewsDataAPI(category);
            console.log(`Fetched ${articles.length} ${category} articles from NewsData`);
        }

        return c.json({ success: true, data: articles, category });
    } catch (error) {
        console.error('News fetch error:', error);
        return c.json({ success: false, error: 'Failed to fetch news', data: [] });
    }
});

// Get single article by ID (for internal view)
newsRoutes.get('/:id', async (c) => {
    const { id } = c.req.param();
    const url = c.req.query('url');

    return c.json({
        success: true,
        data: { id, url },
        message: 'Use frontend cached data for article content'
    });
});
