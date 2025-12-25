import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import clsx from 'clsx';

interface CountdownTimerProps {
    targetDate: Date | string;
    label?: string;
    onComplete?: () => void;
    size?: 'sm' | 'md' | 'lg';
    showSeconds?: boolean;
    className?: string;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const difference = target - now;

    if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
    };
}

export function CountdownTimer({
    targetDate,
    label,
    onComplete,
    size = 'md',
    showSeconds = true,
    className,
}: CountdownTimerProps) {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(target));

    useEffect(() => {
        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft(target);
            setTimeLeft(newTimeLeft);

            if (newTimeLeft.total <= 0) {
                clearInterval(timer);
                onComplete?.();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [target, onComplete]);

    // Size variants
    const sizeClasses = {
        sm: {
            container: 'gap-1',
            box: 'w-10 h-10 text-sm',
            label: 'text-[10px]',
        },
        md: {
            container: 'gap-2',
            box: 'w-14 h-14 text-xl',
            label: 'text-xs',
        },
        lg: {
            container: 'gap-3',
            box: 'w-20 h-20 text-3xl',
            label: 'text-sm',
        },
    };

    const styles = sizeClasses[size];

    // If time is up
    if (timeLeft.total <= 0) {
        return (
            <div className={clsx('flex items-center gap-2 text-text-muted', className)}>
                <Clock className="w-4 h-4" />
                <span className="text-sm">Time's up</span>
            </div>
        );
    }

    return (
        <div className={clsx('flex flex-col items-center', className)}>
            {label && (
                <p className="text-text-secondary text-sm font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {label}
                </p>
            )}
            <div className={clsx('flex items-center', styles.container)}>
                {/* Days */}
                {timeLeft.days > 0 && (
                    <TimeUnit value={timeLeft.days} label="DAYS" styles={styles} />
                )}

                {/* Hours */}
                <TimeUnit value={timeLeft.hours} label="HRS" styles={styles} />

                {/* Minutes */}
                <TimeUnit value={timeLeft.minutes} label="MIN" styles={styles} />

                {/* Seconds */}
                {showSeconds && (
                    <TimeUnit value={timeLeft.seconds} label="SEC" styles={styles} />
                )}
            </div>
        </div>
    );
}

function TimeUnit({
    value,
    label,
    styles
}: {
    value: number;
    label: string;
    styles: { box: string; label: string }
}) {
    return (
        <div className="flex flex-col items-center">
            <div className={clsx(
                'flex items-center justify-center rounded-lg font-bold font-mono',
                'bg-white dark:bg-gray-800 border border-border dark:border-gray-700',
                'text-text-primary dark:text-white shadow-soft',
                styles.box
            )}>
                {String(value).padStart(2, '0')}
            </div>
            <span className={clsx('text-text-muted mt-1 font-medium', styles.label)}>
                {label}
            </span>
        </div>
    );
}

// Event-specific countdown that shows different phases
interface EventCountdownProps {
    startTime: string;
    lockTime: string;
    eventTime: string;
    status: string;
    className?: string;
}

export function EventCountdown({
    startTime,
    lockTime,
    eventTime,
    status,
    className,
}: EventCountdownProps) {
    const now = new Date();
    const start = new Date(startTime);
    const lock = new Date(lockTime);
    const event = new Date(eventTime);

    // Determine which phase we're in
    if (status === 'resolved' || status === 'cancelled') {
        return null;
    }

    if (now < start) {
        // Before start - show "Betting Opens In"
        return (
            <CountdownTimer
                targetDate={start}
                label="Betting Opens In"
                size="md"
                className={className}
            />
        );
    }

    if (now < lock) {
        // Betting is open - show "Betting Closes In"
        return (
            <CountdownTimer
                targetDate={lock}
                label="Betting Closes In"
                size="md"
                className={className}
            />
        );
    }

    if (now < event) {
        // Betting closed, waiting for event - show "Event Starts In"
        return (
            <CountdownTimer
                targetDate={event}
                label="Event Starts In"
                size="md"
                className={className}
            />
        );
    }

    // Event has passed, waiting for result
    return (
        <div className={clsx('flex items-center gap-2 text-brand-600 dark:text-brand-400', className)}>
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Waiting for result...</span>
        </div>
    );
}
