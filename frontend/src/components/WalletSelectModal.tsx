import { useState, useEffect } from 'react';
import { X, Smartphone, Monitor } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Check if we're on mobile
function isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if Phantom is installed
function hasPhantom(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).phantom?.solana?.isPhantom;
}

// Check if Solflare is installed
function hasSolflare(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).solflare?.isSolflare;
}

// Get deep links for mobile
function getPhantomDeepLink(): string {
    const currentUrl = encodeURIComponent(window.location.href);
    return `https://phantom.app/ul/browse/${currentUrl}`;
}

function getSolflareDeepLink(): string {
    const currentUrl = encodeURIComponent(window.location.href);
    return `https://solflare.com/ul/v1/browse/${currentUrl}`;
}

export function WalletSelectModal({ isOpen, onClose }: WalletSelectModalProps) {
    const { select, wallets, connecting } = useWallet();
    const [detectedWallets, setDetectedWallets] = useState({ phantom: false, solflare: false });
    const [isOnMobile, setIsOnMobile] = useState(false);

    useEffect(() => {
        // Check wallet availability after mount
        const checkWallets = () => {
            setDetectedWallets({
                phantom: hasPhantom(),
                solflare: hasSolflare(),
            });
            setIsOnMobile(isMobile());
        };

        checkWallets();
        // Re-check after delay (wallets may inject late)
        const timer = setTimeout(checkWallets, 500);
        return () => clearTimeout(timer);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleWalletSelect = async (walletName: 'Phantom' | 'Solflare') => {
        const mobile = isMobile();
        const phantom = hasPhantom();
        const solflare = hasSolflare();

        // On mobile without extension: redirect to app
        if (mobile) {
            if (walletName === 'Phantom' && !phantom) {
                window.location.href = getPhantomDeepLink();
                return;
            }
            if (walletName === 'Solflare' && !solflare) {
                window.location.href = getSolflareDeepLink();
                return;
            }
        }

        // Find the wallet adapter
        const wallet = wallets.find(w =>
            w.adapter.name.toLowerCase().includes(walletName.toLowerCase())
        );

        if (wallet) {
            try {
                // Select the wallet - this triggers the extension popup
                select(wallet.adapter.name);
                onClose();
            } catch (error) {
                console.error('Failed to select wallet:', error);
            }
        } else {
            // Wallet not found/installed - redirect to install page
            if (walletName === 'Phantom') {
                window.open('https://phantom.app/', '_blank');
            } else {
                window.open('https://solflare.com/', '_blank');
            }
        }
    };

    const needsInstall = !detectedWallets.phantom && !detectedWallets.solflare && !isOnMobile;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 w-full max-w-sm shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            {isOnMobile ? (
                                <Smartphone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            ) : (
                                <Monitor className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary dark:text-white">Connect Wallet</h3>
                            <p className="text-xs text-text-muted dark:text-gray-400">
                                {isOnMobile ? 'Choose your wallet app' : 'Select a wallet'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-background-secondary dark:hover:bg-gray-800 text-text-muted"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Wallet Options */}
                <div className="p-4 space-y-3">
                    {/* Phantom */}
                    <button
                        onClick={() => handleWalletSelect('Phantom')}
                        disabled={connecting}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group disabled:opacity-50"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="text-white text-xl font-bold">P</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-text-primary dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                Phantom
                            </p>
                            <p className="text-xs text-text-muted dark:text-gray-400">
                                {detectedWallets.phantom ? 'Detected' : isOnMobile ? 'Open in app' : 'Not detected'}
                            </p>
                        </div>
                        {detectedWallets.phantom && (
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        )}
                    </button>

                    {/* Solflare */}
                    <button
                        onClick={() => handleWalletSelect('Solflare')}
                        disabled={connecting}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group disabled:opacity-50"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
                            <span className="text-white text-xl font-bold">S</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-text-primary dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">
                                Solflare
                            </p>
                            <p className="text-xs text-text-muted dark:text-gray-400">
                                {detectedWallets.solflare ? 'Detected' : isOnMobile ? 'Open in app' : 'Not detected'}
                            </p>
                        </div>
                        {detectedWallets.solflare && (
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border dark:border-gray-800">
                    {needsInstall ? (
                        <p className="text-xs text-negative-500 dark:text-negative-400 text-center">
                            No wallet detected. Click to install Phantom or Solflare.
                        </p>
                    ) : isOnMobile ? (
                        <p className="text-xs text-text-muted dark:text-gray-400 text-center">
                            This will open your wallet app to connect.
                        </p>
                    ) : (
                        <p className="text-xs text-text-muted dark:text-gray-400 text-center">
                            Click a wallet to connect. A popup will appear.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
