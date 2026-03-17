// This is now the admin dashboard (protected)
'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

// route = actual image/file number
// label = P-level shown to the user
const FLOORS = [
  { route: 2,  label: 'P3'  },
  { route: 3,  label: 'P4'  },
  { route: 4,  label: 'P5'  },
  { route: 5,  label: 'P6'  },
  { route: 6,  label: 'P7'  },
  { route: 7,  label: 'P8'  },
  { route: 8,  label: 'P9'  },
  { route: 9,  label: 'P10' },
  { route: 10, label: 'P11' },
  { route: 11, label: 'P12' },
  // route 12 skipped — P13 doesn't exist
   { route: 12, label: 'P14' },
  { route: 13, label: 'P15' },
  { route: 14, label: 'P16' },
  { route: 15, label: 'P17' },
  { route: 16, label: 'P18' },
  { route: 17, label: 'P18' },
]

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.email}
        </p>
      </div>
      {/* Requests Navigation */}
<div className="mt-6 mb-8">
  <Link
    href="/admin/requests"
    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl shadow hover:bg-gray-700 transition-colors font-medium"
  >
    📋 View Parking Requests
  </Link>
</div>

      {/* Floor Navigation */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Manage Floors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {FLOORS.map(({ route, label }) => (
            <Link
              key={route}
              href={`/admin/floor/${route}`}
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{label}</h3>
                  <p className="text-sm text-gray-500 mt-1">Edit parking layout</p>
                </div>
                <span className="text-blue-600 text-xl">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}