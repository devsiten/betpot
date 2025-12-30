import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Platform Wallet
const PLATFORM_WALLET = new PublicKey('8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2');

// Helius RPC for Devnet
const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=e495db18-fb79-4c7b-9750-5bf08d316aaf';

// Helper to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verify a native SOL transfer transaction
 */
export async function verifySolTransaction(
    signature: string,
    expectedSolAmount: number,
    senderAddress: string
): Promise<boolean> {
    console.log('=== SOL VERIFICATION ===');
    console.log('Signature:', signature);
    console.log('Expected SOL:', expectedSolAmount);

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');

        // Wait longer for transaction to be indexed
        await delay(3000);

        // Retry up to 5 times
        let tx = null;
        for (let attempt = 1; attempt <= 5; attempt++) {
            tx = await connection.getTransaction(signature, {
                maxSupportedTransactionVersion: 0,
            });

            if (tx && tx.meta) {
                console.log('Transaction found on attempt', attempt);
                break;
            }

            console.log(`Attempt ${attempt}/5 - waiting...`);
            await delay(2000);
        }

        if (!tx || !tx.meta) {
            console.error('Transaction not found');
            return false;
        }

        if (tx.meta.err) {
            console.error('Transaction failed:', tx.meta.err);
            return false;
        }

        // Get static account keys from the compiled message
        const message = tx.transaction.message;
        const staticKeys = message.staticAccountKeys;

        console.log('Static accounts:', staticKeys.length);

        // Find platform wallet in static keys
        let platformIndex = -1;
        for (let i = 0; i < staticKeys.length; i++) {
            const key = staticKeys[i].toBase58();
            console.log(`  [${i}]: ${key}`);
            if (key === PLATFORM_WALLET.toBase58()) {
                platformIndex = i;
            }
        }

        if (platformIndex === -1) {
            console.error('Platform wallet not found in transaction');
            return false;
        }

        console.log('Platform at index:', platformIndex);

        // SECURITY: Verify the sender address matches the transaction signer
        // In Solana, staticAccountKeys[0] is always the fee payer (signer)
        const actualSender = staticKeys[0].toBase58();
        if (actualSender !== senderAddress) {
            console.error('Sender mismatch! Expected:', senderAddress, 'Got:', actualSender);
            console.error('SECURITY: Possible front-running attack detected');
            return false;
        }
        console.log('Sender verified:', actualSender);

        // Check balance changes
        const pre = tx.meta.preBalances[platformIndex];
        const post = tx.meta.postBalances[platformIndex];
        const received = post - pre;

        console.log('Pre balance:', pre);
        console.log('Post balance:', post);
        console.log('Received lamports:', received);

        // Convert expected to lamports
        const expectedLamports = Math.round(expectedSolAmount * LAMPORTS_PER_SOL);
        console.log('Expected lamports:', expectedLamports);

        if (received !== expectedLamports) {
            console.error('Amount mismatch:', received, 'vs', expectedLamports);
            return false;
        }

        console.log('=== VERIFICATION SUCCESS ===');
        return true;
    } catch (error) {
        console.error('Verification error:', error);
        return false;
    }
}
