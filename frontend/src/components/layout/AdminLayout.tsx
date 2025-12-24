import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Bell,
  Search,
  Trophy,
  Gift,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/markets', icon: Trophy, label: 'Jackpot Manager' },
  { path: '/admin/events', icon: Calendar, label: 'Events' },
  { path: '/admin/bets', icon: Ticket, label: 'Bets & Winners' },
  { path: '/admin/payment-issues', icon: AlertTriangle, label: 'Payment Issues' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/dashboard', icon: Gift, label: 'My Winnings' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { disconnect } = useWallet();
  const navigate = useNavigate();

  const handleDisconnect = () => {
    localStorage.removeItem('betpot_wallet');
    disconnect();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - solid background for visibility */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300',
        // Desktop: dark theme
        'lg:bg-dark-900 lg:border-r lg:border-dark-800',
        // Mobile: solid white background for visibility
        'bg-white lg:bg-dark-900 shadow-2xl lg:shadow-none',
        sidebarOpen ? 'w-64' : 'w-20',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 lg:border-dark-800">
          {sidebarOpen && (
            <span className="text-xl font-bold text-gray-900 lg:text-transparent lg:bg-clip-text lg:bg-gradient-to-r lg:from-primary-400 lg:to-accent-400">BetPot Admin</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hover:bg-dark-800 text-gray-500 lg:text-dark-400 hover:text-gray-900 lg:hover:text-white hidden lg:flex"
          >
            <ChevronLeft className={clsx('w-5 h-5 transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                isActive
                  ? 'bg-brand-100 lg:bg-primary-500/10 text-brand-700 lg:text-primary-400 border border-brand-200 lg:border-primary-500/20'
                  : 'text-gray-600 lg:text-dark-400 hover:text-gray-900 lg:hover:text-white hover:bg-gray-100 lg:hover:bg-dark-800'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200 lg:border-dark-800">
          <div className={clsx('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
              A
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 lg:text-white truncate">Admin</p>
                <p className="text-xs text-gray-500 lg:text-dark-400 capitalize">Wallet Connected</p>
              </div>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            className={clsx(
              'mt-4 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 lg:text-dark-400 hover:text-red-500 hover:bg-red-50 lg:hover:bg-dark-800 transition-all',
              !sidebarOpen && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Disconnect</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-dark-900/50 backdrop-blur-xl border-b border-dark-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-2 w-64">
              <Search className="w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm text-white placeholder-dark-400 w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Back to site */}
            <NavLink
              to="/"
              className="btn btn-secondary text-sm"
            >
              Back to Site
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
