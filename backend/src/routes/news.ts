import { Hono } from 'hono';
import type { AppContext } from '../types';

export const newsRoutes = new Hono<AppContext>();

// NewsData.io - 200 credits/day free, supports many categories
// Get your free API key at: https://newsdata.io
const NEWSDATA_API_KEY = 'pub_630539c7f16bc1a69ed6b38cf1b0f82e1a8c7';

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

// Get external news (public)
newsRoutes.get('/', async (c) => {
    const category = c.req.query('category') || 'sports';

    try {
        let articles: NewsArticle[] = [];

        // NewsData.io category mapping
        const categoryMap: Record<string, string> = {
            sports: 'sports',
            crypto: 'business', // crypto news via business + q=crypto
            politics: 'politics',
            entertainment: 'entertainment',
            general: 'top',
            finance: 'business',
        };

        const newsCategory = categoryMap[category] || 'top';

        // Build API URL
        let apiUrl = `https://newsdata.io/api/1/latest?apikey=${NEWSDATA_API_KEY}&language=en&category=${newsCategory}`;

        // For crypto, add keyword filter
        if (category === 'crypto') {
            apiUrl += '&q=cryptocurrency%20OR%20bitcoin%20OR%20crypto';
        }

        const response = await fetch(apiUrl);
        const data: any = await response.json();

        console.log('NewsData response status:', data.status, 'results:', data.results?.length || 0);

        if (data.status === 'success' && data.results) {
            articles = data.results.slice(0, 20).map((item: any, index: number) => ({
                id: item.article_id || `news-${index}-${Date.now()}`,
                title: item.title || '',
                description: item.description || item.title || '',
                content: item.content || item.description || '',
                imageUrl: item.image_url || null,
                source: item.source_name || item.source_id || 'News',
                category: category,
                publishedAt: item.pubDate || new Date().toISOString(),
                url: item.link || '',
            }));
        } else if (data.status === 'error') {
            console.error('NewsData API error:', data.results?.message || data);
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

