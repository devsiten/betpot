import { useState } from 'react';
import { Copy, Check, Users, Star, Clock, Link2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useWallet } from '@/providers/SolanaProvider';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const ROLE_LABELS: Record<string, string> = {
    early_contributor: 'Early Contributor',
    og: 'OG',
    influencer: 'Influencer',
};


interface ReferralStats {
    referralCode: string;
    discordRole: string | null;
    discordUsername: string | null;
    discordConnected: boolean;
    twitterHandle: string | null;
    twitterVerified: boolean;
    volumePoints: number;
    referralPoints: number;
    totalReferrals: number;
    verifiedReferrals: number;
    pendingReferrals: number;
    referralLimit: number;
}

interface Referral {
    id: string;
    referredUser: {
        walletAddress: string;
        displayName: string | null;
    };
    discordVerified: boolean;
    twitterVerified: boolean;
    pointsAwarded: boolean;
    createdAt: string;
}

export function ReferralsTab() {
    const { publicKey } = useWallet();
    const queryClient = useQueryClient();
    const [copied, setCopied] = useState(false);
    const [twitterInput, setTwitterInput] = useState('');
    const [isSubmittingTwitter, setIsSubmittingTwitter] = useState(false);

    // Fetch referral stats
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['referral-stats', publicKey?.toBase58()],
        queryFn: () => api.getReferralStats(),
        enabled: !!publicKey,
    });

    // Fetch referrals list
    const { data: referralsData, isLoading: referralsLoading } = useQuery({
        queryKey: ['my-referrals', publicKey?.toBase58()],
        queryFn: () => api.getMyReferrals(),
        enabled: !!publicKey,
    });

    const stats: ReferralStats = statsData?.data || {
        referralCode: '',
        discordRole: null,
        discordUsername: null,
        discordConnected: false,
        twitterHandle: null,
        twitterVerified: false,
        volumePoints: 0,
        referralPoints: 0,
        totalReferrals: 0,
        verifiedReferrals: 0,
        pendingReferrals: 0,
        referralLimit: 0,
    };

    const referrals: Referral[] = referralsData?.data || [];

    // Copy referral link
    const copyReferralLink = () => {
        const link = `${window.location.origin}?ref=${stats.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Referral link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    // Submit Twitter handle for verification
    const submitTwitterMutation = useMutation({
        mutationFn: async (handle: string) => {
            return api.submitTwitterVerification(handle);
        },
        onSuccess: () => {
            toast.success('Twitter handle submitted for verification');
            setTwitterInput('');
            queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to submit');
        },
    });

    const handleSubmitTwitter = async () => {
        if (!twitterInput.trim()) {
            toast.error('Please enter your Twitter handle');
            return;
        }
        setIsSubmittingTwitter(true);
        try {
            await submitTwitterMutation.mutateAsync(twitterInput.trim().replace('@', ''));
        } finally {
            setIsSubmittingTwitter(false);
        }
    };

    // Connect Discord
    const handleConnectDiscord = () => {
        // Discord OAuth URL - will be configured when server details are provided
        const discordOAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/discord/callback')}&response_type=code&scope=identify%20guilds`;
        window.location.href = discordOAuthUrl;
    };

    const totalPoints = stats.volumePoints + stats.referralPoints;
    const canRefer = stats.discordRole && stats.totalReferrals < stats.referralLimit;

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Points Overview */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 p-6 shadow-card">
                <h3 className="text-lg font-bold text-text-primary dark:text-white mb-4">Your Points</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Volume Points */}
                    <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-800">
                        <p className="text-xs text-brand-600 dark:text-brand-400 uppercase tracking-wider font-medium mb-1">Volume Points</p>
                        <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{stats.volumePoints.toLocaleString()}</p>
                        <p className="text-xs text-brand-500 dark:text-brand-500 mt-1">100 pts per SOL spent, 1 pt per SOL claimed</p>
                    </div>

                    {/* Referral Points */}
                    <div className="bg-positive-50 dark:bg-positive-900/20 rounded-xl p-4 border border-positive-200 dark:border-positive-800">
                        <p className="text-xs text-positive-600 dark:text-positive-400 uppercase tracking-wider font-medium mb-1">Referral Points</p>
                        <p className="text-2xl font-bold text-positive-700 dark:text-positive-300">{stats.referralPoints.toLocaleString()}</p>
                        <p className="text-xs text-positive-500 dark:text-positive-500 mt-1">100 pts per verified referral</p>
                    </div>

                    {/* Total Points */}
                    <div className="bg-gradient-to-br from-brand-100 to-positive-100 dark:from-brand-900/30 dark:to-positive-900/30 rounded-xl p-4 border border-brand-200 dark:border-brand-700">
                        <p className="text-xs text-text-primary dark:text-gray-300 uppercase tracking-wider font-medium mb-1">Total Points</p>
                        <p className="text-2xl font-bold text-text-primary dark:text-white">{totalPoints.toLocaleString()}</p>
                        <p className="text-xs text-text-muted dark:text-gray-400 mt-1">Combined score</p>
                    </div>
                </div>
            </div>

            {/* Referral Code & Link */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 p-6 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-primary dark:text-white">Your Referral Link</h3>
                        <p className="text-sm text-text-muted dark:text-gray-400">Share this link to earn referral points</p>
                    </div>
                </div>

                {stats.referralCode ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1 bg-background-secondary dark:bg-gray-800 rounded-xl px-4 py-3 border border-border dark:border-gray-700">
                            <p className="text-xs text-text-muted dark:text-gray-500 mb-1">Your Code</p>
                            <p className="font-mono font-bold text-text-primary dark:text-white">{stats.referralCode}</p>
                        </div>
                        <button
                            onClick={copyReferralLink}
                            disabled={!canRefer}
                            className={clsx(
                                'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                                canRefer
                                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            )}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy Link
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <p className="text-text-muted dark:text-gray-400">Connect Discord to get your referral code</p>
                )}

                {/* Referral Status */}
                {stats.discordRole && (
                    <div className="mt-4 p-4 bg-background-secondary dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium text-text-primary dark:text-white">
                                    {ROLE_LABELS[stats.discordRole] || stats.discordRole}
                                </span>
                            </div>
                            <span className="text-sm text-text-muted dark:text-gray-400">
                                {stats.totalReferrals} / {stats.referralLimit} referrals used
                            </span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand-600 rounded-full transition-all"
                                style={{ width: `${Math.min((stats.totalReferrals / stats.referralLimit) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Connect Accounts */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 p-6 shadow-card">
                <h3 className="text-lg font-bold text-text-primary dark:text-white mb-4">Connect Accounts</h3>

                <div className="space-y-4">
                    {/* Discord Connection */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background-secondary dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-text-primary dark:text-white">Discord</p>
                                {stats.discordConnected ? (
                                    <p className="text-sm text-positive-600 dark:text-positive-400">
                                        Connected as {stats.discordUsername}
                                    </p>
                                ) : (
                                    <p className="text-sm text-text-muted dark:text-gray-400">
                                        Required for referral program
                                    </p>
                                )}
                            </div>
                        </div>
                        {stats.discordConnected ? (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-positive-100 dark:bg-positive-900/30 text-positive-700 dark:text-positive-400 rounded-lg text-sm font-medium">
                                <Check className="w-4 h-4" />
                                Connected
                            </span>
                        ) : (
                            <button
                                onClick={handleConnectDiscord}
                                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-medium transition-colors"
                            >
                                Connect Discord
                            </button>
                        )}
                    </div>

                    {/* Twitter Verification */}
                    <div className="p-4 bg-background-secondary dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-black dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-text-primary dark:text-white">Twitter / X</p>
                                    {stats.twitterVerified ? (
                                        <p className="text-sm text-positive-600 dark:text-positive-400">
                                            Verified: @{stats.twitterHandle}
                                        </p>
                                    ) : stats.twitterHandle ? (
                                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                            Pending verification: @{stats.twitterHandle}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-text-muted dark:text-gray-400">
                                            Required for referral verification
                                        </p>
                                    )}
                                </div>
                            </div>
                            {stats.twitterVerified && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-positive-100 dark:bg-positive-900/30 text-positive-700 dark:text-positive-400 rounded-lg text-sm font-medium">
                                    <Check className="w-4 h-4" />
                                    Verified
                                </span>
                            )}
                        </div>

                        {!stats.twitterVerified && !stats.twitterHandle && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    value={twitterInput}
                                    onChange={(e) => setTwitterInput(e.target.value)}
                                    placeholder="@your_handle"
                                    className="flex-1 px-4 py-2 bg-background-card dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg text-text-primary dark:text-white placeholder-text-muted dark:placeholder-gray-500 focus:outline-none focus:border-brand-500"
                                />
                                <button
                                    onClick={handleSubmitTwitter}
                                    disabled={isSubmittingTwitter}
                                    className={clsx(
                                        'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap',
                                        isSubmittingTwitter
                                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                                    )}
                                >
                                    {isSubmittingTwitter ? 'Submitting...' : 'Submit for Verification'}
                                </button>
                            </div>
                        )}

                        {stats.twitterHandle && !stats.twitterVerified && (
                            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                                <Clock className="w-4 h-4" />
                                Awaiting admin verification
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Referrals List */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 overflow-hidden shadow-card">
                <div className="p-6 border-b border-border dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-positive-100 dark:bg-positive-900/30 flex items-center justify-center">
                            <Users className="w-5 h-5 text-positive-600 dark:text-positive-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary dark:text-white">Your Referrals</h3>
                            <p className="text-sm text-text-muted dark:text-gray-400">
                                {stats.verifiedReferrals} verified, {stats.pendingReferrals} pending
                            </p>
                        </div>
                    </div>
                </div>

                {referralsLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
                    </div>
                ) : referrals.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                        <p className="text-text-muted dark:text-gray-400">No referrals yet</p>
                        <p className="text-sm text-text-muted dark:text-gray-500 mt-1">Share your link to start earning points</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border dark:divide-gray-800">
                        {referrals.map((referral) => (
                            <div key={referral.id} className="p-4 hover:bg-background-secondary/50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-positive-400 flex items-center justify-center text-white font-bold text-sm">
                                            {referral.referredUser.displayName?.[0]?.toUpperCase() || referral.referredUser.walletAddress.slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-text-primary dark:text-white">
                                                {referral.referredUser.displayName || `${referral.referredUser.walletAddress.slice(0, 6)}...${referral.referredUser.walletAddress.slice(-4)}`}
                                            </p>
                                            <p className="text-xs text-text-muted dark:text-gray-500">
                                                Joined {new Date(referral.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {referral.discordVerified && referral.twitterVerified ? (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-positive-100 dark:bg-positive-900/30 text-positive-700 dark:text-positive-400 rounded text-xs font-medium">
                                                <Check className="w-3 h-3" />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium">
                                                <Clock className="w-3 h-3" />
                                                Pending
                                            </span>
                                        )}
                                        {referral.pointsAwarded && (
                                            <span className="text-xs text-positive-600 dark:text-positive-400 font-medium">
                                                +100 pts
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
