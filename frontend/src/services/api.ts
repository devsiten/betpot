import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  ApiResponse,
  User,
  Event,
  Ticket,
  DashboardData,
  EventFilters,
  BetFilters,
  CreateEventForm,
  AdminAuditLog,
  Pagination,
} from '@/types';

// Direct backend URL - user needs to disable ad blocker if it blocks this domain
const API_URL = 'https://betpot-api.devsiten.workers.dev/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token and wallet address
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('betpot_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Also send wallet address from localStorage (set by wallet connection)
      const walletAddress = localStorage.getItem('betpot_wallet');
      if (walletAddress) {
        config.headers['X-Wallet-Address'] = walletAddress;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<unknown>>) => {
        if (error.response?.status === 401) {
          // Just clear the token, don't redirect (wallet auth handles this)
          localStorage.removeItem('betpot_token');
        }
        return Promise.reject(error);
      }
    );
  }

  // ========== AUTH ==========

  async register(email: string, password: string, walletAddress?: string) {
    const { data } = await this.client.post<ApiResponse<{ token: string; user: User }>>('/auth/register', {
      email,
      password,
      walletAddress,
    });
    return data;
  }

  async login(email: string, password: string) {
    const { data } = await this.client.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
      email,
      password,
    });
    return data;
  }

  async walletLogin(walletAddress: string, signature: string, message: string) {
    const { data } = await this.client.post<ApiResponse<{ token: string; user: User }>>('/auth/wallet-login', {
      walletAddress,
      signature,
      message,
    });
    return data;
  }

  async getMe() {
    const { data } = await this.client.get<ApiResponse<User>>('/auth/me');
    return data;
  }

  // ========== EVENTS (Public) ==========

  async getEvents(filters?: EventFilters) {
    const { data } = await this.client.get<ApiResponse<Event[]> & { pagination: Pagination }>('/events', {
      params: filters,
    });
    return data;
  }

  async getEvent(id: string) {
    const { data } = await this.client.get<ApiResponse<Event & { userTickets?: Ticket[] }>>(`/events/${id}`);
    return data;
  }

  async getEventPool(id: string) {
    const { data } = await this.client.get<ApiResponse<{
      eventId: string;
      totalPool: number;
      totalTickets: number;
      options: {
        optionId: string;
        label: string;
        ticketsSold: number;
        ticketsRemaining: number;
        poolAmount: number;
        percentage: number;
      }[];
    }>>(`/events/${id}/pool`);
    return data;
  }

  async getResolvedEvents(filters?: { category?: string; page?: number; limit?: number }) {
    const { data } = await this.client.get<ApiResponse<Event[]> & { pagination: Pagination }>('/events/history/resolved', {
      params: filters,
    });
    return data;
  }

  async getJackpot() {
    // Using "active" endpoint name to avoid ad blocker keyword filters on "jackpot"
    const { data } = await this.client.get<ApiResponse<Event & { ticketCount: number; totalPool: number } | null>>('/events/featured/active');
    return data;
  }

  async getJackpotResults() {
    const { data } = await this.client.get<ApiResponse<any[]>>('/events/jackpot/results');
    return data;
  }

  // ========== EXTERNAL SPORTS API ==========

  async getExternalSports() {
    const { data } = await this.client.get<ApiResponse<Array<{
      key: string;
      group: string;
      title: string;
      description: string;
      active: boolean;
    }>>>('/sports/odds-api/sports');
    return data;
  }

  async getExternalEvents(sport: string) {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      source: string;
      title: string;
      sport: string;
      sportKey: string;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      options: Array<{ label: string; type: string }>;
    }>>>(`/sports/odds-api/events/${sport}`);
    return data;
  }

  // Polymarket API - Crypto, Politics, Sports Prediction Markets
  async getPolymarketEvents(category?: string) {
    const url = category
      ? `/sports/polymarket/events/${category}`
      : '/sports/polymarket/events';
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      source: string;
      category?: string;
      title: string;
      description: string;
      image: string;
      startTime: string;
      endTime: string;
      volume: number;
      liquidity: number;
      active: boolean;
      options: Array<{ label: string; price: number; percentage: number }>;
      tags: string[];
    }>>>(url);
    return data;
  }

  // ========== POLYMARKET SPORTS API - Football & Other Sports ==========

  // Get all available sports leagues
  async getPolymarketSportsLeagues() {
    const { data } = await this.client.get<ApiResponse<{
      football: Array<{ id: string; name: string; code: string; country: string; priority: number }>;
      other: Array<{ id: string; name: string; code: string; type: string }>;
    }>>('/sports/polymarket/sports/leagues');
    return data;
  }

  // Get events for a specific league
  async getPolymarketSportsEvents(seriesId: string, limit?: number) {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      source: string;
      title: string;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      endTime: string;
      league: string;
      volume: number;
      liquidity: number;
      options: Array<{ label: string; type: string; price: number; percentage: number; marketId: string }>;
      spreads?: Array<{ label: string; price: number; line: number }>;
      totals?: Array<{ label: string; price: number; line: number }>;
    }>>>(`/sports/polymarket/sports/league/${seriesId}`, { params: { limit } });
    return data;
  }

  // Get all football events across top leagues
  async getAllFootballEvents(limit?: number) {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      source: string;
      title: string;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      league: string;
      volume: number;
      options: Array<{ label: string; type: string; price: number; percentage: number }>;
    }>>>('/sports/polymarket/sports/football/all', { params: { limit } });
    return data;
  }

  // Get trending sports events (for home page)
  async getTrendingSports(limit?: number) {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      source: string;
      title: string;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      league: string;
      volume: number;
      options: Array<{ label: string; type: string; price: number; percentage: number }>;
    }>>>('/sports/polymarket/sports/trending', { params: { limit } });
    return data;
  }

  // Get other sports events (NBA, NFL, UFC, etc.)
  async getOtherSportsEvents(sportCode: string, limit?: number) {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      source: string;
      title: string;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      options: Array<{ label: string; type: string; price: number; percentage: number }>;
    }>>>(`/sports/polymarket/sports/other/${sportCode}`, { params: { limit } });
    return data;
  }

  // Get LIVE matches (currently in progress) from API-Sports
  async getLiveMatches(limit?: number) {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      source: string;
      title: string;
      sport: string;
      league: string;
      leagueLogo: string;
      country: string;
      countryFlag: string;
      homeTeam: string;
      homeTeamLogo: string;
      awayTeam: string;
      awayTeamLogo: string;
      startTime: string;
      isLive: boolean;
      status: string;
      statusShort: string;
      elapsed: number | null; // Current minute
      homeScore: number | null;
      awayScore: number | null;
      homeWinning: boolean | null;
      awayWinning: boolean | null;
    }>>>('/sports/api-sports/live', { params: { limit } });
    return data;
  }

  async searchExternalEvents(query?: string, sport?: string) {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      source: string;
      title: string;
      sport: string;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      options: Array<{ label: string; type: string }>;
    }>>>('/sports/search', { params: { q: query, sport } });
    return data;
  }

  // Get match result by event title (for sports resolution)
  async getMatchResult(title: string): Promise<ApiResponse<{
    status: string;
    isLive: boolean;
    elapsed: number | null;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    score: string;
    winner: 'Home Win' | 'Away Win' | 'Draw';
  }>> {
    const { data } = await this.client.get('/sports/match-result', { params: { title } });
    return data;
  }

  // ========== TICKETS ==========

  async purchaseTicket(params: {
    eventId: string;
    optionId: string;
    quantity: number;
    walletAddress: string;
    chain: string;
    purchaseTx: string;
    solAmount?: number; // SOL amount for verification
  }) {
    const { data } = await this.client.post<ApiResponse<{
      tickets: { id: string; serialNumber: string; optionLabel: string; purchasePrice: number }[];
      totalCost: number;
      event: { id: string; title: string };
    }>>('/tickets/purchase', params);
    return data;
  }

  async getMyTickets(filters?: { status?: string; eventId?: string; page?: number; limit?: number }) {
    const { data } = await this.client.get<ApiResponse<Ticket[]> & { pagination: Pagination }>('/tickets/my-tickets', {
      params: filters,
    });
    return data;
  }

  async getMyStats() {
    const { data } = await this.client.get<ApiResponse<{
      totalTickets: number;
      totalSpent: number;
      activeTickets: number;
      wonTickets: number;
      lostTickets: number;
      claimedTickets: number;
      totalWinnings: number;
      unclaimedWinnings: number;
    }>>('/tickets/my-stats');
    return data;
  }

  async getClaimableTickets() {
    const { data } = await this.client.get<ApiResponse<{
      tickets: Ticket[];
      count: number;
      totalClaimable: number;
    }>>('/tickets/claimable/list');
    return data;
  }

  async claimTicket(ticketId: string, walletAddress: string, signature: string) {
    const { data } = await this.client.post<ApiResponse<{
      ticketId: string;
      payoutAmount: number;
      claimTx: string;
      walletAddress: string;
    }>>('/tickets/claim', {
      ticketId,
      walletAddress,
      signature,
    });
    return data;
  }

  async claimAllTickets(walletAddress: string, signature: string) {
    const { data } = await this.client.post<ApiResponse<{
      claimedCount: number;
      totalPayout: number;
      claimTx: string;
      walletAddress: string;
      ticketIds: string[];
    }>>('/tickets/claim-all', {
      walletAddress,
      signature,
    });
    return data;
  }

  // Verify payment and claim ticket if paid but not issued
  async verifyPayment(params: {
    transactionSignature: string;
    eventId: string;
    optionId: string;
    walletAddress: string;
  }): Promise<ApiResponse<{
    ticket: {
      id: string;
      serialNumber: string;
      eventId: string;
      eventTitle: string;
      optionLabel: string;
      purchasePrice: number;
      status: string;
    };
    message: string;
  }>> {
    const { data } = await this.client.post('/tickets/verify-payment', params);
    return data;
  }

  // ========== ADMIN ==========

  async getAdminDashboard() {
    const { data } = await this.client.get<ApiResponse<DashboardData>>('/admin/dashboard');
    return data;
  }

  async getAdminEvents(filters?: EventFilters) {
    const { data } = await this.client.get<ApiResponse<Event[]> & { pagination: Pagination }>('/admin/events', {
      params: filters,
    });
    return data;
  }

  // Get events pending resolution (locked + eventTime passed) - server-side filter
  async getAdminPendingResolve() {
    const { data } = await this.client.get<ApiResponse<Event[]> & { count: number }>('/admin/events/pending-resolve');
    return data;
  }

  // Get admin audit logs
  async getAdminAuditLogs(filters?: { page?: number; limit?: number; action?: string }) {
    const { data } = await this.client.get<ApiResponse<AdminAuditLog[]> & { pagination: Pagination }>('/admin/audit-logs', {
      params: filters,
    });
    return data;
  }

  async getAdminEvent(id: string) {
    const { data } = await this.client.get<ApiResponse<Event & { tickets: Ticket[] }>>(`/admin/events/${id}`);
    return data;
  }

  async createEvent(form: CreateEventForm) {
    const { data } = await this.client.post<ApiResponse<Event>>('/admin/events', form);
    return data;
  }

  async updateEvent(id: string, updates: Partial<CreateEventForm>) {
    const { data } = await this.client.put<ApiResponse<Event>>(`/admin/events/${id}`, updates);
    return data;
  }

  async setEventJackpot(id: string, isJackpot: boolean) {
    if (isJackpot) {
      const { data } = await this.client.post<ApiResponse<Event>>(`/admin/events/${id}/jackpot`);
      return data;
    } else {
      const { data } = await this.client.delete<ApiResponse<Event>>(`/admin/events/${id}/jackpot`);
      return data;
    }
  }

  async lockEvent(id: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>(`/admin/events/${id}/lock`);
    return data;
  }

  async unlockEvent(id: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>(`/admin/events/${id}/unlock`);
    return data;
  }

  async resolveEvent(id: string, winningOption: string) {
    const { data } = await this.client.post<ApiResponse<{
      eventId: string;
      winningOption: string;
      winningLabel: string;
      totalPool: number;
      losingPool: number;
      platformFee: number;
      distributedPool: number;
      payoutPerTicket: number;
      winnersCount: number;
      losersCount: number;
    }>>(`/admin/events/${id}/resolve`, { winningOption });
    return data;
  }

  // Two-admin approval workflow
  async getEventApprovals(eventId: string) {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      eventId: string;
      adminId: string;
      winningOption: string;
      approved: boolean;
      createdAt: string;
    }>>>(`/admin/events/${eventId}/approvals`);
    return data;
  }

  async submitApproval(eventId: string, winningOption: string) {
    const { data } = await this.client.post<ApiResponse<{
      message: string;
      approvals: any[];
      canResolve: boolean;
      requiredApprovals: number;
      currentApprovals: number;
    }>>(`/admin/events/${eventId}/submit-approval`, { winningOption });
    return data;
  }

  // User Lookup by wallet address
  async userLookup(wallet: string) {
    const { data } = await this.client.get<ApiResponse<{
      user: {
        id: string;
        email: string;
        walletAddress: string;
        username: string | null;
        role: string;
        createdAt: string;
        lastLogin: string | null;
      };
      stats: {
        totalBets: number;
        totalWon: number;
        totalLost: number;
        totalPending: number;
        winRate: string;
        totalSpent: number;
        totalWinnings: number;
        unclaimedWinnings: number;
      };
      tickets: Array<{
        id: string;
        eventTitle: string;
        eventId: string;
        optionLabel: string;
        optionId: string;
        purchasePrice: number;
        purchaseTx: string;
        status: string;
        payoutAmount: number;
        claimedAt: string | null;
        createdAt: string;
      }>;
      failedTransactions: any[];
    }>>('/admin/users/lookup', { params: { wallet } });
    return data;
  }

  async cancelEvent(id: string, reason: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>(`/admin/events/${id}/cancel`, { reason });
    return data;
  }

  async createJackpotFromExternal(params: {
    externalId: string;
    externalSource: string;
    title: string;
    description: string;
    category: string;
    options: Array<{ label: string; ticketLimit: number; percentage?: number }>;
    eventTime: string;
    ticketPrice: number;
    isJackpot: boolean;
    externalData: unknown;
  }) {
    const { data } = await this.client.post<ApiResponse<Event>>('/admin/events/from-external', params);
    return data;
  }

  async getAdminBets(filters?: BetFilters) {
    const { data } = await this.client.get<ApiResponse<Ticket[]> & {
      pagination: Pagination;
      stats?: {
        totalTickets: number;
        totalWon: number;
        totalLost: number;
        totalClaimed: number;
        totalUnclaimed: number;
        totalPayout: number;
      };
    }>('/admin/bets', {
      params: filters,
    });
    return data;
  }

  async getEventWinners(eventId: string, filters?: { sortBy?: string; sortOrder?: string; claimed?: string }) {
    const { data } = await this.client.get<ApiResponse<{
      winners: Ticket[];
      summary: {
        totalWinners: number;
        totalPayout: number;
        claimed: number;
        unclaimed: number;
      };
    }>>(`/admin/events/${eventId}/winners`, { params: filters });
    return data;
  }

  async getEventLosers(eventId: string) {
    const { data } = await this.client.get<ApiResponse<{
      losers: Ticket[];
      summary: {
        totalLosers: number;
        totalLost: number;
      };
    }>>(`/admin/events/${eventId}/losers`);
    return data;
  }

  async getAdminUsers(filters?: { search?: string; role?: string; page?: number; limit?: number }) {
    const { data } = await this.client.get<ApiResponse<(User & {
      stats: {
        totalTickets: number;
        totalWins: number;
        totalSpent: number;
        totalWon: number;
      };
    })[]> & { pagination: Pagination }>('/admin/users', { params: filters });
    return data;
  }

  async updateUserRole(userId: string, role: string) {
    const { data } = await this.client.put<ApiResponse<{ message: string }>>(`/admin/users/${userId}/role`, { role });
    return data;
  }

  async getAuditLogs(filters?: { adminId?: string; action?: string; entityType?: string; page?: number; limit?: number }) {
    const { data } = await this.client.get<ApiResponse<AdminAuditLog[]> & { pagination: Pagination }>('/admin/audit-logs', {
      params: filters,
    });
    return data;
  }

  async getPlatformSettings() {
    const { data } = await this.client.get<ApiResponse<{
      ticketPrice: number;
      platformFee: number;
      maxEventsPerDay: number;
      claimDelayHours: number;
      maintenanceMode: boolean;
    }>>('/admin/settings');
    return data;
  }

  async updatePlatformSettings(settings: {
    ticketPrice?: number;
    platformFee?: number;
    maxEventsPerDay?: number;
    claimDelayHours?: number;
    maintenanceMode?: boolean;
  }) {
    const { data } = await this.client.put<ApiResponse<{ message: string }>>('/admin/settings', settings);
    return data;
  }

  // ========== FAILED TRANSACTIONS ==========

  async getFailedTransactions(status: string = 'pending') {
    const { data } = await this.client.get<ApiResponse<{
      id: string;
      walletAddress: string;
      transactionSignature: string;
      eventId: string;
      optionId: string;
      optionLabel: string | null;
      quantity: number;
      amount: number;
      chain: string;
      errorMessage: string;
      status: string;
      resolvedBy: string | null;
      resolvedAt: string | null;
      resolutionNote: string | null;
      createdAt: string;
      event?: { id: string; title: string; status: string };
    }[]> & { count: number }>('/admin/failed-transactions', { params: { status } });
    return data;
  }

  async resolveFailedTransaction(id: string, note?: string) {
    const { data } = await this.client.post<ApiResponse<{
      ticketIds: string[];
      quantity: number;
      event: { id: string; title: string };
    }>>(`/admin/failed-transactions/${id}/resolve`, { note });
    return data;
  }

  async refundFailedTransaction(id: string, refundTx?: string, note?: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>(`/admin/failed-transactions/${id}/refund`, { refundTx, note });
    return data;
  }

  async rejectFailedTransaction(id: string, reason: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>(`/admin/failed-transactions/${id}/reject`, { reason });
    return data;
  }

  // Notifications API
  async getNotifications(limit = 20) {
    const { data } = await this.client.get<ApiResponse<any>>(`/notifications?limit=${limit}`);
    return data;
  }

  async markNotificationRead(id: string) {
    const { data } = await this.client.put<ApiResponse<any>>(`/notifications/${id}/read`);
    return data;
  }

  async markAllNotificationsRead() {
    const { data } = await this.client.put<ApiResponse<any>>(`/notifications/read-all`);
    return data;
  }

  // ============================================================================
  // NEWS (External)
  // ============================================================================

  async getNews(category: string = 'sports') {
    const { data } = await this.client.get<ApiResponse<any>>(`/news?category=${category}`);
    return data;
  }

  // ============================================================================
  // BLOG (BetPot News/Blog)
  // ============================================================================

  async getBlogPosts() {
    const { data } = await this.client.get<ApiResponse<any>>(`/blog`);
    return data;
  }

  async getBlogPost(id: string) {
    const { data } = await this.client.get<ApiResponse<any>>(`/blog/${id}`);
    return data;
  }

  async getAdminBlogPosts() {
    const { data } = await this.client.get<ApiResponse<any>>(`/blog/admin/all`);
    return data;
  }

  async createBlogPost(post: { title: string; content: string; excerpt?: string; imageUrl?: string; category?: string; isPublished?: boolean }) {
    const { data } = await this.client.post<ApiResponse<any>>(`/blog/admin/create`, post);
    return data;
  }

  async updateBlogPost(id: string, post: Partial<{ title: string; content: string; excerpt?: string; imageUrl?: string; category?: string; isPublished?: boolean }>) {
    const { data } = await this.client.put<ApiResponse<any>>(`/blog/admin/${id}`, post);
    return data;
  }

  async deleteBlogPost(id: string) {
    const { data } = await this.client.delete<ApiResponse<any>>(`/blog/admin/${id}`);
    return data;
  }

  // ============================================================================
  // IMAGE UPLOAD
  // ============================================================================

  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await this.client.post<ApiResponse<{ url: string; filename: string }>>(`/upload/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }

  // ============================================================================
  // USER PROFILE
  // ============================================================================

  async getProfile() {
    const { data } = await this.client.get<ApiResponse<{
      id: string;
      email: string;
      username: string | null;
      displayName: string | null;
      walletAddress: string | null;
      referralCode: string | null;
      discordId: string | null;
      discordUsername: string | null;
      discordRole: string | null;
      twitterHandle: string | null;
      twitterVerified: boolean;
      volumePoints: number;
      referralPoints: number;
    }>>('/auth/profile');
    return data;
  }

  async updateProfile(updates: { username?: string; displayName?: string }) {
    const { data } = await this.client.put<ApiResponse<{ message: string }>>('/auth/profile', updates);
    return data;
  }

  async deleteAccount() {
    const { data } = await this.client.delete<ApiResponse<{ message: string }>>('/auth/account');
    return data;
  }

  // ============================================================================
  // REFERRAL SYSTEM
  // ============================================================================

  async getReferralStats() {
    const { data } = await this.client.get<ApiResponse<{
      referralCode: string;
      discordRole: string | null;
      discordUsername: string | null;
      discordConnected: boolean;
      twitterHandle: string | null;
      twitterVerified: boolean;
      volumePoints: number;
      referralPoints: number;
      totalReferrals: number;
      verifiedReferrals: number;
      pendingReferrals: number;
      referralLimit: number;
    }>>('/referrals/stats');
    return data;
  }

  async getMyReferrals() {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      referredUser: {
        walletAddress: string;
        displayName: string | null;
      };
      discordVerified: boolean;
      twitterVerified: boolean;
      pointsAwarded: boolean;
      createdAt: string;
    }>>>('/referrals/my-referrals');
    return data;
  }

  async submitTwitterVerification(twitterHandle: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>('/referrals/twitter-verification', {
      twitterHandle,
    });
    return data;
  }

  async applyReferralCode(code: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>('/referrals/apply-code', { code });
    return data;
  }

  // ============================================================================
  // ADMIN - TWITTER VERIFICATIONS
  // ============================================================================

  async getTwitterVerifications(status: string = 'pending') {
    const { data } = await this.client.get<ApiResponse<Array<{
      id: string;
      userId: string;
      twitterHandle: string;
      status: string;
      user: { walletAddress: string; email: string; displayName: string | null };
      createdAt: string;
    }>> & { count: number }>('/admin/twitter-verifications', { params: { status } });
    return data;
  }

  async approveTwitterVerification(id: string, note?: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>(`/admin/twitter-verifications/${id}/approve`, { note });
    return data;
  }

  async rejectTwitterVerification(id: string, reason: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>(`/admin/twitter-verifications/${id}/reject`, { reason });
    return data;
  }
}

export const api = new ApiService();
export default api;
