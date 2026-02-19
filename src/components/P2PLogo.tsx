/**
 * Pack to Produce — Seedling Logo Mark
 * Two leaves from one stem: green (pack/origin) + gold (produce/destination)
 */

interface P2PLogoProps {
  size?: number;
  variant?: 'full' | 'mark-only' | 'wordmark-only';
  onDark?: boolean;
  className?: string;
}

function SeedlingMark({ size = 32, onDark = false }: { size?: number; onDark?: boolean }) {
  const green = onDark ? 'rgba(253,250,244,0.92)' : '#3a8c4e';
  const greenStem = onDark ? 'rgba(253,250,244,0.55)' : 'rgba(42,107,58,0.55)';
  const gold = '#f5c842';
  const goldDeep = onDark ? '#f5c842' : '#e0a820';
  const shadow = onDark ? 'rgba(253,250,244,0.12)' : 'rgba(92,61,30,0.12)';

  return (
    <svg
      width={size}
      height={Math.round(size * 1.1)}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stem */}
      <path d="M50 100 L50 45" stroke={greenStem} strokeWidth="3.5" strokeLinecap="round" />
      {/* Left leaf — green / pack */}
      <path
        d="M50 70 C50 70 30 65 22 50 C20 46 21 40 25 38 C30 36 38 40 44 50 C48 57 50 65 50 70Z"
        fill={green}
      />
      {/* Left leaf vein */}
      <path d="M50 70 C42 60 30 50 25 40" stroke="rgba(42,107,58,0.3)" strokeWidth="1" strokeLinecap="round" />
      {/* Right leaf — gold / produce */}
      <path
        d="M50 58 C50 58 68 50 78 36 C81 31 80 25 76 23 C71 21 63 26 57 36 C53 43 50 52 50 58Z"
        fill={gold}
      />
      {/* Right leaf vein */}
      <path d="M50 58 C58 48 70 38 76 25" stroke="rgba(92,61,30,0.2)" strokeWidth="1" strokeLinecap="round" />
      {/* Soil shadow */}
      <ellipse cx="50" cy="102" rx="16" ry="4" fill={shadow} />
      {/* Bud */}
      <circle cx="50" cy="42" r="4" fill={goldDeep} />
    </svg>
  );
}

export function P2PLogo({ size = 32, variant = 'full', onDark = false, className = '' }: P2PLogoProps) {
  const textColor = onDark ? '#fdfaf4' : '#1a2e1d';
  const goldColor = onDark ? '#f5c842' : '#e0a820';
  const monoColor = onDark ? 'rgba(253,250,244,0.45)' : 'rgba(107,128,112,0.8)';
  const fontSize = size * 0.85;

  if (variant === 'mark-only') {
    return (
      <span className={className}>
        <SeedlingMark size={size} onDark={onDark} />
      </span>
    );
  }

  if (variant === 'wordmark-only') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize, letterSpacing: '-0.02em', color: textColor }}>Pack</span>
        <span style={{ fontFamily: '"Space Mono", monospace', fontWeight: 400, fontSize: fontSize * 0.45, letterSpacing: '0.12em', color: monoColor, textTransform: 'uppercase' }}>to</span>
        <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize, letterSpacing: '-0.02em', color: goldColor }}>Produce</span>
      </span>
    );
  }

  // full — mark + wordmark
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.4) }}>
      <SeedlingMark size={size} onDark={onDark} />
      <span style={{ display: 'flex', alignItems: 'baseline', gap: Math.round(size * 0.18) }}>
        <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize, letterSpacing: '-0.02em', lineHeight: 1, color: textColor }}>Pack</span>
        <span style={{ fontFamily: '"Space Mono", monospace', fontWeight: 400, fontSize: fontSize * 0.44, letterSpacing: '0.14em', color: monoColor, textTransform: 'uppercase' }}>to</span>
        <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize, letterSpacing: '-0.02em', lineHeight: 1, color: goldColor }}>Produce</span>
      </span>
    </span>
  );
}

export default P2PLogo;
