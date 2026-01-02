interface BetPotLogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
}

/**
 * BetPot Logo - Official SVG logo with gradient
 * Accurate recreation of the BP logo with green → teal → purple gradient
 */
export function BetPotLogo({ size = 40, showText = false, className = '' }: BetPotLogoProps) {
    const gradientId = `betpot-gradient-${Math.random().toString(36).substr(2, 9)}`;
    const textGradientId = `betpot-text-gradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Main gradient - Green to Teal to Blue to Purple */}
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2DD4A8" />
                        <stop offset="30%" stopColor="#22D3EE" />
                        <stop offset="60%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                </defs>

                {/* B letter - Left side, squared with curved inner cut */}
                <path
                    d="M5 5 
                       H45 
                       Q60 5, 60 20 
                       Q60 32, 50 35
                       L50 35
                       Q60 38, 60 50
                       Q60 65, 45 65 
                       H5 
                       V5 Z
                       
                       M18 17 
                       V30 
                       H42 
                       Q48 30, 48 23.5 
                       Q48 17, 42 17 
                       H18 Z
                       
                       M18 40 
                       V53 
                       H42 
                       Q48 53, 48 46.5 
                       Q48 40, 42 40 
                       H18 Z"
                    fill={`url(#${gradientId})`}
                    fillRule="evenodd"
                />

                {/* P letter - Right side, with curved flowing tail */}
                <path
                    d="M50 5 
                       H80 
                       Q95 5, 95 25 
                       Q95 45, 80 45 
                       H63 
                       V60
                       Q63 75, 78 82
                       Q82 84, 85 92
                       L82 94
                       Q75 90, 70 85
                       Q55 72, 55 55
                       V5 
                       H50 Z
                       
                       M63 17 
                       V33 
                       H77 
                       Q83 33, 83 25 
                       Q83 17, 77 17 
                       H63 Z"
                    fill={`url(#${gradientId})`}
                    fillRule="evenodd"
                />
            </svg>

            {showText && (
                <svg
                    width={size * 2}
                    height={size * 0.6}
                    viewBox="0 0 120 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id={textGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#2DD4A8" />
                            <stop offset="25%" stopColor="#22D3EE" />
                            <stop offset="50%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#A855F7" />
                        </linearGradient>
                    </defs>
                    <text
                        x="0"
                        y="24"
                        fill={`url(#${textGradientId})`}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontSize="28"
                        fontWeight="700"
                    >
                        BetPot
                    </text>
                </svg>
            )}
        </div>
    );
}

/**
 * BetPot Logo Icon Only - smaller version without text
 */
export function BetPotLogoIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
    return <BetPotLogo size={size} showText={false} className={className} />;
}

/**
 * BetPot Full Logo - logo with text
 */
export function BetPotFullLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
    return <BetPotLogo size={size} showText={true} className={className} />;
}

export default BetPotLogo;

