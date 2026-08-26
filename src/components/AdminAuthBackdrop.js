import Image from 'next/image'

export default function AdminAuthBackdrop({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Image
        src="/login-background.png"
        alt=""
        fill
        priority
        quality={100}
        sizes="100vw"
        className="object-cover object-center pointer-events-none select-none"
        aria-hidden
      />
      <div className="absolute inset-0 bg-vend-black/45" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export function AdminAuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-vend-concrete/40 bg-vend-white shadow-2xl shadow-black/20">
        <div className="border-b border-vend-mint-600/30 bg-vend-mint px-6 py-6">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-vend-black/15 bg-vend-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-vend-black">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Staff portal
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide text-vend-black/70">The Republic</p>
          <h1 className="mt-1 font-headline text-2xl tracking-tight text-vend-black">{title}</h1>
          {subtitle && (
            <p className="mt-1 font-subhead text-sm text-vend-black/75">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
