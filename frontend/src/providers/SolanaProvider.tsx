import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaProviderProps {
    children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
    // Helius RPC endpoint for Devnet - better reliability than public RPC
    const endpoint = 'https://devnet.helius-rpc.com/?api-key=e495db18-fb79-4c7b-9750-5bf08d316aaf';

    // Initialize wallets - Phantom and Solflare
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
