import localFont from 'next/font/local'
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

// Self-hosted (latin subset) so builds don't depend on fetching from Google Fonts.
const spaceGrotesk = localFont({
  src: './fonts/SpaceGrotesk-latin-700.woff2',
  weight: '700',
  variable: '--font-space-grotesk',
  display: 'swap',
})

const manrope = localFont({
  src: './fonts/Manrope-latin-variable.woff2',
  weight: '400 800',
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata = {
  title: 'The Republic | Parking Map',
  description: 'Sign in. Find your space. Friction-free parking for tenants at The Republic.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full ${spaceGrotesk.variable} ${manrope.variable}`}>
      <body className={`${manrope.className} h-full flex flex-col`}>
        <AuthProvider>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
