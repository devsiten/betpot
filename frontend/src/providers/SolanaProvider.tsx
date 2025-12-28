import { FC, ReactNode, createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// RPC Endpoint
const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=e495db18-fb79-4c7b-9750-5bf08d316aaf';

// Connection instance
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Wallet types
type WalletType = 'phantom' | 'solflare' | null;

// Storage key for persisting wallet type
const WALLET_STORAGE_KEY = 'betpot_wallet_type';

// Wallet Context State
interface WalletContextState {
    connected: boolean;
    connecting: boolean;
    publicKey: PublicKey | null;
    walletType: WalletType;
    connect: (type: WalletType) => Promise<void>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>;
}

const WalletContext = createContext<WalletContextState>({
    connected: false,
    connecting: false,
    publicKey: null,
    walletType: null,
    connect: async () => { },
    disconnect: async () => { },
    signMessage: async () => new Uint8Array(),
    sendTransaction: async () => '',
});

// Export hooks
export function useWallet() {
    return useContext(WalletContext);
}

export function useConnection() {
    return { connection };
}

// Modal context
interface WalletModalContextState {
    visible: boolean;
    setVisible: (open: boolean) => void;
}

const WalletModalContext = createContext<WalletModalContextState>({
    visible: false,
    setVisible: () => { },
});

export function useWalletModal() {
    return useContext(WalletModalContext);
}

// Get Phantom provider from window
function getPhantomProvider(): any | null {
    if (typeof window !== 'undefined' && 'phantom' in window) {
        const provider = (window as any).phantom?.solana;
        if (provider?.isPhantom) {
            return provider;
        }
    }
    return null;
}

// Get Solflare provider from window (extension)
function getSolflareProvider(): any | null {
    if (typeof window !== 'undefined' && 'solflare' in window) {
        const provider = (window as any).solflare;
        if (provider?.isSolflare) {
            return provider;
        }
    }
    return null;
}

// Custom Wallet Modal
function CustomWalletModal() {
    const { visible, setVisible } = useWalletModal();
    const { connect, connecting } = useWallet();

    const phantomInstalled = typeof window !== 'undefined' && getPhantomProvider() !== null;
    const solflareInstalled = typeof window !== 'undefined' && getSolflareProvider() !== null;

    const handleConnect = async (type: WalletType) => {
        try {
            await connect(type);
            setVisible(false);
        } catch (error) {
            console.error('Connect error:', error);
        }
    };

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={() => setVisible(false)}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
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

                <div className="space-y-3">
                    {/* Phantom */}
                    <button
                        onClick={() => handleConnect('phantom')}
                        disabled={connecting}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all disabled:opacity-50"
                    >
                        <img src="https://phantom.app/img/phantom-icon-purple.svg" alt="Phantom" className="w-10 h-10 rounded-lg" />
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">Phantom</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {phantomInstalled ? 'Detected' : 'Not installed'}
                            </p>
                        </div>
                        {!phantomInstalled && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                Install
                            </span>
                        )}
                    </button>

                    {/* Solflare */}
                    <button
                        onClick={() => handleConnect('solflare')}
                        disabled={connecting}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all disabled:opacity-50"
                    >
                        <img src="https://solflare.com/favicon.ico" alt="Solflare" className="w-10 h-10 rounded-lg" />
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">Solflare</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {solflareInstalled ? 'Detected' : 'Not installed'}
                            </p>
                        </div>
                        {!solflareInstalled && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                Install
                            </span>
                        )}
                    </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
                    By connecting, you agree to our Terms of Service
                </p>
            </div>
        </div>
    );
}

