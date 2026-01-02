interface BetPotLogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
}

/**
 * BetPot Logo - Uses the official logo image
 */
export function BetPotLogo({ size = 40, showText = false, className = '' }: BetPotLogoProps) {
    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <img
                src="/betpot-logo.jpg"
                alt="BetPot Logo"
                width={size}
                height={size}
                className="rounded-lg object-cover"
                style={{ width: size, height: size }}
            />
            {showText && (
                <span
                    className="font-bold text-transparent bg-clip-text"
                    style={{
                        fontSize: size * 0.5,
                        backgroundImage: 'linear-gradient(135deg, #2DD4A8 0%, #22D3EE 30%, #3B82F6 60%, #A855F7 100%)'
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
