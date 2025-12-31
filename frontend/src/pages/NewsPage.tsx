import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, ArrowLeft, Clock, ExternalLink, RefreshCw, TrendingUp, Globe, Tv, Bitcoin, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { format } from 'date-fns';
import clsx from 'clsx';

const categories = [
    { id: 'sports', label: '⚽ Football', icon: TrendingUp },
    { id: 'forex', label: 'Forex', icon: DollarSign },
    { id: 'crypto', label: 'Crypto', icon: Bitcoin },
    { id: 'politics', label: 'Politics', icon: Globe },
    { id: 'entertainment', label: 'Entertainment', icon: Tv },
];

export function NewsPage() {
    const [selectedCategory, setSelectedCategory] = useState('sports');
    const [selectedArticle, setSelectedArticle] = useState<any>(null);

    const { data: newsData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['news', selectedCategory],
        queryFn: () => api.getNews(selectedCategory),
    });

    const articles = newsData?.data || [];

    // Article detail view
    if (selectedArticle) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <button
                    onClick={() => setSelectedArticle(null)}
                    className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mb-6 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to News
                </button>

                <article className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 overflow-hidden">
                    {selectedArticle.imageUrl && (
                        <img
                            src={selectedArticle.imageUrl}
                            alt={selectedArticle.title}
                            className="w-full h-64 md:h-80 object-cover"
                        />
                    )}
                    <div className="p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-xs font-medium uppercase">
                                {selectedArticle.category}
                            </span>
                            <span className="text-text-muted dark:text-gray-400 text-sm">
                                {selectedArticle.source}
                            </span>
                            <span className="text-text-muted dark:text-gray-400 text-sm flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(selectedArticle.publishedAt), 'MMM dd, yyyy')}
                            </span>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-white mb-4">
                            {selectedArticle.title}
                        </h1>

                        <p className="text-text-secondary dark:text-gray-300 text-lg leading-relaxed mb-6">
                            {selectedArticle.description || selectedArticle.content}
                        </p>

                        {selectedArticle.content && selectedArticle.content !== selectedArticle.description && (
                            <div className="text-text-secondary dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {selectedArticle.content}
                            </div>
                        )}

                        {selectedArticle.url && (
                            <a
                                href={selectedArticle.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-6 text-brand-600 dark:text-brand-400 hover:underline"
                            >
                                Read full article
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                </article>
            </div>
        );
    }

    // News listing view
    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <Newspaper className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-white">News</h1>
                    </div>
                    <p className="text-text-secondary dark:text-gray-400">Latest news from around the world</p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        to="/betpot-news"
                        className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm"
                    >
                        View BetPot News/Blog →
                    </Link>
                    <button
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        className="p-2 bg-background-secondary dark:bg-gray-800 rounded-lg hover:bg-border-light dark:hover:bg-gray-700 transition-colors"
                    >
                        <RefreshCw className={clsx('w-5 h-5 text-text-muted dark:text-gray-400', isRefetching && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setSelectedCategory(id)}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                            selectedCategory === id
                                ? 'bg-brand-600 text-white'
                                : 'bg-background-secondary dark:bg-gray-800 text-text-secondary dark:text-gray-400 hover:bg-border-light dark:hover:bg-gray-700'
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-16">
                    <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-text-muted dark:text-gray-400 mt-4">Loading news...</p>
                </div>
            )}

            {/* Articles Grid */}
            {!isLoading && articles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map((article: any) => (
                        <article
                            key={article.id}
                            onClick={() => setSelectedArticle(article)}
                            className="bg-background-card dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 overflow-hidden cursor-pointer hover:border-brand-300 dark:hover:border-brand-600 transition-colors group"
                        >
                            {article.imageUrl && (
                                <img
                                    src={article.imageUrl}
                                    alt={article.title}
                                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                                />
                            )}
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-brand-600 dark:text-brand-400 font-medium uppercase">
                                        {article.source}
                                    </span>
                                    <span className="text-xs text-text-muted dark:text-gray-500">
                                        {format(new Date(article.publishedAt), 'MMM dd')}
                                    </span>
                                </div>
                                <h3 className="font-bold text-text-primary dark:text-white mb-2 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                    {article.title}
                                </h3>
                                <p className="text-text-secondary dark:text-gray-400 text-sm line-clamp-2">
                                    {article.description}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* No articles */}
            {!isLoading && articles.length === 0 && (
                <div className="text-center py-16">
                    <Newspaper className="w-12 h-12 text-text-muted dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-text-secondary dark:text-gray-400">No news found for this category</p>
                </div>
            )}
        </div>
    );
}
