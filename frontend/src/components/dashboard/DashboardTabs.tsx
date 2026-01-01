import { Briefcase, Trophy, Settings } from 'lucide-react';
import clsx from 'clsx';

interface Tab {
    id: string;
    label: string;
    icon: React.ElementType;
}

const tabs: Tab[] = [
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'referrals', label: 'Points System', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings },
];

interface DashboardTabsProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
    return (
        <div className="border-b border-border dark:border-gray-700 mb-6">
            <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide" aria-label="Tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                                isActive
                                    ? 'text-brand-600 dark:text-brand-400 border-brand-600 dark:border-brand-400'
                                    : 'text-text-muted dark:text-gray-400 border-transparent hover:text-text-primary dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
