import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, Save, X } from 'lucide-react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    imageUrl: string | null;
    category: string;
    isPublished: boolean;
    createdAt: string;
}

const categories = ['announcement', 'tips', 'crypto', 'sports', 'updates'];

export function AdminBlogManager() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        excerpt: '',
        imageUrl: '',
        category: 'announcement',
        isPublished: false,
    });

    const { data: postsData, isLoading } = useQuery({
        queryKey: ['admin-blog-posts'],
        queryFn: () => api.getAdminBlogPosts(),
    });

    const posts: BlogPost[] = postsData?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => api.createBlogPost(data),
        onSuccess: () => {
            toast.success('Post created!');
            queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
            closeModal();
        },
        onError: () => toast.error('Failed to create post'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: typeof formData }) => api.updateBlogPost(id, data),
        onSuccess: () => {
            toast.success('Post updated!');
            queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
            closeModal();
        },
        onError: () => toast.error('Failed to update post'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteBlogPost(id),
        onSuccess: () => {
            toast.success('Post deleted!');
            queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
        },
        onError: () => toast.error('Failed to delete post'),
    });

    const openCreateModal = () => {
        setEditingPost(null);
        setFormData({
            title: '',
            content: '',
            excerpt: '',
            imageUrl: '',
            category: 'announcement',
            isPublished: false,
        });
        setShowModal(true);
    };

    const openEditModal = (post: BlogPost) => {
        setEditingPost(post);
        setFormData({
            title: post.title,
            content: post.content,
            excerpt: post.excerpt || '',
            imageUrl: post.imageUrl || '',
            category: post.category || 'announcement',
            isPublished: post.isPublished,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPost(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPost) {
            updateMutation.mutate({ id: editingPost.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this post?')) {
            deleteMutation.mutate(id);
        }
    };

    const togglePublish = (post: BlogPost) => {
        updateMutation.mutate({
            id: post.id,
            data: { ...formData, isPublished: !post.isPublished },
        });
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-white">BetPot News/Blog Manager</h1>
                    <p className="text-text-secondary dark:text-gray-400">Create and manage blog posts</p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Post
                </button>
            </div>

            {/* Posts Table */}
            {isLoading ? (
                <div className="text-center py-16">
                    <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16 card">
                    <Edit2 className="w-12 h-12 mx-auto mb-4 text-text-muted dark:text-gray-600" />
                    <p className="text-text-secondary dark:text-gray-400 mb-4">No blog posts yet</p>
                    <button onClick={openCreateModal} className="btn btn-primary">
                        Create Your First Post
                    </button>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-background-secondary dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Title</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Date</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-gray-800">
                            {posts.map((post) => (
                                <tr key={post.id} className="hover:bg-background-secondary/50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {post.imageUrl && (
                                                <img src={post.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />
                                            )}
                                            <span className="text-text-primary dark:text-white font-medium">{post.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded text-xs font-medium">
                                            {post.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={clsx(
                                            'px-2 py-1 rounded text-xs font-medium',
                                            post.isPublished
                                                ? 'bg-positive-100 dark:bg-positive-900/30 text-positive-700 dark:text-positive-300'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                        )}>
                                            {post.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-text-secondary dark:text-gray-400 text-sm">
                                        {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => togglePublish(post)}
                                                className="p-2 hover:bg-background-secondary dark:hover:bg-gray-700 rounded"
                                                title={post.isPublished ? 'Unpublish' : 'Publish'}
                                            >
                                                {post.isPublished ? (
                                                    <EyeOff className="w-4 h-4 text-text-muted" />
                                                ) : (
                                                    <Eye className="w-4 h-4 text-positive-500" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openEditModal(post)}
                                                className="p-2 hover:bg-background-secondary dark:hover:bg-gray-700 rounded"
                                            >
                                                <Edit2 className="w-4 h-4 text-brand-500" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="p-2 hover:bg-background-secondary dark:hover:bg-gray-700 rounded"
                                            >
                                                <Trash2 className="w-4 h-4 text-negative-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background-card dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border dark:border-gray-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-text-primary dark:text-white">
                                {editingPost ? 'Edit Post' : 'Create New Post'}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-background-secondary dark:hover:bg-gray-800 rounded">
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="input w-full"
                                    placeholder="Post title"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                                    Image URL (optional)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        className="input flex-1"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    <div className="w-12 h-10 rounded border border-border dark:border-gray-700 flex items-center justify-center overflow-hidden">
                                        {formData.imageUrl ? (
                                            <img src={formData.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Image className="w-4 h-4 text-text-muted" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="input w-full"
                                    >
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isPublished}
                                            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                                            className="w-4 h-4 rounded border-border"
                                        />
                                        <span className="text-sm text-text-primary dark:text-white">Publish immediately</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                                    Excerpt (short preview)
                                </label>
                                <textarea
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                    className="input w-full h-20"
                                    placeholder="Brief description shown in previews..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Content</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="input w-full h-48"
                                    placeholder="Write your post content here..."
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="btn btn-ghost flex-1">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingPost ? 'Update' : 'Create'} Post
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
