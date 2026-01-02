import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { BetPotLogoIcon } from '@/components/icons/BetPotLogo';
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
import { useWallet } from '@/providers/SolanaProvider';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import clsx from 'clsx';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/authStore';
import { NotificationBell } from '@/components/NotificationBell';
import { MyBetsDropdown } from '@/components/MyBetsDropdown';
import { useTheme } from '@/context/ThemeContext';
import toast from 'react-hot-toast';

// Standard Solana Wallet Connect Button - works on all devices
function ConnectButton() {
  const { connected } = useWallet();

  if (connected) {
    return null; // Don't show if connected - we handle connected state elsewhere
  }

  return (
    <WalletMultiButton
      style={{
        whiteSpace: 'nowrap',
        background: '#FFFFFF',
        color: '#1a1a2e',
        fontWeight: 600,
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '14px',
        height: 'auto',
        minWidth: 'max-content',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        border: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        lineHeight: 1.2
      }}
    >
      Connect Wallet
    </WalletMultiButton>
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
  '9B7SLBvupwfUGxYfxmK1VRWx6BtbEinRrx5u973JquKj',
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

      // Request signature from wallet
      let signatureBytes;
      try {
        signatureBytes = await signMessage(messageBytes);
      } catch (signError: any) {
        console.error('Signature error:', signError);
        // Handle specific wallet errors
        if (signError?.message?.includes('User rejected') || signError?.name === 'WalletSignTransactionError') {
          toast.error('Signature rejected by user');
        } else if (signError?.name === 'WalletSignMessageError') {
          toast.error('Wallet error - please reconnect and try again');
          // Try to reconnect wallet
          disconnect();
        } else {
          toast.error('Failed to sign message - please try again');
        }
        return;
      }

      const signature = bs58.encode(signatureBytes);
      const walletAddress = publicKey.toBase58();

      await walletLogin(walletAddress, signature, message);
      localStorage.setItem('betpot_wallet', walletAddress);
      toast.success('Signed in successfully!');
    } catch (error: unknown) {
      console.error('Sign/login failed:', error);
      if (error instanceof Error) {
        if (error.message?.includes('User rejected')) {
          toast.error('Signature rejected');
        } else if (error.message?.includes('500') || error.message?.includes('server')) {
          toast.error('Server error - please try again');
        } else {
          toast.error('Sign in failed - please try again');
        }
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
            <NavLink to="/" className="flex items-center gap-2 group">
              <BetPotLogoIcon size={36} />
              <span className="text-xl font-bold text-transparent bg-clip-text hidden sm:block" style={{ backgroundImage: 'linear-gradient(135deg, #2DD4A8 0%, #22B8CF 35%, #3B82F6 65%, #A855F7 100%)' }}>BetPot</span>
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

      {/* Footer - Compact */}
      <footer className="border-t border-border dark:border-gray-800 bg-background-card dark:bg-gray-900 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Logo + DEVNET */}
            <div className="flex items-center gap-3">
              <Link to="/">
                <BetPotLogoIcon size={32} />
              </Link>
              <span className="text-xs text-brand-500 dark:text-brand-400 font-medium px-2 py-1 bg-brand-50 dark:bg-brand-900/30 rounded">DEVNET</span>
            </div>

            {/* Center: Legal icons + X icon */}
            <div className="flex items-center gap-4">
              <Link to="/disclaimer" className="text-text-muted dark:text-gray-400 hover:text-yellow-500 transition-colors" title="Disclaimer">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </Link>
              <Link to="/privacy" className="text-text-muted dark:text-gray-400 hover:text-blue-500 transition-colors" title="Privacy Policy">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </Link>
              <Link to="/terms" className="text-text-muted dark:text-gray-400 hover:text-purple-500 transition-colors" title="Terms of Service">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </Link>
              <a
                href="https://x.com/BetPotWeb3wl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted dark:text-gray-400 hover:text-brand-500 transition-colors"
                title="@BetPotWeb3wl"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            {/* Right: Copyright */}
            <p className="text-xs text-text-muted dark:text-gray-500">
              © {new Date().getFullYear()} BETPOT
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
