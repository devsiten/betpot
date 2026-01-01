import { FC, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import { Connection, Transaction } from '@solana/web3.js';
import { ConnectionProvider, WalletProvider, useWallet as useAdapterWallet, useConnection as useAdapterConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal as useAdapterModal } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// RPC Endpoint - Devnet
const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=e495db18-fb79-4c7b-9750-5bf08d316aaf';

// ============================================================================
// MOBILE DETECTION & DEEP LINK UTILITIES
// ============================================================================

function isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}



// Generate Phantom deep link for mobile
function getPhantomDeepLink(): string {
    const currentUrl = encodeURIComponent(window.location.href);
    // Universal link format that works on both iOS and Android
    return `https://phantom.app/ul/browse/${currentUrl}`;
}

// Generate Solflare deep link for mobile
function getSolflareDeepLink(): string {
    const currentUrl = encodeURIComponent(window.location.href);
    // Universal link format
    return `https://solflare.com/ul/v1/browse/${currentUrl}`;
}

// Wallet detection functions
function detectPhantom(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).phantom?.solana?.isPhantom;
}

function detectSolflare(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).solflare?.isSolflare;
}

// ============================================================================
// HOOKS
// ============================================================================

// Hook to get detected wallets with live updates
export function useDetectedWallets() {
    const [detected, setDetected] = useState({
        phantom: false,
        solflare: false,
        any: false,
        isMobile: false,
        needsDeepLink: false,
    });

    useEffect(() => {
        const checkWallets = () => {
            const phantom = detectPhantom();
            const solflare = detectSolflare();
            const mobile = isMobile();
            const needsDeepLink = mobile && !phantom && !solflare;

            setDetected({
                phantom,
                solflare,
                any: phantom || solflare,
                isMobile: mobile,
                needsDeepLink,
            });
        };

        // Check immediately
        checkWallets();

        // Re-check after delays (wallets may inject late)
        const timer1 = setTimeout(checkWallets, 300);
        const timer2 = setTimeout(checkWallets, 1000);
        const timer3 = setTimeout(checkWallets, 2000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, []);

    return detected;
}

// Re-export hooks with same interface as before for compatibility
export function useWallet() {
    const {
        connected,
        connecting,
        publicKey,
        signMessage: adapterSignMessage,
        sendTransaction: adapterSendTransaction,
        wallet,
        disconnect: adapterDisconnect,
        select,
        wallets
    } = useAdapterWallet();
    const { setVisible } = useAdapterModal();
    const detectedWallets = useDetectedWallets();

    // Determine wallet type from connected wallet
    const walletType = wallet?.adapter?.name?.toLowerCase().includes('phantom')
        ? 'phantom'
        : wallet?.adapter?.name?.toLowerCase().includes('solflare')
            ? 'solflare'
            : null;

    // Connect function - handles mobile deep links
    const connect = useCallback(async (type?: 'phantom' | 'solflare' | null) => {
        // If on mobile without wallet extension, redirect to wallet app
        if (detectedWallets.needsDeepLink) {
            if (type === 'phantom') {
                window.location.href = getPhantomDeepLink();
                return;
            } else if (type === 'solflare') {
                window.location.href = getSolflareDeepLink();
                return;
            }
            // If no specific type, show custom mobile modal (handled by MobileWalletModal)
            setVisible(true);
            return;
        }

        // Desktop or in wallet dApp browser - use normal connection
        if (type) {
            const targetWallet = wallets.find(w =>
                w.adapter.name.toLowerCase().includes(type)
            );
            if (targetWallet) {
                try {
                    select(targetWallet.adapter.name);
                } catch (error) {
                    console.error('Failed to select wallet:', error);
                }
                return;
            }
        }
        // Open modal for user to choose
        setVisible(true);
    }, [wallets, select, setVisible, detectedWallets.needsDeepLink]);

    // Disconnect function
    const disconnect = useCallback(async () => {
        try {
            await adapterDisconnect();
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    }, [adapterDisconnect]);

    // Sign message wrapper with improved retry logic for Solflare
    const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
        // Wait longer for Solflare to be ready
        let attempts = 0;
        const maxAttempts = 20; // Increased from 10
        const delayMs = 300; // Increased from 200ms

        while (!adapterSignMessage && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            attempts++;
        }

        if (!adapterSignMessage) {
            throw new Error('Wallet does not support message signing. Please try reconnecting your wallet.');
        }

        // Try signing with retries for transient failures
        let signAttempts = 0;
        const maxSignAttempts = 3;
        let lastError: Error | null = null;

        while (signAttempts < maxSignAttempts) {
            try {
                const result = await adapterSignMessage(message);
                return result;
            } catch (error: any) {
                lastError = error;
                signAttempts++;
                console.error(`Sign attempt ${signAttempts} failed:`, error);

                // Don't retry on user rejection
                if (error?.message?.includes('User rejected') ||
                    error?.message?.includes('cancelled')) {
                    throw error;
                }

                // Wait before retry
                if (signAttempts < maxSignAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        throw new Error(`Failed to sign after ${maxSignAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
    }, [adapterSignMessage]);

    // Send transaction wrapper
    const sendTransaction = useCallback(async (transaction: Transaction, conn: Connection): Promise<string> => {
        if (!adapterSendTransaction) {
            throw new Error('Wallet does not support transactions');
        }
        return adapterSendTransaction(transaction, conn);
    }, [adapterSendTransaction]);

    // Open wallet in app (for mobile users)
    const openInWalletApp = useCallback((walletType: 'phantom' | 'solflare') => {
        if (walletType === 'phantom') {
            window.location.href = getPhantomDeepLink();
        } else {
            window.location.href = getSolflareDeepLink();
        }
    }, []);

    return {
        connected,
        connecting,
        publicKey,
        walletType: walletType as 'phantom' | 'solflare' | null,
        connect,
        disconnect,
        signMessage,
        sendTransaction,
        openInWalletApp,
        isMobileWithoutWallet: detectedWallets.needsDeepLink,
    };
}

export function useConnection() {
    const { connection } = useAdapterConnection();
    return { connection };
}

export function useWalletModal() {
    const { visible, setVisible } = useAdapterModal();
    const detectedWallets = useDetectedWallets();

    // Enhanced setVisible that handles mobile case
    const setModalVisible = useCallback((isVisible: boolean) => {
        setVisible(isVisible);
    }, [setVisible]);

    return {
        visible,
        setVisible: setModalVisible,
        needsDeepLink: detectedWallets.needsDeepLink,
        isMobile: detectedWallets.isMobile,
    };
}

// ============================================================================
// MAIN PROVIDER
// ============================================================================

interface SolanaProviderProps {
    children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
    // Configure ONLY Phantom and Solflare wallets
    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
    ], []);

    return (
        <ConnectionProvider endpoint={RPC_ENDPOINT}>
            <WalletProvider
                wallets={wallets}
                autoConnect={true}
                onError={(error) => {
                    console.error('Wallet error:', error);
                    // Don't show errors for expected cases
                    if (error?.message?.includes('User rejected')) return;
                }}
            >
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
