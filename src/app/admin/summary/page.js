'use client'

import { useEffect, useMemo, useRef, useState, Fragment } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FLOORS } from '@/lib/constants'
import AdminBackLink from '@/components/admin/AdminBackLink'

// P3–P9 → routes 2–8
const SUMMARY_FLOORS = FLOORS.filter(f => f.route >= 2 && f.route <= 8)
const SUMMARY_FLOOR_IDS = new Set(SUMMARY_FLOORS.map(f => String(f.route)))
const SUMMARY_FLOOR_LABELS = SUMMARY_FLOORS.map(f => f.label).join('-')
const ALL_FLOOR_IDS = FLOORS.map(f => String(f.route))
const FLOOR_LABEL_BY_ID = Object.fromEntries(FLOORS.map(f => [String(f.route), f.label]))
const PAGE_SIZE = 1000

const SPOT_TYPE_LABELS = {
  regular: 'Regular',
  reserved: 'Reserved',
  compact: 'Compact',
  ev: 'EV',
  ada: 'ADA',
  ada_ev: 'ADA + EV',
}

const isAssignedTenant = (label) => {
  if (!label) return false
  const normalized = String(label).trim().toLowerCase()
  return normalized !== 'unassigned' && normalized !== 'unlabeled'
}

async function fetchAllSpots() {
  const spots = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('parking_spots')
      .select('floor_id, display_label, spot_type, original_label, custom_label')
      .in('floor_id', ALL_FLOOR_IDS)
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
  const header = ['Tenant', 'Space #', 'Parker', 'Phone']
  const lines = [header.map(escapeCsvCell).join(',')]

  for (const row of rows) {
    for (const spot of row.electedSpots) {
      lines.push([
        escapeCsvCell(row.tenant),
        escapeCsvCell(spot.spaceCode || spot.spotNumber),
        escapeCsvCell(spot.parkerName || ''),
        escapeCsvCell(spot.phone || ''),
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

function tenantDisplay(label) {
  const tenant = label?.trim()
  if (!isAssignedTenant(tenant)) return 'Unassigned'
  return tenant
}

function formatPhoneDisplay(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  const trimmed = String(phone || '').trim()
  return trimmed || null
}

function telHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) return `tel:+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`
  if (digits.length >= 7) return `tel:${digits}`
  return null
}

function PhoneLink({ phone, className = '' }) {
  const display = formatPhoneDisplay(phone)
  if (!display) return <span className={className}>—</span>
  const href = telHref(phone)
  if (!href) return <span className={className}>{display}</span>
  return (
    <a href={href} className={`text-blue-700 hover:underline ${className}`} onClick={(e) => e.stopPropagation()}>
      {display}
    </a>
  )
}

async function fetchParkerPhones() {
  const requests = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('spot_requests')
      .select('status, floor_id, spot_number, requester_name, requester_phone, submitted_at')
      .not('requester_phone', 'is', null)
      .order('submitted_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) return { bySpotAndParker: {}, bySpot: {} }
    requests.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  const bySpotAndParker = {}
  const bySpot = {}

  const consider = (row) => {
    const phone = row.requester_phone?.trim()
    const spaceCode = String(row.spot_number || '').trim().replace(/\s+/g, '')
    if (!phone || !spaceCode) return
    const floorId = String(row.floor_id || '')
    const parker = String(row.requester_name || '').trim().toLowerCase().replace(/\s+/g, ' ')
    const spotKey = `${floorId}|${spaceCode.toLowerCase()}`
    if (parker && !bySpotAndParker[`${spotKey}|${parker}`]) {
      bySpotAndParker[`${spotKey}|${parker}`] = phone
    }
    if (!bySpot[spotKey]) bySpot[spotKey] = phone
    if (!bySpot[spaceCode.toLowerCase()]) bySpot[spaceCode.toLowerCase()] = phone
  }

  for (const row of requests) {
    if (row.status === 'approved') consider(row)
  }
  for (const row of requests) {
    consider(row)
  }

  return { bySpotAndParker, bySpot }
}

function lookupParkerPhone(phones, floorId, spaceCode, parkerName) {
  const code = String(spaceCode || '').trim().toLowerCase()
  const floor = String(floorId || '')
  const parker = String(parkerName || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const spotKey = `${floor}|${code}`
  if (parker && phones.bySpotAndParker[`${spotKey}|${parker}`]) {
    return phones.bySpotAndParker[`${spotKey}|${parker}`]
  }
  return phones.bySpot[spotKey] || phones.bySpot[code] || null
}

function garageLevelFromFloorLabel(floorLabel) {
  const match = String(floorLabel || '').match(/(\d+)/)
  return match ? match[1] : ''
}

function spaceCodeFromSpot(floorLabel, spotNumber) {
  const raw = String(spotNumber || '').trim().replace(/\s+/g, '')
  if (/^\d+-\d+/.test(raw)) return raw
  const level = garageLevelFromFloorLabel(floorLabel)
  if (!level || !raw) return raw
  return `${level}-${raw}`
}

function normalizeSpaceQuery(query) {
  return query
    .trim()
    .toLowerCase()
    .replace(/^p\s*/i, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function scoreSpaceMatch(spaceCode, query) {
  const code = String(spaceCode).toLowerCase()
  if (code === query) return 0
  if (code.startsWith(query)) return 1
  if (code.includes(query)) return 2
  return null
}

export default function AllocationSummaryPage() {
  const [rows, setRows] = useState([])
  const [lookupSpots, setLookupSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedTenant, setExpandedTenant] = useState(null)
  const [tab, setTab] = useState('summary')
  const [query, setQuery] = useState('')
  const searchInputRef = useRef(null)

  useEffect(() => {
    loadSummary()
  }, [])

  useEffect(() => {
    if (tab !== 'search') return
    const timer = setTimeout(() => searchInputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [tab])

  const loadSummary = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchAllSpots()
      const parkerPhones = await fetchParkerPhones()
      const searchable = []
      const byTenant = {}

      for (const spot of data) {
        const spotNumber = spot.original_label?.trim()
        if (!spotNumber || spotNumber.toLowerCase() === 'unlabeled') continue

        const floorLabel = FLOOR_LABEL_BY_ID[String(spot.floor_id)] || `Level ${spot.floor_id}`
        const spaceCode = spaceCodeFromSpot(floorLabel, spotNumber)
        const parkerName = spot.custom_label?.trim() || null
        const phone = lookupParkerPhone(parkerPhones, spot.floor_id, spaceCode, parkerName)
        searchable.push({
          spotNumber,
          spaceCode,
          floorId: String(spot.floor_id),
          floorLabel,
          tenant: tenantDisplay(spot.display_label),
          phone,
          parkerName,
          spotType: spot.spot_type || 'regular',
        })

        if (!SUMMARY_FLOOR_IDS.has(String(spot.floor_id))) continue
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
            spotNumber,
            spaceCode,
            parkerName,
            phone,
          })
        }
      }

      searchable.sort((a, b) => compareSpotNumbers(a.spaceCode, b.spaceCode))

      const sorted = Object.values(byTenant)
        .map(row => ({
          ...row,
          electedSpots: row.electedSpots.sort((a, b) => compareSpotNumbers(a.spotNumber, b.spotNumber)),
        }))
        .sort((a, b) => a.tenant.localeCompare(b.tenant, undefined, { sensitivity: 'base' }))

      setLookupSpots(searchable)
      setRows(sorted)
    } catch (err) {
      setError(err.message || 'Failed to load summary')
      setLookupSpots([])
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

  const searchResults = useMemo(() => {
    const normalized = normalizeSpaceQuery(query)
    if (!normalized) return []

    return lookupSpots
      .map((spot) => {
        const score = scoreSpaceMatch(spot.spaceCode, normalized)
        if (score == null) return null
        return { ...spot, score }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score
        return compareSpotNumbers(a.spaceCode, b.spaceCode)
      })
      .slice(0, 40)
  }, [lookupSpots, query])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <AdminBackLink className="mb-2" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Allocation Summary</h1>
          <p className="text-gray-600 mt-1">
            Aggregated by tenant across all levels ({SUMMARY_FLOOR_LABELS})
          </p>
        </div>
        {tab === 'summary' && (
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
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-xl border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('summary')}
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
            tab === 'summary' ? 'bg-gray-900 text-white' : 'text-gray-600'
          }`}
        >
          Summary
        </button>
        <button
          type="button"
          onClick={() => setTab('search')}
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
            tab === 'search' ? 'bg-gray-900 text-white' : 'text-gray-600'
          }`}
        >
          Search
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {tab === 'search' ? (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
            <label htmlFor="space-search" className="block font-semibold text-gray-800">
              Look up a space number
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Type the stall as level-space, like 3-144.
            </p>
            <input
              id="space-search"
              ref={searchInputRef}
              type="search"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 3-144"
              className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-lg text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading spaces…</div>
          ) : !query.trim() ? (
            <div className="p-10 text-center text-gray-500">
              Enter a stall like 3-144 to audit it in the garage.
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No spaces match “{query.trim()}”.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {searchResults.map((spot, idx) => (
                <li key={`${spot.floorId}-${spot.spaceCode}-${idx}`} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold tabular-nums text-gray-900">{spot.spaceCode}</p>
                      <p className="mt-1 text-sm text-gray-500">{spot.floorLabel}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {SPOT_TYPE_LABELS[spot.spotType] || spot.spotType}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Tenant</dt>
                      <dd className="font-medium text-gray-900 text-right">{spot.tenant}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Parker</dt>
                      <dd className="font-medium text-gray-900 text-right">{spot.parkerName || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Phone</dt>
                      <dd className="font-medium text-right">
                        <PhoneLink phone={spot.phone} />
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Allocated spaces vs elected reserved
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Available = spaces assigned to the tenant. Elected = spaces marked Reserved.
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
                                    <th className="px-3 py-2 font-semibold text-gray-700">Phone</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.electedSpots.map((spot, idx) => (
                                    <tr key={`${spot.spotNumber}-${idx}`} className="border-b border-gray-100 last:border-0">
                                      <td className="px-3 py-2 font-medium text-gray-900 tabular-nums">
                                        {spot.spaceCode || spot.spotNumber}
                                      </td>
                                      <td className="px-3 py-2 text-gray-600">
                                        {spot.parkerName || '—'}
                                      </td>
                                      <td className="px-3 py-2">
                                        <PhoneLink phone={spot.phone} />
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
      )}
    </div>
  )
}
