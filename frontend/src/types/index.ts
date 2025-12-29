// User types
export type UserRole = 'user' | 'admin';
export type Chain = 'SOL' | 'ETH' | 'BSC' | 'TRC';

export interface User {
  id: string;
  email: string;
  walletAddress: string | null;
  preferredChain: Chain;
  role: UserRole;
  createdAt?: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Event types
export type EventCategory = 'sports' | 'finance' | 'crypto' | 'politics' | 'entertainment' | 'news' | 'other';
export type EventStatus = 'draft' | 'upcoming' | 'open' | 'locked' | 'resolved' | 'cancelled';

export interface EventOption {
  id: string;
  eventId: string;
  optionId: string;
  label: string;
  ticketLimit: number;
  ticketsSold: number;
  poolAmount: number;
  isWinner: boolean;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  ticketPrice: number;
  imageUrl?: string;
  startTime: string;
  lockTime: string;
  eventTime: string;
  status: EventStatus;
  winningOption?: string;
  resolvedAt?: string;
  totalPool: number;
  options: EventOption[];
  ticketCount?: number;
}

// Ticket types
export type TicketStatus = 'active' | 'won' | 'lost' | 'claimed' | 'refunded';

export interface Ticket {
  id: string;
  serialNumber: string;
  eventId: string;
  optionId: string;
  optionLabel: string;
  userId: string;
  walletAddress: string;
  chain: Chain;
  purchasePrice: number;
  purchaseTx: string;
  status: TicketStatus;
  payoutAmount?: number;
  claimTx?: string;
  claimedAt?: string;
  createdAt: string;
  event?: {
    id: string;
    title: string;
    status: EventStatus;
    winningOption?: string;
    eventTime: string;
  };
  option?: {
    optionId: string;
    label: string;
    isWinner: boolean;
  };
  user?: {
    email: string;
    walletAddress: string;
  };
}

// Admin dashboard types
export interface DashboardOverview {
  totalUsers: number;
  totalEvents: number;
  totalTickets: number;
  activeEvents: number;
  pendingResolution: number;
  totalVolume: number;
  totalWinners: number;
  totalLosers: number;
  totalPayouts: number;
}

export interface DashboardTicketStats {
  today: number;
  week: number;
  month: number;
}

export interface SalesTrend {
  date: string;
  ticketCount: number;
  volume: number;
}

export interface DashboardData {
  overview: DashboardOverview;
  ticketStats: DashboardTicketStats;
  salesTrend: SalesTrend[];
  recentActivity: AdminAuditLog[];
  topEvents: Event[];
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  admin?: {
    email: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: Pagination;
}

// Filter types
export interface EventFilters {
  status?: EventStatus;
  category?: EventCategory;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BetFilters {
  eventId?: string;
  userId?: string;
  status?: TicketStatus;
  walletAddress?: string;
  winnersOnly?: boolean;
  losersOnly?: boolean;
  unclaimedOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Form types
export interface CreateEventForm {
  title: string;
  description?: string;
  category: EventCategory;
  ticketPrice?: number;
  imageUrl?: string;
  options: { label: string; ticketLimit: number }[];
  startTime: string;
  lockTime: string;
  eventTime: string;
  status?: 'draft' | 'upcoming';
  isJackpot?: boolean;
}

export interface ResolveEventForm {
  winningOption: string;
}
