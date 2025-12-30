interface BetPotLogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
}

/**
 * BetPot Logo - Official SVG logo with gradient
 * Colors: Green → Cyan → Blue → Purple gradient
 */
export function BetPotLogo({ size = 40, showText = false, className = '' }: BetPotLogoProps) {
    const gradientId = `betpot-gradient-${Math.random().toString(36).substr(2, 9)}`;

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
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2DD4A8" />
                        <stop offset="35%" stopColor="#22B8CF" />
                        <stop offset="65%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                </defs>

                {/* B letter - stylized with curved notch */}
                <path
                    d="M10 10 H40 
             Q55 10 55 25 
             Q55 35 45 38
             Q55 41 55 50
             Q55 65 40 65
             H10 
             V10 Z
             M22 22 V32 H38 Q42 32 42 27 Q42 22 38 22 Z
             M22 43 V53 H38 Q42 53 42 48 Q42 43 38 43 Z"
                    fill={`url(#${gradientId})`}
                    fillRule="evenodd"
                />

                {/* P letter - stylized with flowing curved tail */}
                <path
                    d="M52 10 H78 
             Q93 10 93 30 
             Q93 50 78 50
             H64 
             V65
             Q64 80 75 85
             Q78 86 80 90
             Q75 92 70 88
             Q55 78 55 60
             V10
             H52 Z
             M64 22 V38 H75 Q80 38 80 30 Q80 22 75 22 Z"
                    fill={`url(#${gradientId})`}
                    fillRule="evenodd"
                />
            </svg>

            {showText && (
                <span
                    className="font-bold text-transparent bg-clip-text"
                    style={{
                        fontSize: size * 0.5,
                        backgroundImage: 'linear-gradient(135deg, #2DD4A8 0%, #22B8CF 35%, #3B82F6 65%, #A855F7 100%)'
                    }}
                >
                    BetPot
                </span>
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
