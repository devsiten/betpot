import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Copy, Check, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { Ticket as TicketType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export function MyBetsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { isAuthenticated } = useAuthStore();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch active tickets
    const { data, isLoading } = useQuery({
        queryKey: ['my-active-bets'],
        queryFn: () => api.getMyTickets({ status: 'active' }),
        enabled: isAuthenticated,
        refetchInterval: 30000,
    });

    const tickets: TicketType[] = data?.data || [];
    const activeCount = tickets.length;

    const handleCopy = async (serialNumber: string, ticketId: string) => {
        try {
            await navigator.clipboard.writeText(serialNumber);
            setCopiedId(ticketId);
            toast.success('Ticket number copied!');
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-background-secondary text-text-muted hover:text-text-primary transition-colors"
                title="My Bets"
            >
                <Ticket className="w-5 h-5" />
                {activeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-positive-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {activeCount > 9 ? '9+' : activeCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-background-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="font-bold text-text-primary">My Bets</h3>
                        <span className="text-xs text-positive-500 font-medium">
                            {activeCount} active
                        </span>
                    </div>

                    {/* Tickets List */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center">
                                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="p-8 text-center text-text-muted">
                                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No active bets</p>
                                <Link
                                    to="/jackpot"
                                    onClick={() => setIsOpen(false)}
                                    className="text-brand-500 text-sm mt-2 inline-block hover:underline"
                                >
                                    Place a bet →
                                </Link>
                            </div>
                        ) : (
                            tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="px-4 py-3 border-b border-border last:border-0 hover:bg-background-secondary transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/events/${ticket.eventId}`}
                                                onClick={() => setIsOpen(false)}
                                                className="text-sm font-medium text-text-primary hover:text-brand-500 line-clamp-1"
                                            >
                                                {ticket.event?.title || 'Event'}
                                            </Link>
                                            <p className="text-xs text-positive-500 font-medium mt-0.5">
                                                {ticket.optionLabel}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="text-xs text-text-muted bg-background-secondary px-2 py-0.5 rounded font-mono">
                                                    {ticket.serialNumber}
                                                </code>
                                                <button
                                                    onClick={() => handleCopy(ticket.serialNumber, ticket.id)}
                                                    className="p-1 rounded hover:bg-border-light text-text-muted hover:text-text-primary transition-colors"
                                                    title="Copy ticket number"
                                                >
                                                    {copiedId === ticket.id ? (
                                                        <Check className="w-3.5 h-3.5 text-positive-500" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {tickets.length > 0 && (
                        <div className="px-4 py-2 border-t border-border bg-background-secondary">
                            <Link
                                to="/dashboard"
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-center text-xs text-brand-500 hover:text-brand-600 font-medium py-1"
                            >
                                View all tickets →
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
