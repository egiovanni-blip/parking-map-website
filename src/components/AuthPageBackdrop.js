import Image from 'next/image'

export default function AuthPageBackdrop({ children }) {
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
