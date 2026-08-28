export default function AuthPageBackdrop({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Native img avoids Next.js re-encode quality loss on a hero photo */}
      <img
        src="/login-background.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
        decoding="async"
        fetchPriority="high"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/40 to-black/55"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
