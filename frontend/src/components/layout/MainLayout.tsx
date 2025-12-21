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
  ChevronLeft,
  Trophy,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import clsx from 'clsx';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

// Custom Connect Button - White Style
function ConnectButton() {
  const { setVisible } = useWalletModal();
  return (
    <button
      onClick={() => setVisible(true)}
      className="flex items-center gap-2 bg-white hover:bg-gray-100 text-[#1a2332] font-semibold text-sm px-5 py-2.5 rounded-lg transition-all"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
}

// Admin wallet addresses (whitelist)
const ADMIN_WALLETS = [
  '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2',
];

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      toast.success('Signed in successfully!');
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

  // Clear auth state when wallet disconnects
  useEffect(() => {
    if (!connected && isAuthenticated) {
      logout();
      localStorage.removeItem('betpot_wallet');
      localStorage.removeItem('betpot_token');
    }
  }, [connected, isAuthenticated, logout]);

  const handleDisconnect = () => {
    localStorage.removeItem('betpot_wallet');
    localStorage.removeItem('betpot_token');
    logout();
    disconnect();
    navigate('/');
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/jackpot', label: 'Jackpot', icon: Trophy },
    { to: '/events', label: 'Markets', icon: Calendar },
    // Only show user Dashboard if connected AND not admin
    ...(connected && !isAdmin() ? [
      { to: '/dashboard', label: 'Dashboard', icon: Ticket },
    ] : []),
    // Admin Dashboard for admins only
    ...(isAdmin() ? [{ to: '/admin', label: 'Admin Dashboard', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#1a2332] flex">
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          'hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-[#151d2b] border-r border-white/10 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            {sidebarOpen && (
              <span className="text-xl font-semibold text-white">BETPOT</span>
            )}
          </NavLink>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <ChevronLeft className={clsx('w-5 h-5 transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all',
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'text-white hover:text-cyan-400 hover:bg-cyan-900/30 border border-transparent'
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* How It Works */}
          {sidebarOpen && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-gray-400 text-xs font-medium px-4 mb-4">How It Works</h3>
              <div className="space-y-3">
                <div className="flex gap-3 px-4">
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 text-xs text-teal-400 font-bold">1</div>
                  <div>
                    <p className="text-white text-sm font-medium">Place Your Bet</p>
                    <p className="text-gray-500 text-xs">Pick a match & choose winner</p>
                  </div>
                </div>
                <div className="flex gap-3 px-4">
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 text-xs text-teal-400 font-bold">2</div>
                  <div>
                    <p className="text-white text-sm font-medium">Wait for Result</p>
                    <p className="text-gray-500 text-xs">Match ends, winner is decided</p>
                  </div>
                </div>
                <div className="flex gap-3 px-4">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 text-xs text-green-400 font-bold">3</div>
                  <div>
                    <p className="text-white text-sm font-medium">Collect Winnings</p>
                    <p className="text-gray-500 text-xs">If you win, claim your money</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          {sidebarOpen && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4 px-4">
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Quick Links</h4>
                <ul className="space-y-1 text-sm text-white">
                  <li><NavLink to="/jackpot" className="hover:text-teal-400 transition-colors">🔥 Jackpot</NavLink></li>
                  <li><NavLink to="/events" className="hover:text-teal-400 transition-colors">All Markets</NavLink></li>
                  {connected && <li><NavLink to="/dashboard" className="hover:text-teal-400 transition-colors">My Bets</NavLink></li>}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Docs</h4>
                <ul className="space-y-1 text-sm text-white">
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Whitepaper</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition-colors">Audits</a></li>
                </ul>
              </div>

              <div className="pt-4 border-t border-cyan-900/30">
                <p className="text-xs text-cyan-400/60 font-mono uppercase font-bold">
                  © {new Date().getFullYear()} BETPOT PROTOCOL
                </p>
                <p className="text-xs text-yellow-400/60 font-mono mt-1">🔗 DEVNET</p>
              </div>
            </div>
          )}
        </nav>

        {/* User section - Connected Wallet */}
        {connected && publicKey && (
          <div className="p-4 border-t border-cyan-900/30 bg-[#071220]">
            <div className="space-y-3">
              <div className={clsx(
                'flex items-center gap-3 p-3 bg-cyan-900/30 rounded-xl border border-cyan-500/20',
                !sidebarOpen && 'justify-center'
              )}>
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 blur-sm opacity-50 rounded-full"></div>
                  <Wallet className="relative w-4 h-4 text-green-400 flex-shrink-0" />
                </div>
                {sidebarOpen && (
                  <span className="text-sm text-white font-mono truncate tracking-tight font-bold">
                    {formatAddress(publicKey.toBase58())}
                  </span>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 w-full transition-all',
                  !sidebarOpen && 'justify-center px-0'
                )}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span>Disconnect</span>}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a1628] border-b border-cyan-900/30">
        <div className="flex items-center justify-between px-4 h-16">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-mono font-bold text-lg">B</span>
            </div>
            <span className="text-lg font-bold tracking-tighter text-white">BETPOT</span>
          </NavLink>

          {/* Mobile Wallet Button */}
          {!connected ? (
            <ConnectButton />
          ) : (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-cyan-900/30 text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && connected && (
          <div className="border-t border-cyan-900/30 bg-[#0a1628] px-4 py-4 space-y-2">
            {/* Sign In button at top if not authenticated */}
            {!isAuthenticated && (
              <button
                onClick={() => {
                  handleSignIn();
                  setMobileMenuOpen(false);
                }}
                disabled={isSigningIn}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50"
              >
                <Wallet className="w-4 h-4" />
                {isSigningIn ? 'Signing...' : 'Sign In to Continue'}
              </button>
            )}

            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider',
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'text-white border border-transparent'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}

            <div className="border-t border-cyan-900/30 pt-4 mt-4">
              <button
                onClick={() => {
                  handleDisconnect();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-red-400 border border-transparent hover:border-red-500/30 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Top Header with Wallet Button - Desktop Only */}
      <header className="hidden md:block fixed top-0 right-0 z-40 bg-transparent"
        style={{ left: sidebarOpen ? '256px' : '80px', transition: 'left 0.3s' }}
      >
        <div className="flex items-center justify-end px-6 h-16 gap-3">
          {!connected ? (
            <div className="mt-4 mr-4">
              <ConnectButton />
            </div>
          ) : !isAuthenticated ? (
            /* Wallet connected but not signed in - show Sign In button */
            <div className="mt-4 mr-4 flex items-center gap-3">
              <span className="text-gray-400 text-sm">
                {formatAddress(publicKey!.toBase58())}
              </span>
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wallet className="w-4 h-4" />
                {isSigningIn ? 'Signing...' : 'Sign In'}
              </button>
            </div>
          ) : (
            <div className="mt-4 mr-4">
              {/* Authenticated - show dashboard button based on role */}
              {isAdmin() ? (
                <NavLink
                  to="/admin"
                  className="flex items-center gap-2 bg-white hover:bg-gray-100 text-[#1a2332] font-semibold text-sm px-5 py-2.5 rounded-lg transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Admin Dashboard
                </NavLink>
              ) : (
                <NavLink
                  to="/dashboard"
                  className="flex items-center gap-2 bg-white hover:bg-gray-100 text-[#1a2332] font-semibold text-sm px-5 py-2.5 rounded-lg transition-all"
                >
                  <Ticket className="w-4 h-4" />
                  Dashboard
                </NavLink>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        className={clsx(
          'flex-1 transition-all duration-300 relative z-0',
          'md:ml-64',
          !sidebarOpen && 'md:ml-20',
          'pt-16 md:pt-0'
        )}
      >
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
