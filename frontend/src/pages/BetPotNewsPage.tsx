import { useQuery } from '@tanstack/react-query';
import { Newspaper, ArrowLeft, Clock, User, Edit2 } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { format } from 'date-fns';

export function BetPotNewsPage() {
    const { data: blogData, isLoading } = useQuery({
        queryKey: ['blog-posts'],
        queryFn: () => api.getBlogPosts(),
    });

    const posts = blogData?.data || [];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <Edit2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-white">BetPot News/Blog</h1>
                    </div>
                    <p className="text-text-secondary dark:text-gray-400">Updates, tips, and announcements from BetPot</p>
                </div>

                <Link
                    to="/news"
                    className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm"
                >
                    ← View External News
                </Link>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-16">
                    <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-text-muted dark:text-gray-400 mt-4">Loading posts...</p>
                </div>
            )}

            {/* Posts Grid */}
            {!isLoading && posts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post: any) => (
                        <Link
                            key={post.id}
                            to={`/betpot-news/${post.id}`}
                            className="bg-background-card dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 overflow-hidden hover:border-brand-300 dark:hover:border-brand-600 transition-colors group"
                        >
                            {post.imageUrl && (
                                <img
                                    src={post.imageUrl}
                                    alt={post.title}
                                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                                />
                            )}
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded text-xs font-medium">
                                        {post.category}
                                    </span>
                                    <span className="text-xs text-text-muted dark:text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                                    </span>
                                </div>
                                <h3 className="font-bold text-text-primary dark:text-white mb-2 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                    {post.title}
                                </h3>
                                <p className="text-text-secondary dark:text-gray-400 text-sm line-clamp-2">
                                    {post.excerpt}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* No posts */}
            {!isLoading && posts.length === 0 && (
                <div className="text-center py-16">
                    <Newspaper className="w-12 h-12 text-text-muted dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary dark:text-white mb-2">No Posts Yet</h3>
                    <p className="text-text-secondary dark:text-gray-400 mb-4">Check back soon for updates from BetPot!</p>
                    <Link
                        to="/news"
                        className="text-brand-600 dark:text-brand-400 hover:underline"
                    >
                        Browse external news →
                    </Link>
                </div>
            )}
        </div>
    );
}

// Single blog post view
export function BetPotNewsPostPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: postData, isLoading } = useQuery({
        queryKey: ['blog-post', id],
        queryFn: () => api.getBlogPost(id!),
        enabled: !!id,
    });

    const post = postData?.data;

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">Post Not Found</h2>
                <button onClick={() => navigate('/betpot-news')} className="text-brand-600 dark:text-brand-400 hover:underline">
                    Back to BetPot News
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate('/betpot-news')}
                className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mb-6 font-medium"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to BetPot News
            </button>

            <article className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 overflow-hidden">
                {post.imageUrl && (
                    <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-64 md:h-80 object-cover"
                    />
                )}
                <div className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-xs font-medium uppercase">
                            {post.category}
                        </span>
                        <span className="text-text-muted dark:text-gray-400 text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(post.createdAt), 'MMMM dd, yyyy')}
                        </span>
                        {post.author?.username && (
                            <span className="text-text-muted dark:text-gray-400 text-sm flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {post.author.username}
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-white mb-6">
                        {post.title}
                    </h1>

                    <div className="prose prose-lg dark:prose-invert max-w-none text-text-secondary dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                    </div>
                </div>
            </article>
        </div>
    );
}
