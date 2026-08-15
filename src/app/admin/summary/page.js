'use client'

import { useEffect, useState, Fragment } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FLOORS } from '@/lib/constants'

// P3–P9 → routes 2–8
const SUMMARY_FLOORS = FLOORS.filter(f => f.route >= 2 && f.route <= 8)
const SUMMARY_FLOOR_IDS = SUMMARY_FLOORS.map(f => String(f.route))
const SUMMARY_FLOOR_LABELS = SUMMARY_FLOORS.map(f => f.label).join('-')
const PAGE_SIZE = 1000

const isAssignedTenant = (label) => {
  if (!label) return false
  const normalized = String(label).trim().toLowerCase()
  return normalized !== 'unassigned' && normalized !== 'unlabeled'
}

async function fetchAllSummarySpots() {
  const spots = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('parking_spots')
      .select('display_label, spot_type, original_label, custom_label')
      .in('floor_id', SUMMARY_FLOOR_IDS)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    spots.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return spots
}

function compareSpotNumbers(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function escapeCsvCell(value) {
  const str = value == null ? '' : String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function exportParkersToExcel(rows) {
  const header = ['Tenant', 'Space #', 'Parker']
  const lines = [header.map(escapeCsvCell).join(',')]

  for (const row of rows) {
    for (const spot of row.electedSpots) {
      lines.push([
        escapeCsvCell(row.tenant),
        escapeCsvCell(spot.spotNumber),
        escapeCsvCell(spot.parkerName || ''),
      ].join(','))
    }
  }

  const csv = `\uFEFF${lines.join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `allocation-summary-parkers-${date}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function AllocationSummaryPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedTenant, setExpandedTenant] = useState(null)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchAllSummarySpots()
      const byTenant = {}

      for (const spot of data) {
        // Skip placeholder / unmapped rows that aren't real numbered spaces
        if (!spot.original_label) continue
        const tenant = spot.display_label?.trim()
        if (!isAssignedTenant(tenant)) continue

        const key = tenant.toLowerCase()
        if (!byTenant[key]) {
          byTenant[key] = { tenant, available: 0, elected: 0, electedSpots: [] }
        }
        byTenant[key].available += 1
        if (spot.spot_type === 'reserved') {
          byTenant[key].elected += 1
          byTenant[key].electedSpots.push({
            spotNumber: spot.original_label?.trim() || '—',
            parkerName: spot.custom_label?.trim() || null,
          })
        }
      }

      const sorted = Object.values(byTenant)
        .map(row => ({
          ...row,
          electedSpots: row.electedSpots.sort((a, b) => compareSpotNumbers(a.spotNumber, b.spotNumber)),
        }))
        .sort((a, b) => a.tenant.localeCompare(b.tenant, undefined, { sensitivity: 'base' }))

      setRows(sorted)
    } catch (err) {
      setError(err.message || 'Failed to load summary')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const totalAvailable = rows.reduce((sum, r) => sum + r.available, 0)
  const totalElected = rows.reduce((sum, r) => sum + r.elected, 0)
  const totalParkers = rows.reduce((sum, r) => sum + r.electedSpots.length, 0)

  const handleExport = () => {
    if (totalParkers === 0) return
    exportParkersToExcel(rows)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Allocation Summary</h1>
          <p className="text-gray-600 mt-1">
            Aggregated by tenant across all levels ({SUMMARY_FLOOR_LABELS})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={loading || totalParkers === 0}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            Export to Excel
          </button>
          <button
            onClick={loadSummary}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Allocated spaces vs elected reserved
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Available = spots assigned to the tenant. Elected = spots marked Reserved.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading summary…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No tenant allocations found for these levels.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-800">Tenant</th>
                  <th className="px-5 py-3 font-semibold text-gray-800 text-right">Available</th>
                  <th className="px-5 py-3 font-semibold text-gray-800 text-right">Elected</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isExpanded = expandedTenant === row.tenant
                  return (
                    <Fragment key={row.tenant}>
                      <tr key={row.tenant} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-900 font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              if (row.elected === 0) return
                              setExpandedTenant(isExpanded ? null : row.tenant)
                            }}
                            className={`flex items-center gap-2 text-left w-full group ${
                              row.elected > 0 ? 'cursor-pointer' : 'cursor-default'
                            }`}
                            aria-expanded={isExpanded}
                            disabled={row.elected === 0}
                          >
                            <span className="text-gray-400 text-xs w-4 flex-shrink-0">
                              {row.elected > 0 ? (isExpanded ? '▼' : '▶') : ''}
                            </span>
                            <span className={row.elected > 0 ? 'group-hover:text-blue-700 group-hover:underline' : ''}>
                              {row.tenant}
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-3 text-gray-700 text-right tabular-nums">{row.available}</td>
                        <td className="px-5 py-3 text-gray-700 text-right tabular-nums">{row.elected}</td>
                      </tr>
                      {isExpanded && row.electedSpots.length > 0 && (
                        <tr key={`${row.tenant}-details`} className="border-b border-gray-100 bg-gray-50">
                          <td colSpan={3} className="px-5 py-3">
                            <div className="ml-6 rounded-lg border border-gray-200 bg-white overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                                    <th className="px-3 py-2 font-semibold text-gray-700">Space #</th>
                                    <th className="px-3 py-2 font-semibold text-gray-700">Parker</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.electedSpots.map((spot, idx) => (
                                    <tr key={`${spot.spotNumber}-${idx}`} className="border-b border-gray-100 last:border-0">
                                      <td className="px-3 py-2 font-medium text-gray-900 tabular-nums">
                                        {spot.spotNumber}
                                      </td>
                                      <td className="px-3 py-2 text-gray-600">
                                        {spot.parkerName || '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-5 py-3 font-semibold text-gray-900">Total</td>
                  <td className="px-5 py-3 font-semibold text-gray-900 text-right tabular-nums">{totalAvailable}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900 text-right tabular-nums">{totalElected}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
