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
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 shadow-soft"
      >
        <Wallet className="w-4 h-4" />
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {/* Custom Wallet Modal - Light theme */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-background-card rounded-2xl p-6 w-full max-w-sm mx-4 border border-border shadow-elevated">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">Connect Wallet</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-background-secondary text-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {supportedWallets.length === 0 ? (
                <p className="text-text-muted text-center py-4">
                  Please install Phantom or Solflare wallet
                </p>
              ) : (
                supportedWallets.map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleConnect(wallet.adapter.name)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-background-secondary hover:bg-border-light border border-border transition-all"
                  >
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      className="w-10 h-10 rounded-lg"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-text-primary font-medium">{wallet.adapter.name}</p>
                      <p className="text-text-muted text-sm">
                        {wallet.readyState === 'Installed' ? 'Detected' : 'Not installed'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <p className="text-text-muted text-xs text-center mt-4">
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
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-background-card border-b border-border shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-soft">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-xl font-semibold text-text-primary hidden sm:block">BETPOT</span>
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
                        ? 'bg-brand-100 text-brand-700'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right Side - Wallet */}
            <div className="flex items-center gap-3">
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
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-background-secondary text-text-primary"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background-card px-4 py-4 space-y-2">
            {/* Wallet Connect for Mobile */}
            {!connected ? (
              <div className="pb-4 border-b border-border">
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
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-text-secondary hover:bg-background-secondary'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}

            {/* Disconnect Button */}
            {connected && isAuthenticated && (
              <div className="border-t border-border pt-4 mt-4">
                <button
                  onClick={() => {
                    handleDisconnect();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-negative-500 hover:bg-negative-50"
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
      <footer className="border-t border-border bg-background-card py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted font-medium">
              © {new Date().getFullYear()} BETPOT PROTOCOL
            </p>
            <span className="text-xs text-brand-500 font-medium px-2 py-1 bg-brand-50 rounded">DEVNET</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
