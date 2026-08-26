import Link from 'next/link'

export default function AdminBackLink({ className = '' }) {
  return (
    <Link
      href="/admin"
      className={`inline-flex items-center gap-2 rounded-full border border-vend-black bg-vend-black px-3 py-1.5 text-xs font-semibold text-vend-white transition-colors hover:bg-vend-slate hover:border-vend-slate ${className}`}
    >
      ← Admin dashboard
    </Link>
  )
}