// Main Provider
export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [walletType, setWalletType] = useState<WalletType>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Connect function - uses window providers directly (no SDK)
    const connect = useCallback(async (type: WalletType) => {
        if (!type) return;

        setConnecting(true);
        try {
            if (type === 'phantom') {
                const provider = getPhantomProvider();
                if (!provider) {
                    window.open('https://phantom.app/', '_blank');
                    setConnecting(false);
                    return;
                }

                const response = await provider.connect();
                const pk = new PublicKey(response.publicKey.toString());
                setPublicKey(pk);
                setConnected(true);
                setWalletType('phantom');
                localStorage.setItem(WALLET_STORAGE_KEY, 'phantom');

            } else if (type === 'solflare') {
                const provider = getSolflareProvider();
                if (!provider) {
                    window.open('https://solflare.com/', '_blank');
                    setConnecting(false);
                    return;
                }

                await provider.connect();

                if (provider.publicKey) {
                    setPublicKey(new PublicKey(provider.publicKey.toString()));
                    setConnected(true);
                    setWalletType('solflare');
                    localStorage.setItem(WALLET_STORAGE_KEY, 'solflare');
                }
            }
        } catch (error) {
            console.error('Connection error:', error);
        } finally {
            setConnecting(false);
        }
    }, []);

    // Disconnect function
    const disconnect = useCallback(async () => {
        try {
            if (walletType === 'phantom') {
                const provider = getPhantomProvider();
                if (provider) {
                    await provider.disconnect();
                }
            } else if (walletType === 'solflare') {
                const provider = getSolflareProvider();
                if (provider) {
                    await provider.disconnect();
                }
            }
        } catch (error) {
            console.error('Disconnect error:', error);
        }

        setConnected(false);
        setPublicKey(null);
        setWalletType(null);
        localStorage.removeItem(WALLET_STORAGE_KEY);
    }, [walletType]);

    // Sign message
    const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
        if (walletType === 'phantom') {
            const provider = getPhantomProvider();
            if (!provider) throw new Error('Phantom not connected');
            const { signature } = await provider.signMessage(message, 'utf8');
            return signature;
        } else if (walletType === 'solflare') {
            const provider = getSolflareProvider();
            if (!provider) throw new Error('Solflare not connected');
            const { signature } = await provider.signMessage(message, 'utf8');
            return signature;
        }
        throw new Error('No wallet connected');
    }, [walletType]);

    // Send transaction
    const sendTransaction = useCallback(async (transaction: Transaction, conn: Connection): Promise<string> => {
        const { blockhash } = await conn.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey!;

        if (walletType === 'phantom') {
            const provider = getPhantomProvider();
            if (!provider) throw new Error('Phantom not connected');
            const { signature } = await provider.signAndSendTransaction(transaction);
            return signature;
        } else if (walletType === 'solflare') {
            const provider = getSolflareProvider();
            if (!provider) throw new Error('Solflare not connected');
            const { signature } = await provider.signAndSendTransaction(transaction);
            return signature;
        }
        throw new Error('No wallet connected');
    }, [walletType, publicKey]);

    // Auto-connect on mount
    useEffect(() => {
        const autoConnect = async () => {
            const savedWalletType = localStorage.getItem(WALLET_STORAGE_KEY) as WalletType;

            if (savedWalletType === 'phantom') {
                const provider = getPhantomProvider();
                if (provider) {
                    try {
                        const response = await provider.connect({ onlyIfTrusted: true });
                        setPublicKey(new PublicKey(response.publicKey.toString()));
                        setConnected(true);
                        setWalletType('phantom');
                    } catch (e) {
                        localStorage.removeItem(WALLET_STORAGE_KEY);
                    }
                }
            } else if (savedWalletType === 'solflare') {
                const provider = getSolflareProvider();
                if (provider && provider.isConnected) {
                    try {
                        setPublicKey(new PublicKey(provider.publicKey.toString()));
                        setConnected(true);
                        setWalletType('solflare');
                    } catch (e) {
                        localStorage.removeItem(WALLET_STORAGE_KEY);
                    }
                }
            }
        };

        setTimeout(autoConnect, 200);
    }, []);

    // Listen for wallet events
    useEffect(() => {
        const phantomProvider = getPhantomProvider();
        const solflareProvider = getSolflareProvider();

        const handleDisconnect = () => {
            setConnected(false);
            setPublicKey(null);
            setWalletType(null);
            localStorage.removeItem(WALLET_STORAGE_KEY);
        };

        if (phantomProvider) {
            phantomProvider.on('disconnect', handleDisconnect);
            phantomProvider.on('accountChanged', (newPk: any) => {
                if (walletType === 'phantom') {
                    if (newPk) {
                        setPublicKey(new PublicKey(newPk.toString()));
                    } else {
                        handleDisconnect();
                    }
                }
            });
        }

        if (solflareProvider) {
            solflareProvider.on('disconnect', handleDisconnect);
        }

        return () => {
            if (phantomProvider) {
                phantomProvider.removeAllListeners?.('disconnect');
                phantomProvider.removeAllListeners?.('accountChanged');
            }
            if (solflareProvider) {
                solflareProvider.removeAllListeners?.('disconnect');
            }
        };
    }, [walletType]);

    return (
        <WalletContext.Provider value={{
            connected,
            connecting,
            publicKey,
            walletType,
            connect,
            disconnect,
            signMessage,
            sendTransaction,
        }}>
            <WalletModalContext.Provider value={{ visible: modalVisible, setVisible: setModalVisible }}>
                {children}
                <CustomWalletModal />
            </WalletModalContext.Provider>
        </WalletContext.Provider>
    );
};
