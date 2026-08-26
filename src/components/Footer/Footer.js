export default function Footer() {
  return (
    <footer className="bg-vend-black text-vend-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="md:flex-1">
            <p className="text-lg font-headline tracking-tight leading-tight">The Republic</p>
            <p className="text-vend-mint text-sm font-semibold mt-0.5">Digital parking map</p>
          </div>

          <p className="text-vend-concrete text-sm font-normal text-center md:flex-1">
            Find your space. Get moving.
          </p>

          <div className="text-center md:text-right md:flex-1">
            <p className="text-vend-concrete text-sm leading-tight">
              Powered by Vend
            </p>
            <p className="text-vend-slate text-xs mt-0.5">
              © {new Date().getFullYear()} Vend Park Inc.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
