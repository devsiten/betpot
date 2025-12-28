import { FC, ReactNode, useMemo, useState, useCallback, createContext, useContext } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletReadyState } from '@solana/wallet-adapter-base';

// Custom Wallet Modal Context
interface WalletModalContextState {
    visible: boolean;
    setVisible: (open: boolean) => void;
}

const WalletModalContext = createContext<WalletModalContextState>({
    visible: false,
    setVisible: () => { },
});

// Export this so MainLayout can use it
export function useWalletModal() {
    return useContext(WalletModalContext);
}

// Custom Wallet Modal - ONLY Phantom and Solflare
function CustomWalletModal() {
    const { visible, setVisible } = useWalletModal();
    const { wallets, select, connecting } = useWallet();

    // Filter to only Phantom and Solflare
    const allowedWallets = useMemo(() => {
        return wallets.filter(wallet =>
            wallet.adapter.name === 'Phantom' ||
            wallet.adapter.name === 'Solflare'
        );
    }, [wallets]);

    const handleWalletClick = useCallback(async (walletName: string) => {
        const wallet = allowedWallets.find(w => w.adapter.name === walletName);
        if (!wallet) return;

        // If wallet is installed, select and connect
        if (wallet.readyState === WalletReadyState.Installed ||
            wallet.readyState === WalletReadyState.Loadable) {
            select(wallet.adapter.name);
            setVisible(false);
        } else {
            // Open install page
            if (walletName === 'Phantom') {
                window.open('https://phantom.app/', '_blank');
            } else if (walletName === 'Solflare') {
                window.open('https://solflare.com/', '_blank');
            }
        }
    }, [allowedWallets, select, setVisible]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={() => setVisible(false)}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Connect Wallet
                    </h2>
                    <button
                        onClick={() => setVisible(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Wallet Options */}
                <div className="space-y-3">
                    {/* Phantom */}
                    <WalletButton
                        name="Phantom"
                        icon="https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.svg"
                        isInstalled={allowedWallets.some(w =>
                            w.adapter.name === 'Phantom' &&
                            (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable)
                        )}
                        onClick={() => handleWalletClick('Phantom')}
                        connecting={connecting}
                    />

                    {/* Solflare */}
                    <WalletButton
                        name="Solflare"
                        icon="https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.svg"
                        isInstalled={allowedWallets.some(w =>
                            w.adapter.name === 'Solflare' &&
                            (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable)
                        )}
                        onClick={() => handleWalletClick('Solflare')}
                        connecting={connecting}
                    />
                </div>

                {/* Footer */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
                    Only Phantom and Solflare are supported
                </p>
            </div>
        </div>
    );
}

// Wallet Button Component
function WalletButton({
    name,
    icon,
    isInstalled,
    onClick,
    connecting
}: {
    name: string;
    icon: string;
    isInstalled: boolean;
    onClick: () => void;
    connecting: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={connecting}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all disabled:opacity-50"
        >
            <img src={icon} alt={name} className="w-10 h-10 rounded-lg" />
            <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isInstalled ? 'Detected' : 'Not installed'}
                </p>
            </div>
            {!isInstalled && (
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    Install →
                </span>
            )}
        </button>
    );
}

// Custom Modal Provider
function CustomWalletModalProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);

    return (
        <WalletModalContext.Provider value={{ visible, setVisible }}>
            {children}
            <CustomWalletModal />
        </WalletModalContext.Provider>
    );
}

interface SolanaProviderProps {
    children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
    // Helius RPC endpoint for Devnet - better reliability than public RPC
    const endpoint = 'https://devnet.helius-rpc.com/?api-key=e495db18-fb79-4c7b-9750-5bf08d316aaf';

    // Initialize wallets - ONLY Phantom and Solflare
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network: 'devnet' as any }),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            {/* autoConnect=true to reconnect wallet on page refresh */}
            <WalletProvider wallets={wallets} autoConnect={true}>
                <CustomWalletModalProvider>
                    {children}
                </CustomWalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
