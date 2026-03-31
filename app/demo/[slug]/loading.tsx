/**
 * app/demo/[slug]/loading.tsx
 * Skeleton loading saat page sedang dimuat
 */

export default function DemoLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Animated logo */}
        <div className="mx-auto w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-emerald-500/60 animate-ping animation-delay-150" />
          <div className="relative w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-400" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-48 bg-gray-800 rounded animate-pulse mx-auto" />
          <div className="h-3 w-32 bg-gray-800/60 rounded animate-pulse mx-auto" />
        </div>

        <p className="text-gray-500 text-sm font-mono">Memuat halaman...</p>
      </div>
    </div>
  );
}
