export function BrandedLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      {/* Seedling mark — animated */}
      <div className="animate-pulse">
        <svg width="56" height="62" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 100 L50 45" stroke="rgba(42,107,58,0.45)" strokeWidth="3.5" strokeLinecap="round" />
          <path
            d="M50 70 C50 70 30 65 22 50 C20 46 21 40 25 38 C30 36 38 40 44 50 C48 57 50 65 50 70Z"
            fill="#3a8c4e"
          />
          <path
            d="M50 58 C50 58 68 50 78 36 C81 31 80 25 76 23 C71 21 63 26 57 36 C53 43 50 52 50 58Z"
            fill="#f5c842"
          />
          <ellipse cx="50" cy="102" rx="14" ry="3.5" fill="rgba(92,61,30,0.1)" />
          <circle cx="50" cy="42" r="4" fill="#e0a820" />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="flex items-baseline gap-2">
        <span className="font-display font-black text-xl tracking-tight text-foreground">Pack</span>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">to</span>
        <span className="font-display font-black text-xl tracking-tight text-accent-foreground" style={{ color: '#e0a820' }}>Produce</span>
      </div>
    </div>
  );
}
