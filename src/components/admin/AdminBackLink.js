import Link from 'next/link'

export default function AdminBackLink({ className = '' }) {
  return (
    <Link
      href="/admin"
      className={`inline-flex items-center gap-2 rounded-full border border-vend-mint bg-vend-mint px-3 py-1.5 text-xs font-semibold text-vend-black transition-colors hover:bg-vend-mint-600 hover:border-vend-mint-600 ${className}`}
    >
      Back
    </Link>
  )
}
