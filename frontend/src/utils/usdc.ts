import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createTransferInstruction,
    getAccount,
} from '@solana/spl-token';

// USDC Testnet Mint Address
export const USDC_MINT = new PublicKey(
    import.meta.env.VITE_USDC_MINT || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
);

// Platform Wallet Address
export const PLATFORM_WALLET = new PublicKey(
    import.meta.env.VITE_PLATFORM_WALLET || '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2'
);

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

/**
 * Get user's USDC token account address
 */
export async function getUserUSDCAccount(
    userPublicKey: PublicKey
): Promise<PublicKey> {
    return await getAssociatedTokenAddress(
        USDC_MINT,
        userPublicKey
    );
}

/**
 * Get platform's USDC token account address
 */
export async function getPlatformUSDCAccount(): Promise<PublicKey> {
    return await getAssociatedTokenAddress(
        USDC_MINT,
        PLATFORM_WALLET
    );
}

/**
 * Get user's USDC balance
 */
export async function getUSDCBalance(
    connection: Connection,
    userPublicKey: PublicKey
): Promise<number> {
    try {
        const tokenAccount = await getUserUSDCAccount(userPublicKey);

        // Check if account exists first
        const accountInfo = await connection.getAccountInfo(tokenAccount);
        if (!accountInfo) {
            return 0;
        }

        const account = await getAccount(connection, tokenAccount);
        const balance = Number(account.amount) / Math.pow(10, USDC_DECIMALS);
        return balance;
    } catch (error: any) {
        console.error('Error getting USDC balance:', error.message || error);
        // If account doesn't exist, return 0 instead of throwing
        if (error.message?.includes('could not find account') ||
            error.message?.includes('Invalid') ||
            error.name === 'TokenAccountNotFoundError') {
            return 0;
        }
        return 0;
    }
}

/**
 * Create USDC transfer transaction
 */
export async function createUSDCTransferTransaction(
    connection: Connection,
    userPublicKey: PublicKey,
    amount: number // Amount in USDC (e.g., 10 for 10 USDC)
): Promise<Transaction> {
    // Get token accounts
    const userTokenAccount = await getUserUSDCAccount(userPublicKey);
    const platformTokenAccount = await getPlatformUSDCAccount();

    // Convert amount to smallest unit (6 decimals for USDC)
    const transferAmount = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
        userTokenAccount,
        platformTokenAccount,
        userPublicKey,
        transferAmount
    );

    // Create transaction
    const transaction = new Transaction().add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    return transaction;
}

/**
 * Format USDC amount for display
 */
export function formatUSDC(amount: number): string {
    return `${amount.toFixed(2)} USDC`;
}
