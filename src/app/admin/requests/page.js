'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800'
}

export default function RequestsAdminPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    setLoading(true)
    const query = supabase
      .from('spot_requests')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (filter !== 'all') {
      query.eq('status', filter)
    }

    const { data, error } = await query
    if (!error) setRequests(data || [])
    setLoading(false)
  }

  const handleAction = async (id, status) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/spot-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) loadRequests()
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parking Spot Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Review and approve incoming spot requests</p>
        </div>
        <button
          onClick={loadRequests}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'denied', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-600">No {filter === 'all' ? '' : filter} requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                {/* Left — Request Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      Spot {req.spot_number}
                    </span>
                    <span className="text-sm text-gray-500">{req.floor_label}</span>
                    {req.spot_type && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {req.spot_type}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[req.status]}`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name: </span>
                      <span className="font-medium text-gray-900">{req.requester_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Company: </span>
                      <span className="font-medium text-gray-900">{req.requester_company}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email: </span>
                      <a href={`mailto:${req.requester_email}`} className="font-medium text-blue-600 hover:underline">
                        {req.requester_email}
                      </a>
                    </div>
                  </div>

                  {req.notes && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-gray-500">Notes: </span>{req.notes}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-400">
                    Submitted {new Date(req.submitted_at).toLocaleString()}
                    {req.reviewed_at && ` · Reviewed ${new Date(req.reviewed_at).toLocaleString()}`}
                  </div>
                </div>

                {/* Right — Actions */}
                {req.status === 'pending' && (
                  <div className="flex gap-2 lg:flex-col xl:flex-row">
                    <button
                      onClick={() => handleAction(req.id, 'approved')}
                      disabled={actionLoading === req.id}
                      className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === req.id ? '...' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'denied')}
                      disabled={actionLoading === req.id}
                      className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === req.id ? '...' : '✕ Deny'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}