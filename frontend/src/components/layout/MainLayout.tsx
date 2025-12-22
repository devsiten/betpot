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
  BookOpen,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import clsx from 'clsx';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

// Custom Connect Button - Only Phantom and Solflare
function ConnectButton() {
  const [showModal, setShowModal] = useState(false);
  const { wallets, select, connect, connecting, wallet } = useWallet();

  // Filter to only Phantom and Solflare
  const supportedWallets = wallets.filter(
    w => w.adapter.name === 'Phantom' || w.adapter.name === 'Solflare'
  );

  const handleConnect = async (walletName: string) => {
    try {
      select(walletName as any);
      setShowModal(false);
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  // After wallet is selected, trigger connect
  useEffect(() => {
    if (wallet && !connecting) {
      connect().catch((err) => {
        console.error('Auto-connect failed:', err);
      });
    }
  }, [wallet, connect, connecting]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={connecting}
        className="flex items-center gap-2 bg-white hover:bg-gray-100 text-[#1a2332] font-semibold text-sm px-5 py-2.5 rounded-lg transition-all disabled:opacity-50"
      >
        <Wallet className="w-4 h-4" />
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {/* Custom Wallet Modal - Only Phantom and Solflare */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a2332] rounded-2xl p-6 w-full max-w-sm mx-4 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {supportedWallets.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  Please install Phantom or Solflare wallet
                </p>
              ) : (
                supportedWallets.map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleConnect(wallet.adapter.name)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                  >
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      className="w-10 h-10 rounded-lg"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{wallet.adapter.name}</p>
                      <p className="text-gray-400 text-sm">
                        {wallet.readyState === 'Installed' ? 'Detected' : 'Not installed'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <p className="text-gray-500 text-xs text-center mt-4">
              Only Phantom and Solflare are supported
            </p>
          </div>
        </div>
      )}
    </>
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

  // Track if wallet was ever connected in this session
  const [wasConnected, setWasConnected] = useState(false);

  // Update wasConnected when wallet connects
  useEffect(() => {
    if (connected) {
      setWasConnected(true);
    }
  }, [connected]);

  // Only logout when wallet DISCONNECTS (was connected, now isn't)
  // This prevents logout on initial page load when wallet hasn't connected yet
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
    navigate('/');
  };



  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/jackpot', label: 'Jackpot', icon: Trophy },
    { to: '/events', label: 'Markets', icon: Calendar },
    { to: '/testnet-guide', label: 'Testnet Guide', icon: BookOpen },
    // Only show user Dashboard if connected AND authenticated AND not admin
    ...(connected && isAuthenticated && !isAdmin() ? [
      { to: '/dashboard', label: 'Dashboard', icon: Ticket },
    ] : []),
    // Admin Dashboard for admins only (still requires isAuthenticated)
    ...(isAuthenticated && isAdmin() ? [{ to: '/admin', label: 'Admin Dashboard', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#1a2332] flex">
      {/* Desktop Sidebar - Transparent to show homepage background */}
      <aside
        className={clsx(
          'hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-transparent border-r border-white/10 transition-all duration-300',
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

        </nav>

        {/* Footer - at absolute bottom */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0a1628]">
            <p className="text-xs text-cyan-400/60 font-mono uppercase font-bold">
              © {new Date().getFullYear()} BETPOT PROTOCOL
            </p>
            <p className="text-xs text-yellow-400/60 font-mono mt-1">🔗 DEVNET</p>
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
            /* Wallet connected but not signed in - just show Sign In */
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="mt-4 mr-4 flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all disabled:opacity-50"
            >
              {isSigningIn ? 'Signing...' : 'Sign In'}
            </button>
          ) : (
            /* Authenticated - just show Dashboard button */
            <div className="mt-4 mr-4">
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
