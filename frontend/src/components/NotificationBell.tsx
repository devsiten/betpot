import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, Trophy, AlertCircle, Clock, Ticket, DollarSign } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: string;
    isRead: boolean;
    createdAt: string;
}

const notificationIcons: Record<string, React.ElementType> = {
    jackpot_new: Trophy,
    ticket_won: DollarSign,
    ticket_lost: X,
    refund_available: AlertCircle,
    event_ending: Clock,
    new_bet: Ticket,
    payout_ready: DollarSign,
};

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

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

    // Fetch notifications
    const { data, isLoading, isError } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.getNotifications(),
        enabled: isAuthenticated,
        refetchInterval: 30000, // Refresh every 30 seconds
        retry: false, // Don't retry on failure - keep bell clickable
    });

    const notifications: Notification[] = data?.data || [];
    const unreadCount: number = (data as any)?.unreadCount || 0;

    // Mark as read mutation
    const markReadMutation = useMutation({
        mutationFn: (id: string) => api.markNotificationRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read mutation
    const markAllReadMutation = useMutation({
        mutationFn: () => api.markAllNotificationsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const handleMarkRead = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        markReadMutation.mutate(id);
    };

    // Handle notification click - navigate to relevant page
    const handleNotificationClick = (notification: Notification) => {
        // Mark as read immediately
        if (!notification.isRead) {
            markReadMutation.mutate(notification.id);
        }

        // Close dropdown
        setIsOpen(false);

        // Navigate based on notification type
        if (notification.type === 'ticket_won' || notification.type === 'ticket_lost' || notification.type === 'payout_ready') {
            // Win/Loss/Payout notifications -> Dashboard
            navigate('/dashboard');
        } else if (notification.type === 'jackpot_new' || notification.type === 'event_ending') {
            // New jackpot or event notifications -> Jackpot page
            navigate('/jackpot');
        } else {
            // Default -> Home
            navigate('/');
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
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-negative-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-background-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="font-bold text-text-primary">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllReadMutation.mutate()}
                                className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center">
                                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : isError ? (
                            <div className="p-8 text-center text-text-muted">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Unable to load notifications</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-text-muted">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const Icon = notificationIcons[notification.type] || Bell;
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={clsx(
                                            'px-4 py-3 border-b border-border last:border-0 hover:bg-background-secondary transition-colors cursor-pointer',
                                            !notification.isRead && 'bg-brand-500/5'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={clsx(
                                                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                                notification.type === 'ticket_won' ? 'bg-positive-500/20 text-positive-500' :
                                                    notification.type === 'ticket_lost' ? 'bg-negative-500/20 text-negative-500' :
                                                        'bg-brand-500/20 text-brand-500'
                                            )}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                                                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notification.message}</p>
                                                <p className="text-[10px] text-text-muted mt-1">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <button
                                                    onClick={(e) => handleMarkRead(notification.id, e)}
                                                    className="p-1 rounded hover:bg-background-secondary text-text-muted"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-border bg-background-secondary">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full text-center text-xs text-brand-500 hover:text-brand-600 font-medium py-1"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
