import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Wallet, Check, LogOut, ExternalLink, Copy } from 'lucide-react';
import { useWallet } from '@/providers/SolanaProvider';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { DashboardTabs, PortfolioTab, ReferralsTab, SettingsTab } from '@/components/dashboard';

export function DashboardPage() {
    const navigate = useNavigate();
    const { publicKey, connected, disconnect } = useWallet();
    const { logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState('portfolio');
    const [copied, setCopied] = useState(false);

    // Fetch user profile for settings
    const { data: profileData } = useQuery({
        queryKey: ['user-profile', publicKey?.toBase58()],
        queryFn: () => api.getProfile(),
        enabled: connected && !!publicKey,
    });

    const profile = profileData?.data;

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const copyAddress = () => {
        if (publicKey) {
            navigator.clipboard.writeText(publicKey.toBase58());
            setCopied(true);
            toast.success('Address copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDisconnect = () => {
        localStorage.removeItem('betpot_wallet');
        localStorage.removeItem('betpot_token');
        logout();
        disconnect();
        navigate('/');
        toast.success('Disconnected');
    };

    if (!connected) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-positive-100 flex items-center justify-center mx-auto mb-6">
                    <Wallet className="w-10 h-10 text-brand-600" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary dark:text-white mb-2">Connect Your Wallet</h1>
                <p className="text-text-secondary dark:text-gray-300">Connect and sign in to view your dashboard</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white">Dashboard</h1>
                    <p className="text-text-secondary dark:text-gray-300 text-sm sm:text-base">Manage your bets, points, and settings</p>
                </div>

                <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-negative-500 hover:text-negative-600 hover:bg-negative-50 rounded-lg transition-all text-xs font-medium"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                </button>
            </div>

            {/* Wallet Card */}
            <div className="bg-gradient-to-br from-background-card to-background-secondary dark:from-gray-900 dark:to-gray-800 rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8 border border-border dark:border-gray-700 shadow-card relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-100 dark:bg-brand-900/30 rounded-full blur-3xl opacity-30" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-positive-100 dark:bg-positive-900/30 rounded-full blur-3xl opacity-20" />

                <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-soft">
                                <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-text-muted dark:text-gray-400 uppercase tracking-wider mb-1">Connected Wallet</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg sm:text-xl font-mono text-text-primary dark:text-white font-medium">
                                        {formatAddress(publicKey?.toBase58() || '')}
                                    </p>
                                    <button
                                        onClick={copyAddress}
                                        className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-positive-600" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <a
                                        href={`https://explorer.solana.com/address/${publicKey?.toBase58()}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wide border border-brand-200">
                                Devnet
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Tabs */}
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            {activeTab === 'portfolio' && (
                <PortfolioTab publicKey={publicKey} connected={connected} />
            )}

            {activeTab === 'referrals' && (
                <ReferralsTab />
            )}

            {activeTab === 'settings' && (
                <SettingsTab
                    currentUsername={profile?.username || ''}
                    currentDisplayName={profile?.displayName || ''}
                />
            )}
        </div>
    );
}
