import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Ticket,
  Trophy,
  Wallet,
  AlertCircle,
  Minus,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import clsx from 'clsx';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getUSDCBalance, createUSDCTransferTransaction, formatUSDC } from '@/utils/usdc';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.getEvent(id!),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const { data: poolData } = useQuery({
    queryKey: ['event', id, 'pool'],
    queryFn: () => api.getEventPool(id!),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const event = data?.data;
  const pool = poolData?.data;
  const userTickets = event?.userTickets || [];

  // Fetch USDC balance when wallet connects
  useEffect(() => {
    if (publicKey && connection) {
      console.log('=== USDC Balance Check ===');
      console.log('Wallet:', publicKey.toBase58());
      console.log('Connection endpoint:', connection.rpcEndpoint);
      getUSDCBalance(connection, publicKey).then(balance => {
        console.log('Balance result:', balance);
        setUsdcBalance(balance);
      }).catch(err => {
        console.error('Balance fetch error:', err);
        setUsdcBalance(0);
      });
    }
  }, [publicKey, connection]);

  const handlePurchase = async () => {
    if (!selectedOption || !publicKey || !user?.walletAddress) {
      toast.error('Please select an option and connect your wallet');
      return;
    }

    const totalCost = (event?.ticketPrice || 0) * quantity;

    // TEMPORARILY DISABLED - Check USDC balance
    // TODO: Re-enable after fixing balance detection
    /*
    if (usdcBalance < totalCost) {
      toast.error(`Insufficient USDC balance. Need ${formatUSDC(totalCost)}, have ${formatUSDC(usdcBalance)}`);
      return;
    }
    */

    // Warn user but allow to proceed
    if (usdcBalance < totalCost && usdcBalance > 0) {
      console.warn('USDC balance check:', { need: totalCost, have: usdcBalance });
    }

    setIsPurchasing(true);
    try {
      // Create USDC transfer transaction
      const transaction = await createUSDCTransferTransaction(
        connection,
        publicKey,
        totalCost
      );

      // Send transaction (SOL pays for gas)
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      toast.loading('Confirming transaction...', { id: 'tx-confirm' });
      await connection.confirmTransaction(signature, 'confirmed');
      toast.dismiss('tx-confirm');

      // Submit to backend with transaction signature
      const result = await api.purchaseTicket({
        eventId: id!,
        optionId: selectedOption,
        quantity,
        walletAddress: user.walletAddress,
        chain: 'SOL',
        purchaseTx: signature,
      });

      if (result.success) {
        toast.success(`Purchased ${quantity} ticket(s)!`);
        refetch();
        setSelectedOption(null);
        setQuantity(1);
        // Refresh USDC balance
        getUSDCBalance(connection, publicKey).then(setUsdcBalance);
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error(error.response?.data?.error || 'Purchase failed');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-100 rounded" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary dark:text-white mb-2">Event Not Found</h2>
        <Link to="/events" className="text-primary-400 hover:underline">
          Back to Events
        </Link>
      </div>
    );
  }

  const isOpen = event.status === 'open';
  const totalPool = pool?.totalPool || event.totalPool || 0;

  // Show friendly message for non-jackpot events
  if (!(event as any).isJackpot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-positive-100 flex items-center justify-center mx-auto mb-6 border border-brand-200">
          <Trophy className="w-10 h-10 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">Not Yet a Jackpot Event</h1>
        <p className="text-text-secondary text-lg mb-2">This event is not yet featured in our jackpot.</p>
        <p className="text-text-muted mb-8">Let's hope it gets selected soon!</p>
        <div className="flex gap-3 justify-center">
          <Link to="/events" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Browse All Events
          </Link>
          <Link to="/jackpot" className="btn btn-secondary">
            <Trophy className="w-4 h-4" />
            View Jackpots
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link to="/events" className="inline-flex items-center gap-2 text-text-muted dark:text-gray-400 hover:text-text-primary dark:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <span className={clsx(
            'badge',
            event.status === 'open' && 'badge-success',
            event.status === 'upcoming' && 'badge-info',
            event.status === 'locked' && 'badge-warning',
            event.status === 'resolved' && 'badge-success',
            event.status === 'cancelled' && 'badge-error'
          )}>
            {event.status}
          </span>
          {event.status === 'locked' && (
            <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium">
              ⏳ Waiting for result - please check back in 2-3 hours
            </span>
          )}
          <span className="text-sm text-text-muted dark:text-gray-400 capitalize">{event.category}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white mb-4">{event.title}</h1>

        {event.description && (
          <p className="text-gray-500 mb-6">{event.description}</p>
        )}

        {/* Times */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <div>
              <p className="text-text-primary dark:text-white">{format(new Date(event.eventTime), 'MMM dd, yyyy')}</p>
              <p>Event Time</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <div>
              <p className="text-text-primary dark:text-white">{format(new Date(event.lockTime), 'HH:mm')}</p>
              <p>Betting Closes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-muted dark:text-gray-400">
            <Ticket className="w-4 h-4" />
            <div>
              <p className="text-text-primary dark:text-white">${event.ticketPrice}</p>
              <p>Per Ticket</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary dark:text-white">${totalPool.toLocaleString()}</p>
          <p className="text-sm text-text-muted dark:text-gray-400">Total Pool</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary dark:text-white">{pool?.totalTickets || 0}</p>
          <p className="text-sm text-text-muted dark:text-gray-400">Tickets Sold</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary dark:text-white">{event.options?.length || 0}</p>
          <p className="text-sm text-text-muted dark:text-gray-400">Options</p>
        </div>
        {publicKey && (
          <div className="card p-4 text-center bg-brand-500/10 border-brand-500/30">
            <p className="text-2xl font-bold text-brand-400">{formatUSDC(usdcBalance)}</p>
            <p className="text-sm text-brand-300">Your Balance</p>
          </div>
        )}

      </div>

      {/* Chat Room Link for Jackpot Events */}
      {(event as any).isJackpot && (
        <Link
          to={`/events/${event.id}/chat`}
          className="card p-4 mb-6 flex items-center justify-between hover:border-brand-500 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-positive-100 flex items-center justify-center border border-brand-200">
              <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-text-primary">Join Event Chat</h3>
              <p className="text-sm text-text-secondary">Discuss this jackpot event with other bettors</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-brand-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* Betting Options */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">
          {isOpen ? 'Select Your Prediction' : 'Betting Options'}
        </h2>



        <div className="space-y-3">
          {(pool?.options || event.options)?.map((option) => {
            const optId = ('id' in option ? option.id : null) || option.optionId;
            const isSelected = selectedOption === optId;
            const percentage = totalPool > 0
              ? ((option.poolAmount || 0) / totalPool) * 100
              : 0;
            const isWinner = 'isWinner' in option && option.isWinner;

            return (
              <button
                key={optId}
                onClick={() => {
                  console.log('BUTTON CLICKED!', {
                    optId,
                    label: option.label,
                    isOpen,
                    currentSelected: selectedOption
                  });
                  if (isOpen) {
                    setSelectedOption(isSelected ? null : optId);
                    console.log('Option selected:', optId, option.label);
                  } else {
                    console.error('Cannot click - event is not open! Status:', event.status);
                  }
                }}
                disabled={!isOpen}
                className={clsx(
                  'w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden',
                  isOpen && 'cursor-pointer hover:border-brand-400',
                  isSelected && 'border-positive-500 bg-positive-500/10',
                  isWinner && 'border-green-500 bg-green-500/10',
                  !isSelected && !isWinner && 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                )}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      isSelected ? 'bg-positive-500 text-white' : 'bg-dark-700 text-text-muted dark:text-gray-400'
                    )}>
                      {option.optionId}
                    </span>
                    <div>
                      <p className="font-medium text-text-primary dark:text-white">{option.label}</p>
                      <p className="text-sm text-text-muted dark:text-gray-400">
                        {option.ticketsSold || 0} tickets sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary dark:text-white">{percentage.toFixed(1)}%</p>
                    <p className="text-sm text-text-muted dark:text-gray-400">${(option.poolAmount || 0).toFixed(0)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-dark-700 w-full">
                  <div
                    className={clsx(
                      'h-full transition-all',
                      isWinner ? 'bg-green-500' : isSelected ? 'bg-positive-500' : 'bg-dark-600'
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {isWinner && (
                  <div className="absolute top-2 right-2">
                    <Trophy className="w-5 h-5 text-green-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Purchase Section */}
      {isOpen && (
        <div className="card p-6 mb-6 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Purchase Tickets</h2>

          {!isAuthenticated ? (
            <div className="text-center py-6">
              <Wallet className="w-12 h-12 text-dark-600 dark:text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-gray-400">Connect your wallet to purchase tickets</p>
            </div>
          ) : !user?.walletAddress ? (
            <div className="text-center py-6">
              <Wallet className="w-12 h-12 text-dark-600 dark:text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-gray-400 mb-4">Please connect a wallet to your account</p>
            </div>
          ) : !selectedOption ? (
            <p className="text-center text-text-muted dark:text-gray-400 py-6">
              Select an option above to purchase tickets
            </p>
          ) : (
            <div className="space-y-4">
              {/* Quantity selector */}
              <div className="flex items-center justify-between">
                <span className="text-text-muted dark:text-gray-400">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-primary dark:text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-bold text-text-primary dark:text-white w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => {
                      const selectedOpt = event.options?.find(o => o.id === selectedOption);
                      const maxAvailable = selectedOpt ? (selectedOpt.ticketLimit - (selectedOpt.ticketsSold || 0)) : 1000;
                      setQuantity(q => Math.min(maxAvailable, q + 1));
                    }}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-primary dark:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <span className="text-text-muted dark:text-gray-400">Total Cost</span>
                <span className="text-2xl font-bold text-text-primary dark:text-white">
                  ${(event.ticketPrice * quantity).toFixed(2)}
                </span>
              </div>

              {/* Purchase button */}
              <button
                onClick={handlePurchase}
                disabled={isPurchasing}
                className="w-full btn btn-accent py-4 text-lg"
              >
                {isPurchasing ? 'Processing...' : `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Locked Event Indicator */}
      {event.status === 'locked' && (
        <div className="card p-6 mb-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-yellow-500">Betting Closed</h3>
              <p className="text-sm text-yellow-400/80">This event is locked. Waiting for final result...</p>
            </div>
          </div>
        </div>
      )}

      {/* User's Tickets */}
      {userTickets.length > 0 && (
        <div className="card p-6 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Your Tickets</h2>
          <div className="space-y-3">
            {userTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={clsx(
                  'p-4 rounded-lg border',
                  ticket.status === 'won' && 'bg-green-500/10 dark:bg-green-900/30 border-green-500/50 dark:border-green-700',
                  ticket.status === 'lost' && 'bg-red-500/10 dark:bg-red-900/30 border-red-500/50 dark:border-red-700',
                  ticket.status === 'active' && 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-text-muted dark:text-gray-400">{ticket.serialNumber}</p>
                    <p className="text-text-primary dark:text-white font-medium">{ticket.optionLabel}</p>
                  </div>
                  <div className="text-right">
                    <span className={clsx(
                      'badge',
                      ticket.status === 'won' && 'badge-success',
                      ticket.status === 'lost' && 'badge-error',
                      ticket.status === 'active' && 'badge-info',
                      ticket.status === 'claimed' && 'badge-success'
                    )}>
                      {ticket.status}
                    </span>
                    {ticket.payoutAmount && ticket.payoutAmount > 0 && (
                      <p className="text-green-400 font-bold mt-1">
                        +${ticket.payoutAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
