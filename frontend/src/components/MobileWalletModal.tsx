
import { X, ExternalLink, Smartphone } from 'lucide-react';


interface MobileWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Get deep links for wallet apps
function getPhantomDeepLink(): string {
    const currentUrl = encodeURIComponent(window.location.href);
    return `https://phantom.app/ul/browse/${currentUrl}`;
}

function getSolflareDeepLink(): string {
    const currentUrl = encodeURIComponent(window.location.href);
    return `https://solflare.com/ul/v1/browse/${currentUrl}`;
}

export function MobileWalletModal({ isOpen, onClose }: MobileWalletModalProps) {
    if (!isOpen) return null;

    const handlePhantomClick = () => {
        window.location.href = getPhantomDeepLink();
    };

    const handleSolflareClick = () => {
        window.location.href = getSolflareDeepLink();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 w-full max-w-sm shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary dark:text-white">Connect Wallet</h3>
                            <p className="text-xs text-text-muted dark:text-gray-400">Choose your wallet app</p>
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
                        onClick={handlePhantomClick}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xl font-bold">P</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-text-primary dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                Phantom
                            </p>
                            <p className="text-xs text-text-muted dark:text-gray-400">
                                Open in Phantom app
                            </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-brand-600" />
                    </button>

                    {/* Solflare */}
                    <button
                        onClick={handleSolflareClick}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                            <span className="text-white text-xl font-bold">S</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-text-primary dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                Solflare
                            </p>
                            <p className="text-xs text-text-muted dark:text-gray-400">
                                Open in Solflare app
                            </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-brand-600" />
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border dark:border-gray-800">
                    <p className="text-xs text-text-muted dark:text-gray-400 text-center">
                        This will open your wallet app to connect to BetPot. Make sure the app is installed on your device.
                    </p>
                </div>
            </div>
        </div>
    );
}


