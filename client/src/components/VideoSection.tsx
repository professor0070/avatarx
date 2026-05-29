import { useRole } from '../hooks/useRole';

/**
 * VideoSection — Browser-stable video showcase for seller/creator roles.
 *
 * Uses native `<video controls>` with `preload="metadata"` for reliable
 * cross-browser playback. No autoplay, no muted hacks, no custom state.
 * The browser's native controls handle play/pause/volume/fullscreen,
 * eliminating media-session conflicts entirely.
 */
export function VideoSection() {
  const { activeRole } = useRole();

  // Guard: only visible for seller or creator roles
  if (activeRole !== 'seller' && activeRole !== 'creator') {
    return null;
  }

  // Cloudinary optimized video URL with f_auto,q_auto injected after upload/
  const optimizedUrl =
    'https://res.cloudinary.com/dc68wrpii/video/upload/f_auto,q_auto/v1779906687/mp4_ytmnee.mp4';

  return (
    <section className="my-12 w-full">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 shadow-2xl border border-slate-800/80 md:p-12">
        {/* Decorative subtle ambient glows */}
        <div className="absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute -right-1/4 -bottom-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Text/Content side */}
          <div className="lg:col-span-5 space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 dark:bg-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Creator Hub Video
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Elevate Your Avatar Design Business
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Watch this quick showcase on maximizing your sales, improving asset quality, and leveraging AvatarX tools to scale your operations.
            </p>
          </div>

          {/* Video side */}
          <div className="lg:col-span-7">
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30">
              <video
                src={optimizedUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full h-auto aspect-video object-cover rounded-2xl block"
              />
              <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
