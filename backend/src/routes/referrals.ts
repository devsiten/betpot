import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import {
    users,
    referrals,
    twitterVerifications,
    referralLimits,
    type DiscordRole
} from '../db/schema';
import type { AppContext } from '../types';
import { auth } from '../middleware/auth';
import { nanoid } from 'nanoid';

const referralsRoutes = new Hono<AppContext>();

// Generate a unique referral code
function generateReferralCode(): string {
    return nanoid(8).toUpperCase();
}

// ============================================================================
// GET /referrals/stats - Get user's referral stats
// ============================================================================
referralsRoutes.get('/stats', auth, async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({ success: false, error: 'Unauthorized' }, 401);
        }
        const db = c.get('db');

        // Get user data
        const fullUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
        });

        if (!fullUser) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }

        // Generate referral code if not exists
        let referralCode = fullUser.referralCode;
        if (!referralCode) {
            referralCode = generateReferralCode();
            await db.update(users).set({ referralCode }).where(eq(users.id, user.id));
        }

        // Get referral counts
        const referralsResult = await db.select({
            total: sql<number>`count(*)`,
            verified: sql<number>`sum(case when discord_verified = 1 and twitter_verified = 1 then 1 else 0 end)`,
            pending: sql<number>`sum(case when discord_verified = 0 or twitter_verified = 0 then 1 else 0 end)`,
        }).from(referrals).where(eq(referrals.referrerId, user.id));

        const referralStats = referralsResult[0] || { total: 0, verified: 0, pending: 0 };

        // Calculate referral limit based on Discord role
        const discordRole = fullUser.discordRole as DiscordRole | null;
        const referralLimit = discordRole ? referralLimits[discordRole] : 0;

        return c.json({
            success: true,
            data: {
                referralCode,
                discordRole: fullUser.discordRole,
                discordUsername: fullUser.discordUsername,
                discordConnected: !!fullUser.discordId,
                twitterHandle: fullUser.twitterHandle,
                twitterVerified: fullUser.twitterVerified || false,
                volumePoints: fullUser.volumePoints || 0,
                referralPoints: fullUser.referralPoints || 0,
                totalReferrals: Number(referralStats.total) || 0,
                verifiedReferrals: Number(referralStats.verified) || 0,
                pendingReferrals: Number(referralStats.pending) || 0,
                referralLimit,
            },
        });
    } catch (error: any) {
        console.error('Error fetching referral stats:', error);
        return c.json({ success: false, error: 'Failed to fetch referral stats' }, 500);
    }
});

// ============================================================================
// GET /referrals/my-referrals - Get list of users referred by this user
// ============================================================================
referralsRoutes.get('/my-referrals', auth, async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({ success: false, error: 'Unauthorized' }, 401);
        }
        const db = c.get('db');

        const myReferrals = await db.select({
            id: referrals.id,
            discordVerified: referrals.discordVerified,
            twitterVerified: referrals.twitterVerified,
            pointsAwarded: referrals.pointsAwarded,
            createdAt: referrals.createdAt,
            referredWallet: users.walletAddress,
            referredDisplayName: users.displayName,
        })
            .from(referrals)
            .leftJoin(users, eq(referrals.referredUserId, users.id))
            .where(eq(referrals.referrerId, user.id))
            .orderBy(sql`${referrals.createdAt} DESC`);

        return c.json({
            success: true,
            data: myReferrals.map(r => ({
                id: r.id,
                referredUser: {
                    walletAddress: r.referredWallet || '',
                    displayName: r.referredDisplayName,
                },
                discordVerified: r.discordVerified || false,
                twitterVerified: r.twitterVerified || false,
                pointsAwarded: r.pointsAwarded || false,
                createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
            })),
        });
    } catch (error: any) {
        console.error('Error fetching referrals:', error);
        return c.json({ success: false, error: 'Failed to fetch referrals' }, 500);
    }
});

