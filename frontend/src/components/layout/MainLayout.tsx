import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Calendar,
  Ticket,
  LogOut,
  Settings,
  Wallet,
  Trophy,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import clsx from 'clsx';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/authStore';
import { NotificationBell } from '@/components/NotificationBell';
import { MyBetsDropdown } from '@/components/MyBetsDropdown';
import { useTheme } from '@/context/ThemeContext';
import toast from 'react-hot-toast';

// Use the official Solana wallet adapter modal for stability
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Custom Connect Wallet button that uses the official modal
function ConnectButton() {
  const { connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected) {
    return null; // Don't show if connected - we handle connected state elsewhere
  }

  return (
    <button
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="flex items-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 border border-gray-200 dark:border-gray-700 whitespace-nowrap"
    >
      <Wallet className="w-4 h-4" />
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

// Theme Toggle Button
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-background-secondary dark:hover:bg-gray-800 text-text-muted hover:text-text-primary transition-all"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}

// Admin wallet addresses (whitelist)
const ADMIN_WALLETS = [
  '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2',
  'CJpMo2ANF1Q614szsj9jU7qkaWM8RMTTgF3AtKM7Lpw',
  '4Gw23RWwuam8DeRyjXxMNmccaH6f1u82jMDkVJxQ4SGR',
  'GJrjFmeqSvLwDdRJiQFoYXUiRQgF95bE9NddZfEsJQvz',
];

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { publicKey, connected, disconnect, signMessage } = useWallet();
  const { walletLogin, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Check if connected wallet is admin
  const isAdmin = () => {
    if (!publicKey) return false;
    return ADMIN_WALLETS.includes(publicKey.toBase58());
  };

  // Sign message and authenticate with backend (called manually by user)
  const handleSignIn = async () => {
    if (!publicKey || !signMessage || isSigningIn) return;

    setIsSigningIn(true);

    try {
      const timestamp = Date.now();
      const message = `Sign this message to login to BETPOT: ${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);
      const walletAddress = publicKey.toBase58();

      await walletLogin(walletAddress, signature, message);
      localStorage.setItem('betpot_wallet', walletAddress);
      // No success toast needed - user can see they're signed in
    } catch (error: unknown) {
      console.error('Sign/login failed:', error);
      if (error instanceof Error && error.message?.includes('User rejected')) {
        toast.error('Signature rejected');
      } else {
        toast.error('Sign in failed - please try again');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Track if wallet was ever connected in this session
  const [wasConnected, setWasConnected] = useState(false);

  // Update wasConnected when wallet connects
  useEffect(() => {
    if (connected) {
      setWasConnected(true);
    }
  }, [connected]);

  // Only logout when wallet DISCONNECTS (was connected, now isn't)
  useEffect(() => {
    if (wasConnected && !connected && isAuthenticated) {
      console.log('Wallet disconnected, logging out');
      logout();
      localStorage.removeItem('betpot_wallet');
      localStorage.removeItem('betpot_token');
    }
  }, [connected, wasConnected, isAuthenticated, logout]);

  const handleDisconnect = () => {
    localStorage.removeItem('betpot_wallet');
    localStorage.removeItem('betpot_token');
    logout();
    disconnect();
    setUserMenuOpen(false);
    navigate('/');
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuOpen && !(e.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userMenuOpen]);

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/jackpot', label: 'Jackpot', icon: Trophy },
    { to: '/events', label: 'Markets', icon: Calendar },
    { to: '/how-it-works', label: 'How it Works', icon: BookOpen },
    { to: '/testnet-guide', label: 'Testnet Guide', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-background-card dark:bg-gray-900 border-b border-border dark:border-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-soft">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-xl font-semibold text-text-primary dark:text-white hidden sm:block">BETPOT</span>
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                        : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:bg-background-secondary dark:hover:bg-gray-800'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right Side - Theme Toggle & Wallet */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Desktop Wallet Area */}
              <div className="hidden md:flex items-center gap-3">
                {!connected ? (
                  <ConnectButton />
                ) : !isAuthenticated ? (
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="flex items-center gap-2 bg-positive-500 hover:bg-positive-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isSigningIn ? 'Signing...' : 'Sign In'}
                  </button>
                ) : (
                  <>
                    {/* Hide dropdowns on mobile - use mobile menu instead */}
                    <div className="hidden md:flex items-center gap-2">
                      <MyBetsDropdown />
                      <NotificationBell />
                    </div>
                    <NavLink
                      to={isAdmin() ? '/admin' : '/dashboard'}
                      className="flex items-center gap-2 btn btn-primary"
                    >
                      {isAdmin() ? (
                        <>
                          <Settings className="w-4 h-4" />
                          Admin Dashboard
                        </>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4" />
                          Dashboard
                        </>
                      )}
                    </NavLink>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-background-secondary dark:hover:bg-gray-800 text-text-primary dark:text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border dark:border-gray-800 bg-background-card dark:bg-gray-900 px-4 py-4 space-y-2">
            {/* Wallet Connect for Mobile */}
            {!connected ? (
              <div className="pb-4 border-b border-border dark:border-gray-800">
                <ConnectButton />
              </div>
            ) : !isAuthenticated ? (
              <button
                onClick={() => {
                  handleSignIn();
                  setMobileMenuOpen(false);
                }}
                disabled={isSigningIn}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-positive-500 hover:bg-positive-600 text-white disabled:opacity-50 mb-4"
              >
                <Wallet className="w-4 h-4" />
                {isSigningIn ? 'Signing...' : 'Sign In to Continue'}
              </button>
            ) : null}

            {/* Navigation Links */}
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
                    isActive
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                      : 'text-text-secondary dark:text-gray-400 hover:bg-background-secondary dark:hover:bg-gray-800 hover:text-text-primary dark:hover:text-white'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}

            {/* Dashboard and Admin Links for Authenticated Users */}
            {connected && isAuthenticated && (
              <div className="border-t border-border dark:border-gray-800 pt-4 mt-4 space-y-2">
                {/* Dashboard/Admin Dashboard */}
                <NavLink
                  to={isAdmin() ? '/admin' : '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
                      isActive
                        ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                        : 'text-text-secondary dark:text-gray-400 hover:bg-background-secondary dark:hover:bg-gray-800 hover:text-text-primary dark:hover:text-white'
                    )
                  }
                >
                  {isAdmin() ? (
                    <>
                      <Settings className="w-4 h-4" />
                      Admin Dashboard
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Dashboard
                    </>
                  )}
                </NavLink>
              </div>
            )}

            {/* Disconnect Button */}
            {connected && isAuthenticated && (
              <div className="border-t border-border dark:border-gray-800 pt-4 mt-4">
                <button
                  onClick={() => {
                    handleDisconnect();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-negative-500 dark:text-negative-400 hover:bg-negative-50 dark:hover:bg-negative-900/30"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border dark:border-gray-800 bg-background-card dark:bg-gray-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted dark:text-gray-400 font-medium">
              © {new Date().getFullYear()} BETPOT PROTOCOL
            </p>
            <span className="text-xs text-brand-500 dark:text-brand-400 font-medium px-2 py-1 bg-brand-50 dark:bg-brand-900/30 rounded">DEVNET</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
