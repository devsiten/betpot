import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// USDC Testnet Mint
const USDC_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

// Platform Wallet
const PLATFORM_WALLET = new PublicKey('8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2');

// USDC Decimals
const USDC_DECIMALS = 6;

/**
 * Verify a Solana USDC transfer transaction
 * @param signature Transaction signature to verify
 * @param expectedAmount Expected USDC amount (in USDC, not lamports)
 * @param senderAddress Sender's wallet address
 * @returns true if transaction is valid
 */
export async function verifyUSDCTransaction(
    signature: string,
    expectedAmount: number,
    senderAddress: string
): Promise<boolean> {
    try {
        // Connect to Solana devnet
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

        // Get transaction details
        const tx = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.meta) {
            console.error('Transaction not found or not confirmed');
            return false;
        }

        // Check if transaction was successful
        if (tx.meta.err) {
            console.error('Transaction failed:', tx.meta.err);
            return false;
        }

        // Get sender and platform token accounts
        const senderPubkey = new PublicKey(senderAddress);
        const senderTokenAccount = await getAssociatedTokenAddress(USDC_MINT, senderPubkey);
        const platformTokenAccount = await getAssociatedTokenAddress(USDC_MINT, PLATFORM_WALLET);

        // Convert expected amount to smallest unit (6 decimals for USDC)
        const expectedAmountLamports = BigInt(Math.floor(expectedAmount * Math.pow(10, USDC_DECIMALS)));

        // Check token balances before and after
        const preBalances = tx.meta.preTokenBalances || [];
        const postBalances = tx.meta.postTokenBalances || [];

        // Find sender's token account changes
        const senderPreBalance = preBalances.find(
            (b) => b.owner === senderAddress && b.mint === USDC_MINT.toBase58()
        );
        const senderPostBalance = postBalances.find(
            (b) => b.owner === senderAddress && b.mint === USDC_MINT.toBase58()
        );

        // Find platform's token account changes
        const platformPreBalance = preBalances.find(
            (b) => b.owner === PLATFORM_WALLET.toBase58() && b.mint === USDC_MINT.toBase58()
        );
        const platformPostBalance = postBalances.find(
            (b) => b.owner === PLATFORM_WALLET.toBase58() && b.mint === USDC_MINT.toBase58()
        );

        if (!senderPreBalance || !senderPostBalance || !platformPreBalance || !platformPostBalance) {
            console.error('Could not find token balance changes');
            return false;
        }

        // Calculate actual transfer amount
        const senderDecrease = BigInt(senderPreBalance.uiTokenAmount.amount) - BigInt(senderPostBalance.uiTokenAmount.amount);
        const platformIncrease = BigInt(platformPostBalance.uiTokenAmount.amount) - BigInt(platformPreBalance.uiTokenAmount.amount);

        // Verify amounts match
        if (senderDecrease !== expectedAmountLamports || platformIncrease !== expectedAmountLamports) {
            console.error('Transfer amount mismatch:', {
                expected: expectedAmountLamports.toString(),
                senderDecrease: senderDecrease.toString(),
                platformIncrease: platformIncrease.toString(),
            });
            return false;
        }

        console.log('USDC transaction verified successfully:', {
            signature,
            amount: expectedAmount,
            sender: senderAddress,
        });

        return true;
    } catch (error) {
        console.error('Error verifying USDC transaction:', error);
        return false;
    }
}
