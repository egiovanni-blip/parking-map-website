'use client'

import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  const hideOnMobileFloor = pathname?.startsWith('/floor/')

  return (
    <footer className={`bg-vend-black text-vend-white ${hideOnMobileFloor ? 'hidden lg:block' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-vend-mint rounded-lg flex items-center justify-center mr-3">
                <span className="font-headline text-vend-black font-bold">V</span>
              </div>
              <div>
                <p className="text-xl font-headline tracking-tight">The Republic Digital Parking Map</p>
                <p className="text-vend-concrete text-sm font-normal">Find your space. Get moving.</p>
              </div>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-vend-concrete text-sm">
              © {new Date().getFullYear()} Vend Park Inc.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
