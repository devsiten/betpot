import { Hono } from 'hono';
import type { AppContext } from '../types';

export const newsRoutes = new Hono<AppContext>();

const NEWSAPI_KEY = '8zH-dNtY3Vx-c4FE6rAzNuupNOQXje5gMaCwgHwkmBBfoQOq';
const CRYPTOPANIC_TOKEN = 'afb6de40dc334fdd5296285f13a421fd8887524d';

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

        if (category === 'crypto') {
            // Use CryptoPanic for crypto news
            const response = await fetch(
                `https://cryptopanic.com/api/developer/v2/posts/?auth_token=${CRYPTOPANIC_TOKEN}&public=true&kind=news`
            );
            const data: any = await response.json();

            if (data.results) {
                articles = data.results.slice(0, 20).map((item: any, index: number) => ({
                    id: item.id?.toString() || `crypto-${index}`,
                    title: item.title || '',
                    description: item.title || '', // CryptoPanic doesn't have descriptions
                    content: item.title || '',
                    imageUrl: null, // CryptoPanic doesn't provide images
                    source: item.source?.title || 'CryptoPanic',
                    category: 'crypto',
                    publishedAt: item.published_at || new Date().toISOString(),
                    url: item.url || '',
                }));
            }
        } else {
            // Use NewsAPI for other categories
            const categoryMap: Record<string, string> = {
                sports: 'sports',
                politics: 'politics',
                entertainment: 'entertainment',
                general: 'general',
            };

            const newsCategory = categoryMap[category] || 'general';

            const response = await fetch(
                `https://newsapi.org/v2/top-headlines?category=${newsCategory}&language=en&pageSize=20&apiKey=${NEWSAPI_KEY}`
            );
            const data: any = await response.json();

            if (data.articles) {
                articles = data.articles.map((item: any, index: number) => ({
                    id: `news-${index}-${Date.now()}`,
                    title: item.title || '',
                    description: item.description || '',
                    content: item.content || item.description || '',
                    imageUrl: item.urlToImage || null,
                    source: item.source?.name || 'News',
                    category: category,
                    publishedAt: item.publishedAt || new Date().toISOString(),
                    url: item.url || '',
                }));
            }
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

    // For external news, we just return the URL info
    // The frontend will display whatever data was passed
    return c.json({
        success: true,
        data: { id, url },
        message: 'Use frontend cached data for article content'
    });
});
