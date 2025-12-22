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

  // ========== TICKETS ==========

  async purchaseTicket(params: {
    eventId: string;
    optionId: string;
    quantity: number;
    walletAddress: string;
    chain: string;
    purchaseTx: string;
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

  async lockEvent(id: string) {
    const { data } = await this.client.post<ApiResponse<{ message: string }>>(`/admin/events/${id}/lock`);
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
    const { data } = await this.client.get<ApiResponse<Ticket[]> & { pagination: Pagination }>('/admin/bets', {
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
}

export const api = new ApiService();
export default api;
