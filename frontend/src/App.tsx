import { useEffect, useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuthStore } from '@/stores/authStore';

// Layouts
import { MainLayout } from '@/components/layout/MainLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

// Public pages
import { HomePage } from '@/pages/HomePage';
import { EventsPage } from '@/pages/EventsPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { JackpotPage } from '@/pages/JackpotPage';
import { TestnetGuidePage } from '@/pages/TestnetGuidePage';
import { EventChatPage } from '@/pages/EventChatPage';

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminEvents } from '@/pages/admin/AdminEvents';
import { AdminEventDetail } from '@/pages/admin/AdminEventDetail';
import { AdminBets } from '@/pages/admin/AdminBets';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminMarkets } from '@/pages/admin/AdminMarkets';
import { AdminPaymentIssues } from '@/pages/admin/AdminPaymentIssues';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

// Admin wallet addresses (whitelist)
const ADMIN_WALLETS = [
  '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2',
  'CJpMo2ANF1Q614szsj9jU7qkaWM8RMTTgF3AtKM7Lpw',
  '4Gw23RWwuam8DeRyjXxMNmccaH6f1u82jMDkVJxQ4SGR',
  'GJrjFmeqSvLwDdRJiQFoYXUiRQgF95bE9NddZfEsJQvz',
];

// Session management hook - tracks activity and auto-logout after 2 hours
function useSessionManager() {
  const { updateActivity, checkSessionTimeout, isAuthenticated } = useAuthStore();

  const handleActivity = useCallback(() => {
    if (isAuthenticated) {
      updateActivity();
    }
  }, [isAuthenticated, updateActivity]);

  useEffect(() => {
    // Check session on mount and when window regains focus
    const checkSession = () => {
      if (checkSessionTimeout()) {
        toast.error('Session expired. Please sign in again.');
      }
    };

    // Check immediately on mount
    checkSession();

    // Check when user returns to the page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    // Track user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [handleActivity, checkSessionTimeout]);
}

// Admin route wrapper - waits for wallet to connect before redirecting
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { publicKey, connected, connecting } = useWallet();
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Check if this user was previously an admin (stored on successful admin access)
  const wasAdmin = typeof window !== 'undefined' &&
    localStorage.getItem('betpot_admin_session') === 'true';

  // Store admin session when successfully connected as admin
  useEffect(() => {
    if (connected && publicKey && ADMIN_WALLETS.includes(publicKey.toBase58())) {
      localStorage.setItem('betpot_admin_session', 'true');
    }
  }, [connected, publicKey]);

  // Wait for wallet to reconnect
  useEffect(() => {
    // If already connected as admin, stop waiting immediately
    if (connected && publicKey && ADMIN_WALLETS.includes(publicKey.toBase58())) {
      setIsInitializing(false);
      return;
    }

    // If was previously an admin, wait longer for wallet to reconnect
    // Otherwise, use shorter timeout
    const timeout = wasAdmin ? 10000 : 2000;

    const timer = setTimeout(() => {
      setIsInitializing(false);
      setHasTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [connected, publicKey, wasAdmin]);

  // Show loading while waiting for wallet
  if (isInitializing || connecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Connecting wallet...</p>
          {wasAdmin && <p className="text-text-muted text-sm mt-2">Please approve in your wallet</p>}
        </div>
      </div>
    );
  }

  // If not connected after timeout, clear admin session and redirect
  if (!connected || !publicKey) {
    if (hasTimedOut && wasAdmin) {
      localStorage.removeItem('betpot_admin_session');
    }
    return <Navigate to="/" replace />;
  }

  // Check if wallet is admin
  if (!ADMIN_WALLETS.includes(publicKey.toBase58())) {
    localStorage.removeItem('betpot_admin_session');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  // Enable session management
  useSessionManager();

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/jackpot" element={<JackpotPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/testnet-guide" element={<TestnetGuidePage />} />
        <Route path="/events/:eventId/chat" element={<EventChatPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="markets" element={<AdminMarkets />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="events/:id" element={<AdminEventDetail />} />
        <Route path="bets" element={<AdminBets />} />
        <Route path="payment-issues" element={<AdminPaymentIssues />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            className: '!bg-white !text-gray-800 !border !border-gray-200 !shadow-lg',
            duration: 4000,
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
