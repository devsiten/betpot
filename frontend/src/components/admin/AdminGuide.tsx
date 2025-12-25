import { useState } from 'react';
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    Calendar,
    Trophy,
    Users,
    Ticket,
    Settings,
    AlertTriangle,
    TrendingUp,
    CheckCircle,
} from 'lucide-react';
import clsx from 'clsx';

interface GuideSection {
    id: string;
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
}

export function AdminGuide({ defaultOpen = false }: { defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const sections: GuideSection[] = [
        {
            id: 'overview',
            title: 'Dashboard Overview',
            icon: TrendingUp,
            content: (
                <div className="space-y-3 text-sm text-text-secondary dark:text-gray-300">
                    <p>The dashboard shows key platform metrics:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Total Users</strong> - Registered users on the platform</li>
                        <li><strong>Active Events</strong> - Currently open/locked jackpots</li>
                        <li><strong>Total Tickets</strong> - All tickets purchased</li>
                        <li><strong>Total Volume</strong> - Sum of all bets in USD</li>
                        <li><strong>Platform Fees</strong> - 1% of total volume earned</li>
                    </ul>
                </div>
            ),
        },
        {
            id: 'markets',
            title: 'Creating Jackpots',
            icon: Trophy,
            content: (
                <div className="space-y-3 text-sm text-text-secondary dark:text-gray-300">
                    <p><strong>Step 1:</strong> Go to <span className="text-brand-600 font-medium">Markets</span></p>
                    <p><strong>Step 2:</strong> Browse sports from The Odds API or prediction markets from Polymarket</p>
                    <p><strong>Step 3:</strong> Click <span className="bg-positive-100 text-positive-700 px-2 py-0.5 rounded font-medium">Set as Jackpot</span> on any event</p>
                    <p><strong>Step 4:</strong> Confirm the jackpot creation - this imports the event with proper odds</p>
                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mt-2">
                        <p className="text-brand-700 font-medium">Tip: Choose events with high interest for better engagement</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'events',
            title: 'Managing Events',
            icon: Calendar,
            content: (
                <div className="space-y-3 text-sm text-text-secondary dark:text-gray-300">
                    <p>In the <span className="text-brand-600 font-medium">Events</span> page you can:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>View Events</strong> - See all jackpots with status (Open, Locked, Resolved)</li>
                        <li><strong>Lock Event</strong> - Stop betting before the event starts</li>
                        <li><strong>Resolve Event</strong> - Select the winning option after event ends</li>
                        <li><strong>Cancel Event</strong> - Cancel and refund all tickets</li>
                    </ul>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                        <p className="text-amber-700 font-medium">Important: Always resolve events within 2-3 hours after they end</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'resolving',
            title: 'Resolving Events',
            icon: CheckCircle,
            content: (
                <div className="space-y-3 text-sm text-text-secondary dark:text-gray-300">
                    <p><strong>Critical Admin Task!</strong> After an event ends:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Go to <span className="text-brand-600 font-medium">Events</span> → find the locked event</li>
                        <li>Click <span className="text-brand-600 font-medium">View</span> to open event details</li>
                        <li>Verify the actual result (check news, scores, etc.)</li>
                        <li>Click <span className="bg-positive-100 text-positive-700 px-2 py-0.5 rounded font-medium">Resolve</span></li>
                        <li>Select the <strong>winning option</strong></li>
                        <li>Confirm - this calculates payouts for all winners!</li>
                    </ol>
                    <div className="bg-positive-50 border border-positive-200 rounded-lg p-3 mt-2">
                        <p className="text-positive-700 font-medium">Winners can claim their payouts after resolution</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'bets',
            title: 'Viewing Bets',
            icon: Ticket,
            content: (
                <div className="space-y-3 text-sm text-text-secondary dark:text-gray-300">
                    <p>The <span className="text-brand-600 font-medium">Bets</span> page shows all tickets:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>All Bets</strong> - Every ticket purchased</li>
                        <li><strong>Winners</strong> - Tickets that won</li>
                        <li><strong>Losers</strong> - Tickets that lost</li>
                        <li><strong>Unclaimed</strong> - Won tickets not yet claimed</li>
                    </ul>
                    <p className="mt-2">Use this to monitor platform activity and check for issues.</p>
                </div>
            ),
        },
        {
            id: 'users',
            title: 'Managing Users',
            icon: Users,
            content: (
                <div className="space-y-3 text-sm text-text-secondary dark:text-gray-300">
                    <p>In <span className="text-brand-600 font-medium">Users</span> you can:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>View all registered users</li>
                        <li>See their wallet addresses</li>
                        <li>Check their betting history (tickets, wins, spent)</li>
                        <li>Promote users to Admin role (be careful!)</li>
                    </ul>
                </div>
            ),
        },
        {
            id: 'payments',
            title: 'Payment Issues',
            icon: AlertTriangle,
            content: (
                <div className="space-y-3 text-sm text-text-secondary dark:text-gray-300">
                    <p>The <span className="text-brand-600 font-medium">Payment Issues</span> page shows failed transactions:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Pending</strong> - User paid but ticket wasn't created</li>
                        <li><strong>Resolved</strong> - Manually fixed by admin</li>
                        <li><strong>Rejected</strong> - Marked as invalid</li>
                    </ul>
                    <div className="bg-negative-50 border border-negative-200 rounded-lg p-3 mt-2">
                        <p className="text-negative-700 font-medium">Always investigate pending issues promptly!</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'settings',
            title: 'Platform Settings',
            icon: Settings,
            content: (
                <div className="space-y-3 text-sm text-text-secondary dark:text-gray-300">
                    <p>Configure global platform parameters:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Ticket Price</strong> - Default price for new events</li>
                        <li><strong>Platform Fee</strong> - Percentage taken from each bet</li>
                        <li><strong>Max Events Per Day</strong> - Limit on new jackpots</li>
                        <li><strong>Claim Delay</strong> - Hours before winners can claim</li>
                    </ul>
                </div>
            ),
        },
    ];

    const toggleSection = (id: string) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    return (
        <div className="mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full card p-4 flex items-center justify-between hover:border-brand-300 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-positive-100 flex items-center justify-center border border-brand-200">
                        <BookOpen className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-text-primary dark:text-white">Admin Guide</h3>
                        <p className="text-sm text-text-muted dark:text-gray-400">Click to view admin responsibilities & instructions</p>
                    </div>
                </div>
                <ChevronDown className={clsx(
                    'w-5 h-5 text-text-muted transition-transform',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {isOpen && (
                <div className="card dark:bg-gray-900 dark:border-gray-800 mt-2 p-4 space-y-2">
                    <div className="bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 rounded-lg p-4 mb-4">
                        <h4 className="font-bold text-brand-700 dark:text-brand-400 mb-2">Your Main Responsibilities</h4>
                        <ol className="list-decimal list-inside text-sm text-brand-600 dark:text-brand-400 space-y-1">
                            <li>Create jackpots from Markets page</li>
                            <li>Monitor events and betting activity</li>
                            <li>Resolve events after they end (select winner)</li>
                            <li>Handle any payment issues promptly</li>
                        </ol>
                    </div>

                    {sections.map((section) => (
                        <div key={section.id} className="border border-border dark:border-gray-800 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full p-3 flex items-center justify-between hover:bg-background-secondary dark:hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <section.icon className="w-5 h-5 text-brand-500 dark:text-brand-400" />
                                    <span className="font-medium text-text-primary dark:text-white">{section.title}</span>
                                </div>
                                {expandedSection === section.id ? (
                                    <ChevronDown className="w-4 h-4 text-text-muted dark:text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-text-muted dark:text-gray-400" />
                                )}
                            </button>
                            {expandedSection === section.id && (
                                <div className="p-4 pt-0 border-t border-border dark:border-gray-800 bg-background-secondary dark:bg-gray-800">
                                    {section.content}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
