/**
 * Centralized configuration constants for BetPot backend.
 * 
 * This file contains all "magic numbers" and configurable values
 * used across the codebase. Update values here instead of searching
 * through multiple files.
 * 
 * For environment-specific values, use wrangler.toml or c.env instead.
 */

export const CONFIG = {
    // ============================================================================
    // WALLET ADDRESSES
    // ============================================================================

    /** Platform wallet address for receiving ticket payments */
    PLATFORM_WALLET: '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2',

    // ============================================================================
    // TIMING
    // ============================================================================

    /** Minutes before event start when betting closes */
    LOCK_BUFFER_MINUTES: 10,

    /** Minutes before a 'processing' ticket is considered stale and reset */
    PROCESSING_TIMEOUT_MINUTES: 10,

    /** Hours until JWT token expires */
    JWT_EXPIRATION_HOURS: 2,

    // ============================================================================
    // FINANCIAL
    // ============================================================================

    /** Platform fee as decimal (0.01 = 1%) - taken from losing pool on resolution */
    PLATFORM_FEE_PERCENT: 0.01,

    /** Default ticket price in USD (overridden by env TICKET_PRICE) */
    DEFAULT_TICKET_PRICE: 10,

    /** Maximum tickets a user can purchase in one transaction */
    MAX_TICKETS_PER_PURCHASE: 100,

    // ============================================================================
    // LIMITS
    // ============================================================================

    /** Maximum events that can be created per day */
    DEFAULT_MAX_EVENTS_PER_DAY: 100,

    /** Maximum audit log entries returned per page */
    MAX_AUDIT_LOGS_PER_PAGE: 100,

    /** Maximum tickets shown in event detail admin view */
    MAX_TICKETS_IN_ADMIN_VIEW: 500,

    // ============================================================================
    // API
    // ============================================================================

    /** Rate limit: requests per period */
    RATE_LIMIT_REQUESTS: 100,

    /** Rate limit: period in seconds */
    RATE_LIMIT_PERIOD_SECONDS: 60,
} as const;

// Type for config values
export type ConfigType = typeof CONFIG;
