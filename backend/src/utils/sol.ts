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

/**
 * Send SOL from platform wallet to user wallet (for payouts)
 */
export async function sendSolPayout(
    recipientAddress: string,
    solAmount: number,
    platformSecretKey: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
    console.log('=== SOL PAYOUT ===');
    console.log('Recipient:', recipientAddress);
    console.log('Amount SOL:', solAmount);

    try {
        // Dynamic imports for Cloudflare Workers compatibility
        const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
        const bs58 = await import('bs58');

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');

        // Decode the secret key from base58
        let secretKeyBytes: Uint8Array;
        try {
            secretKeyBytes = bs58.default.decode(platformSecretKey);
        } catch {
            // Try as regular bs58
            secretKeyBytes = bs58.decode(platformSecretKey);
        }

        const platformKeypair = Keypair.fromSecretKey(secretKeyBytes);
        const recipientPubkey = new PublicKey(recipientAddress);

        // Convert SOL to lamports
        const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);
        console.log('Lamports to send:', lamports);

        // Check platform wallet balance first
        const balance = await connection.getBalance(platformKeypair.publicKey);
        console.log('Platform balance:', balance / LAMPORTS_PER_SOL, 'SOL');

        if (balance < lamports + 5000) { // 5000 lamports for fee buffer
            console.error('Insufficient platform balance');
            return {
                success: false,
                error: `Insufficient platform balance. Have ${balance / LAMPORTS_PER_SOL} SOL, need ${solAmount} SOL`
            };
        }

        // Create transfer transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: platformKeypair.publicKey,
                toPubkey: recipientPubkey,
                lamports,
            })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = platformKeypair.publicKey;

        // Sign and send transaction
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [platformKeypair],
            { commitment: 'confirmed' }
        );

        console.log('=== PAYOUT SUCCESS ===');
        console.log('Signature:', signature);

        return {
            success: true,
            signature,
        };
    } catch (error: any) {
        console.error('Payout error:', error);
        return {
            success: false,
            error: error.message || 'Unknown payout error',
        };
    }
}
