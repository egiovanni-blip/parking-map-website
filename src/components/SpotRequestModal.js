'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  { route: 12, label: 'P14' },
  { route: 13, label: 'P15' },
  { route: 14, label: 'P16' },
  { route: 15, label: 'P17' },
  { route: 16, label: 'P18' },
]

export default function SpotRequestModal({ isOpen, onClose, preselectedSpot, floorId, floorLabel }) {
  const [step, setStep] = useState(1) // 1 = select spot, 2 = fill form
  const [selectedFloorId, setSelectedFloorId] = useState(floorId || '2')
  const [availableSpots, setAvailableSpots] = useState([])
  const [selectedSpot, setSelectedSpot] = useState(preselectedSpot || null)
  const [loadingSpots, setLoadingSpots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    requester_name: '',
    requester_email: '',
    requester_company: '',
    notes: ''
  })

  // If a spot was preselected (clicked from map), skip to step 2
  useEffect(() => {
    if (preselectedSpot) {
      setSelectedSpot(preselectedSpot)
      setStep(2)
    }
  }, [preselectedSpot])

  // Load available spots when floor changes
  useEffect(() => {
    if (!isOpen) return
    loadAvailableSpots(selectedFloorId)
  }, [selectedFloorId, isOpen])

  const loadAvailableSpots = async (fId) => {
    setLoadingSpots(true)
    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('floor_id', fId)
      .is('display_label', null)
      .order('original_label')

    if (!error && data) {
      // Also include spots where display_label is 'Unassigned'
      const { data: unassigned } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('floor_id', fId)
        .eq('display_label', 'Unassigned')
        .order('original_label')

      const combined = [...(data || []), ...(unassigned || [])]
      setAvailableSpots(combined)
    }
    setLoadingSpots(false)
  }

  const handleSubmit = async () => {
    if (!selectedSpot) return setError('Please select a spot first.')
    if (!form.requester_name) return setError('Please enter your name.')
    if (!form.requester_email) return setError('Please enter your email.')
    if (!form.requester_company) return setError('Please enter your company name.')

    setSubmitting(true)
    setError('')

    const currentFloor = FLOORS.find(f => f.route === parseInt(selectedFloorId))

    try {
      const res = await fetch('/api/spot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          floor_id: selectedFloorId,
          floor_label: currentFloor?.label || floorLabel,
          spot_identifier: selectedSpot.id || selectedSpot.spot_identifier,
          spot_number: selectedSpot.original_label || selectedSpot.spotNumber,
          spot_type: selectedSpot.spot_type || selectedSpot.spotType,
          requester_name: form.requester_name,
          requester_email: form.requester_email,
          requester_company: form.requester_company,
          notes: form.notes
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Submission failed')

      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedSpot(preselectedSpot || null)
    setSubmitted(false)
    setError('')
    setForm({ requester_name: '', requester_email: '', requester_company: '', notes: '' })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">🅿️ Request a Parking Spot</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
            <p className="text-gray-600 mb-2">Your request for spot <b>{selectedSpot?.original_label || selectedSpot?.spotNumber}</b> has been received.</p>
            <p className="text-gray-500 text-sm mb-6">You'll hear back at <b>{form.requester_email}</b> once it's reviewed.</p>
            <button onClick={handleClose} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <div className="p-6">

            {/* Step 1 — Select a Spot */}
            {step === 1 && (
              <div>
                <p className="text-gray-600 text-sm mb-4">Select the floor and spot you'd like to request.</p>

                {/* Floor Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    value={selectedFloorId}
                    onChange={(e) => {
                      setSelectedFloorId(e.target.value)
                      setSelectedSpot(null)
                    }}
                  >
                    {FLOORS.map(f => (
                      <option key={f.route} value={f.route}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Spot Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Spots {loadingSpots && <span className="text-gray-400">(loading...)</span>}
                  </label>
                  {availableSpots.length === 0 && !loadingSpots ? (
                    <p className="text-sm text-gray-500 italic">No available spots on this floor.</p>
                  ) : (
                    <select
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={selectedSpot?.id || ''}
                      onChange={(e) => {
                        const spot = availableSpots.find(s => s.id === e.target.value)
                        setSelectedSpot(spot || null)
                      }}
                    >
                      <option value="">— Select a spot —</option>
                      {availableSpots.map(spot => (
                        <option key={spot.id} value={spot.id}>
                          {spot.original_label} {spot.spot_type ? `(${spot.spot_type})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or browse the map</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <a
                  href={`/floor/${selectedFloorId}`}
                  target="_blank"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  🗺️ Open Floor Map →
                </a>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      if (!selectedSpot) return setError('Please select a spot to continue.')
                      setError('')
                      setStep(2)
                    }}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Fill in Details */}
            {step === 2 && (
              <div>
                {/* Selected Spot Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Requesting spot</div>
                    <div className="font-bold text-gray-900">
                      {selectedSpot?.original_label || selectedSpot?.spotNumber}
                      {(selectedSpot?.spot_type || selectedSpot?.spotType) &&
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          ({selectedSpot?.spot_type || selectedSpot?.spotType})
                        </span>
                      }
                    </div>
                  </div>
                  {!preselectedSpot && (
                    <button onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline">Change</button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Jane Smith"
                      value={form.requester_name}
                      onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="jane@company.com"
                      value={form.requester_email}
                      onChange={(e) => setForm({ ...form, requester_email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company / Tenant Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Acme Corp"
                      value={form.requester_company}
                      onChange={(e) => setForm({ ...form, requester_company: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      rows={3}
                      placeholder="Any additional context..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

                <div className="mt-6 flex gap-3 justify-end">
                  {!preselectedSpot && (
                    <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            )}

            {step === 1 && error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}