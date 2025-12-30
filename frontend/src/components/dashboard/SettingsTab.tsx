import { useState } from 'react';
import { User, Trash2, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useWallet } from '@/providers/SolanaProvider';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface SettingsTabProps {
    currentUsername: string;
    currentDisplayName: string;
}

export function SettingsTab({ currentUsername, currentDisplayName }: SettingsTabProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { logout } = useAuthStore();
    const { disconnect } = useWallet();

    const [username, setUsername] = useState(currentUsername || '');
    const [displayName, setDisplayName] = useState(currentDisplayName || '');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: async (data: { username?: string; displayName?: string }) => {
            return api.updateProfile(data);
        },
        onSuccess: () => {
            toast.success('Profile updated successfully');
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update profile');
        },
    });

    // Delete account mutation
    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            return api.deleteAccount();
        },
        onSuccess: () => {
            toast.success('Account deleted successfully');
            localStorage.removeItem('betpot_wallet');
            localStorage.removeItem('betpot_token');
            logout();
            disconnect();
            navigate('/');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete account');
        },
    });

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await updateProfileMutation.mutateAsync({
                username: username.trim() || undefined,
                displayName: displayName.trim() || undefined,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        if (deleteConfirmText !== 'DELETE ACCOUNT') {
            toast.error('Please type DELETE ACCOUNT to confirm');
            return;
        }
        deleteAccountMutation.mutate();
    };

    const canDelete = deleteConfirmText === 'DELETE ACCOUNT';

    return (
        <div className="space-y-6">
            {/* Profile Settings */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 p-6 shadow-card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-primary dark:text-white">Profile Settings</h3>
                        <p className="text-sm text-text-muted dark:text-gray-400">Update your username and display name</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary dark:text-white mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter unique username"
                            className="w-full px-4 py-3 bg-background-secondary dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl text-text-primary dark:text-white placeholder-text-muted dark:placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                        />
                        <p className="text-xs text-text-muted dark:text-gray-500 mt-1">
                            Must be unique. Used for your profile URL.
                        </p>
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary dark:text-white mb-2">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter display name"
                            className="w-full px-4 py-3 bg-background-secondary dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl text-text-primary dark:text-white placeholder-text-muted dark:placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                        />
                        <p className="text-xs text-text-muted dark:text-gray-500 mt-1">
                            Shown publicly on the platform.
                        </p>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className={clsx(
                            'flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl font-medium transition-all',
                            isSaving
                                ? 'bg-brand-400 text-white cursor-not-allowed'
                                : 'bg-brand-600 hover:bg-brand-700 text-white'
                        )}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-negative-200 dark:border-negative-800 p-6 shadow-card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-negative-100 dark:bg-negative-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-negative-600 dark:text-negative-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-negative-600 dark:text-negative-400">Danger Zone</h3>
                        <p className="text-sm text-text-muted dark:text-gray-400">Irreversible actions</p>
                    </div>
                </div>

                <div className="p-4 bg-negative-50 dark:bg-negative-900/20 rounded-xl border border-negative-200 dark:border-negative-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-text-primary dark:text-white">Delete Account</h4>
                            <p className="text-sm text-text-muted dark:text-gray-400">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-negative-600 hover:bg-negative-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-negative-100 dark:bg-negative-900/30 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-negative-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary dark:text-white">Delete Account</h3>
                                <p className="text-sm text-text-muted dark:text-gray-400">This action is permanent</p>
                            </div>
                        </div>

                        <p className="text-text-secondary dark:text-gray-300 mb-4">
                            This will permanently delete your account, all your tickets, referrals, and associated data.
                            This action cannot be undone.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-text-primary dark:text-white mb-2">
                                Type <span className="font-mono text-negative-600">DELETE ACCOUNT</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE ACCOUNT"
                                className="w-full px-4 py-3 bg-background-secondary dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl text-text-primary dark:text-white placeholder-text-muted dark:placeholder-gray-500 focus:outline-none focus:border-negative-500 focus:ring-2 focus:ring-negative-500/20 transition-colors font-mono"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText('');
                                }}
                                className="flex-1 px-4 py-3 bg-background-secondary dark:bg-gray-800 text-text-primary dark:text-white rounded-xl font-medium hover:bg-border-light dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={!canDelete || deleteAccountMutation.isPending}
                                className={clsx(
                                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors',
                                    canDelete && !deleteAccountMutation.isPending
                                        ? 'bg-negative-600 hover:bg-negative-700 text-white'
                                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                )}
                            >
                                {deleteAccountMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Confirm Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