// ============================================================================
// POST /referrals/twitter-verification - Submit Twitter handle for verification
// ============================================================================
referralsRoutes.post('/twitter-verification', auth, async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({ success: false, error: 'Unauthorized' }, 401);
        }
        const { twitterHandle } = await c.req.json();
        const db = c.get('db');

        if (!twitterHandle || typeof twitterHandle !== 'string') {
            return c.json({ success: false, error: 'Twitter handle is required' }, 400);
        }

        // Clean the handle (remove @ if present)
        const cleanHandle = twitterHandle.replace('@', '').trim();

        if (cleanHandle.length < 1 || cleanHandle.length > 15) {
            return c.json({ success: false, error: 'Invalid Twitter handle' }, 400);
        }

        // Check if already submitted
        const existing = await db.query.twitterVerifications.findFirst({
            where: eq(twitterVerifications.userId, user.id),
        });

        if (existing) {
            return c.json({ success: false, error: 'You have already submitted a Twitter handle for verification' }, 400);
        }

        // Create verification request
        await db.insert(twitterVerifications).values({
            id: nanoid(),
            userId: user.id,
            twitterHandle: cleanHandle,
            status: 'pending',
            createdAt: new Date(),
        });

        // Update user's twitter handle
        await db.update(users).set({
            twitterHandle: cleanHandle,
            updatedAt: new Date(),
        }).where(eq(users.id, user.id));

        return c.json({
            success: true,
            data: { message: 'Twitter handle submitted for verification' },
        });
    } catch (error: any) {
        console.error('Error submitting Twitter verification:', error);
        return c.json({ success: false, error: 'Failed to submit verification' }, 500);
    }
});

// ============================================================================
// POST /referrals/apply-code - Apply a referral code during signup
// ============================================================================
referralsRoutes.post('/apply-code', auth, async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({ success: false, error: 'Unauthorized' }, 401);
        }
        const { code } = await c.req.json();
        const db = c.get('db');

        if (!code || typeof code !== 'string') {
            return c.json({ success: false, error: 'Referral code is required' }, 400);
        }

        // Get current user full data
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
        });

        if (!currentUser) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }

        // Check if already has a referrer
        if (currentUser.referredBy) {
            return c.json({ success: false, error: 'You have already been referred' }, 400);
        }

        // Find referrer by code
        const referrer = await db.query.users.findFirst({
            where: eq(users.referralCode, code.toUpperCase()),
        });

        if (!referrer) {
            return c.json({ success: false, error: 'Invalid referral code' }, 400);
        }

        // Can't refer yourself
        if (referrer.id === user.id) {
            return c.json({ success: false, error: 'Cannot use your own referral code' }, 400);
        }

        // Check referrer's limit
        const discordRole = referrer.discordRole as DiscordRole | null;
        if (!discordRole) {
            return c.json({ success: false, error: 'Referrer is not eligible for the referral program' }, 400);
        }

        const limit = referralLimits[discordRole];
        const countResult = await db.select({ count: sql<number>`count(*)` })
            .from(referrals)
            .where(eq(referrals.referrerId, referrer.id));

        if ((countResult[0]?.count || 0) >= limit) {
            return c.json({ success: false, error: 'Referrer has reached their referral limit' }, 400);
        }

        // Create referral record
        await db.insert(referrals).values({
            id: nanoid(),
            referrerId: referrer.id,
            referredUserId: user.id,
            referralCode: code.toUpperCase(),
            discordVerified: false,
            twitterVerified: false,
            pointsAwarded: false,
            createdAt: new Date(),
        });

        // Update user's referredBy field
        await db.update(users).set({
            referredBy: code.toUpperCase(),
            updatedAt: new Date(),
        }).where(eq(users.id, user.id));

        return c.json({
            success: true,
            data: { message: 'Referral code applied successfully' },
        });
    } catch (error: any) {
        console.error('Error applying referral code:', error);
        return c.json({ success: false, error: 'Failed to apply referral code' }, 500);
    }
});

export default referralsRoutes;
