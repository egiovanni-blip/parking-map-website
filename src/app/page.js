'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          The Republic
        </h1>
        <p className="text-gray-600 text-center mb-10">
          Parking &amp; Garage Access
        </p>

        {/* Login Options */}
        <div className="space-y-4">
          <Link
            href="/tenant/login"
            className="block w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-blue-100 transition-colors">
                🅿️
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Tenant Access</h2>
                <p className="text-sm text-gray-600">View your parking spaces</p>
              </div>
              <span className="ml-auto text-gray-400 group-hover:text-blue-600 transition-colors">→</span>
            </div>
          </Link>

          <Link
            href="/login"
            className="block w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl group-hover:bg-gray-200 transition-colors">
                ⚙️
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Admin Access</h2>
                <p className="text-sm text-gray-600">Manage parking spaces</p>
              </div>
              <span className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors">→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
