import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Platform Wallet Address (same as before)
export const PLATFORM_WALLET = new PublicKey(
    import.meta.env.VITE_PLATFORM_WALLET || '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2'
);

// Cache for SOL price
let cachedSolPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 60 seconds

/**
 * Fetch current SOL price in USD from CoinGecko
 */
export async function getSolPrice(): Promise<number> {
    // Return cached price if still valid
    if (cachedSolPrice && Date.now() - cachedSolPrice.timestamp < CACHE_DURATION) {
        return cachedSolPrice.price;
    }

    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
        const data = await response.json();
        const price = data.solana?.usd || 123; // Fallback to $123 if API fails

        // Cache the price
        cachedSolPrice = { price, timestamp: Date.now() };

        return price;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        // Return cached price if available, otherwise fallback
        return cachedSolPrice?.price || 123;
    }
}

/**
 * Convert USDC amount to SOL
 */
export async function usdcToSol(usdcAmount: number): Promise<number> {
    const solPrice = await getSolPrice();
    const solAmount = usdcAmount / solPrice;
    // Round to 4 decimal places
    return Math.ceil(solAmount * 10000) / 10000;
}

/**
 * Convert SOL amount to USDC
 */
export async function solToUsdc(solAmount: number): Promise<number> {
    const solPrice = await getSolPrice();
    return solAmount * solPrice;
}

/**
 * Format SOL amount for display
 */
export function formatSol(amount: number): string {
    return `${amount.toFixed(4)} SOL`;
}

/**
 * Format dual price display (SOL primary, USDC secondary)
 */
export async function formatDualPrice(usdcAmount: number): Promise<string> {
    const solAmount = await usdcToSol(usdcAmount);
    return `${solAmount.toFixed(4)} SOL (~$${usdcAmount.toFixed(2)})`;
}

/**
 * Get user's SOL balance
 */
export async function getSolBalance(
    connection: Connection,
    userPublicKey: PublicKey
): Promise<number> {
    try {
        const balance = await connection.getBalance(userPublicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Error getting SOL balance:', error);
        return 0;
    }
}

/**
 * Create SOL transfer transaction to platform wallet
 */
export async function createSolTransferTransaction(
    connection: Connection,
    userPublicKey: PublicKey,
    solAmount: number
): Promise<Transaction> {
    // Convert SOL to lamports (use Math.round for consistency with backend)
    const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: PLATFORM_WALLET,
        lamports,
    });

    // Create transaction
    const transaction = new Transaction().add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    return transaction;
}
