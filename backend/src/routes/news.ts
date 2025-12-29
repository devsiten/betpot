import { Hono } from 'hono';
import type { AppContext } from '../types';

export const newsRoutes = new Hono<AppContext>();

// GNews API is free and works from servers (unlike NewsAPI)
const GNEWS_API_KEY = '4a6c1c2be5d40d28e2a83acdf419d0e0';
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
                    description: item.title || '',
                    content: item.title || '',
                    imageUrl: null,
                    source: item.source?.title || 'CryptoPanic',
                    category: 'crypto',
                    publishedAt: item.published_at || new Date().toISOString(),
                    url: item.url || '',
                }));
            }
        } else {
            // Use GNews for other categories (works from servers)
            const categoryMap: Record<string, string> = {
                sports: 'sports',
                politics: 'nation',
                entertainment: 'entertainment',
                general: 'general',
            };

            const newsCategory = categoryMap[category] || 'general';

            const response = await fetch(
                `https://gnews.io/api/v4/top-headlines?category=${newsCategory}&lang=en&max=20&apikey=${GNEWS_API_KEY}`
            );
            const data: any = await response.json();

            console.log('GNews response:', JSON.stringify(data).substring(0, 500));

            if (data.articles) {
                articles = data.articles.map((item: any, index: number) => ({
                    id: `news-${index}-${Date.now()}`,
                    title: item.title || '',
                    description: item.description || '',
                    content: item.content || item.description || '',
                    imageUrl: item.image || null,
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

    return c.json({
        success: true,
        data: { id, url },
        message: 'Use frontend cached data for article content'
    });
});
