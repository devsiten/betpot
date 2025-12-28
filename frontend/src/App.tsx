import { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useWallet } from '@/providers/SolanaProvider';
import { useAuthStore } from '@/stores/authStore';
import { ThemeProvider } from '@/context/ThemeContext';

// Layouts
import { MainLayout } from '@/components/layout/MainLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

// Public pages
import { HomePage } from '@/pages/HomePage';
import { EventsPage } from '@/pages/EventsPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { JackpotPage } from '@/pages/JackpotPage';
import { JackpotResultsPage } from '@/pages/JackpotResultsPage';
import { TestnetGuidePage } from '@/pages/TestnetGuidePage';
import { EventChatPage } from '@/pages/EventChatPage';
import { HowItWorksPage } from '@/pages/HowItWorksPage';
import { NewsPage } from '@/pages/NewsPage';
import { BetPotNewsPage, BetPotNewsPostPage } from '@/pages/BetPotNewsPage';

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminEvents } from '@/pages/admin/AdminEvents';
import { AdminEventDetail } from '@/pages/admin/AdminEventDetail';
import { AdminBets } from '@/pages/admin/AdminBets';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminMarkets } from '@/pages/admin/AdminMarkets';
import { AdminPaymentIssues } from '@/pages/admin/AdminPaymentIssues';
import { AdminGuidePage } from '@/pages/admin/AdminGuidePage';
import { AdminBlogManager } from '@/pages/admin/AdminBlogManager';

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
  '9B7SLBvupwfUGxYfxmK1VRWx6BtbEinRrx5u973JquKj',
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

// Admin route wrapper - instant check, no waiting
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { publicKey, connected } = useWallet();

  // Not connected or not admin - redirect immediately
  if (!connected || !publicKey || !ADMIN_WALLETS.includes(publicKey.toBase58())) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Dashboard with admin sidebar for admins only
function AdminDashboardWrapper() {
  const { publicKey, connected } = useWallet();

  // Check if user is admin
  const isAdmin = connected && publicKey && ADMIN_WALLETS.includes(publicKey.toBase58());

  // If admin, redirect to admin winnings page which has sidebar
  if (isAdmin) {
    return <Navigate to="/admin/winnings" replace />;
  }

  // Regular user - just show dashboard without admin sidebar
  return <DashboardPage />;
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
        <Route path="/jackpot/results" element={<JackpotResultsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/dashboard" element={<AdminDashboardWrapper />} />
        <Route path="/testnet-guide" element={<TestnetGuidePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/betpot-news" element={<BetPotNewsPage />} />
        <Route path="/betpot-news/:id" element={<BetPotNewsPostPage />} />
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
        <Route path="winnings" element={<DashboardPage />} />
        <Route path="guide" element={<AdminGuidePage />} />
        <Route path="blog" element={<AdminBlogManager />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
          <Toaster
            position="top-right"
            toastOptions={{
              className: '!bg-white dark:!bg-gray-800 !text-gray-800 dark:!text-white !border !border-gray-200 dark:!border-gray-700 !shadow-lg',
              duration: 4000,
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
