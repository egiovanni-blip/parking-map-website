export default function Footer() {
  return (
    <footer className="bg-vend-black text-vend-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-xl font-headline tracking-tight">The Republic</p>
            <p className="text-vend-mint text-sm font-semibold mt-0.5">Digital parking map</p>
            <p className="text-vend-concrete text-sm mt-2 font-normal">
              Find your space. Get moving.
            </p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-vend-concrete text-sm">
              Powered by Vend
            </p>
            <p className="text-vend-slate text-xs mt-1">
              © {new Date().getFullYear()} Vend Park Inc.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
