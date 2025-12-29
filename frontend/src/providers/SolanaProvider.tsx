import { FC, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import { Connection, Transaction } from '@solana/web3.js';
import { ConnectionProvider, WalletProvider, useWallet as useAdapterWallet, useConnection as useAdapterConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal as useAdapterModal } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// RPC Endpoint - Devnet
const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=e495db18-fb79-4c7b-9750-5bf08d316aaf';

// Wallet detection functions
function detectPhantom(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).phantom?.solana?.isPhantom;
}

function detectSolflare(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).solflare?.isSolflare;
}

// Hook to get detected wallets with live updates
export function useDetectedWallets() {
    const [detected, setDetected] = useState({
        phantom: false,
        solflare: false,
        any: false,
    });

    useEffect(() => {
        // Check immediately
        const checkWallets = () => {
            const phantom = detectPhantom();
            const solflare = detectSolflare();
            setDetected({
                phantom,
                solflare,
                any: phantom || solflare,
            });
        };

        // Check on mount
        checkWallets();

        // Re-check after a short delay (wallets may inject late)
        const timer = setTimeout(checkWallets, 500);
        const timer2 = setTimeout(checkWallets, 1500);

        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
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

    // Determine wallet type from connected wallet
    const walletType = wallet?.adapter?.name?.toLowerCase().includes('phantom')
        ? 'phantom'
        : wallet?.adapter?.name?.toLowerCase().includes('solflare')
            ? 'solflare'
            : null;

    // Connect function - opens modal for wallet selection
    const connect = useCallback(async (type?: 'phantom' | 'solflare' | null) => {
        if (type) {
            // Find and select the specific wallet
            const targetWallet = wallets.find(w =>
                w.adapter.name.toLowerCase().includes(type)
            );
            if (targetWallet) {
                select(targetWallet.adapter.name);
                return;
            }
        }
        // Open modal for user to choose
        setVisible(true);
    }, [wallets, select, setVisible]);

    // Disconnect function
    const disconnect = useCallback(async () => {
        await adapterDisconnect();
    }, [adapterDisconnect]);

    // Sign message wrapper with retry logic for better Solflare compatibility
    const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
        // Wait for signMessage to be available (Solflare sometimes delays)
        let attempts = 0;
        const maxAttempts = 10;

        while (!adapterSignMessage && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }

        if (!adapterSignMessage) {
            throw new Error('Wallet does not support message signing. Please reconnect your wallet.');
        }

        try {
            return await adapterSignMessage(message);
        } catch (error: any) {
            console.error('Sign message error:', error);
            // Re-throw with clearer message
            if (error?.message?.includes('User rejected')) {
                throw error;
            }
            throw new Error(`Failed to sign: ${error?.message || 'Unknown error'}`);
        }
    }, [adapterSignMessage]);

    // Send transaction wrapper
    const sendTransaction = useCallback(async (transaction: Transaction, conn: Connection): Promise<string> => {
        if (!adapterSendTransaction) {
            throw new Error('Wallet does not support transactions');
        }
        return adapterSendTransaction(transaction, conn);
    }, [adapterSendTransaction]);

    return {
        connected,
        connecting,
        publicKey,
        walletType: walletType as 'phantom' | 'solflare' | null,
        connect,
        disconnect,
        signMessage,
        sendTransaction,
    };
}

export function useConnection() {
    const { connection } = useAdapterConnection();
    return { connection };
}

export function useWalletModal() {
    const { visible, setVisible } = useAdapterModal();
    return { visible, setVisible };
}

// Main Provider Component
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
                }}
            >
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
