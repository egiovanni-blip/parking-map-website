// app/floor/[floorId]/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SpotRequestModal from '@/components/SpotRequestModal'
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
  { route: 17, label: 'P18' },
]

const SPOT_TYPES = [
  { id: 'regular', name: 'Regular', color: '#fbbf24' },
  { id: 'reserved', name: 'Reserved', color: '#ef4444' },
  { id: 'compact', name: 'Compact', color: '#a855f7' },
  { id: 'ev', name: 'EV', color: '#10b981' },
  { id: 'ada', name: 'ADA', color: '#3b82f6' },
  { id: 'ada_ev', name: 'ADA + EV', color: '#1e40af' }
]

const OCCUPANCY_ICONS = {
  company: {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd" /></svg>',
    color: '#ffffff',
    title: 'Company-Occupied'
  },
  person: {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>',
    color: '#ffffff',
    title: 'Person-Occupied'
  }
}

const getOccupancyStatus = (spot) => {
  const hasCompany = spot.companyName && String(spot.companyName).toLowerCase() !== 'unassigned'
  const hasPerson = spot.parkerName
  if (hasCompany) return { type: 'company', icon: OCCUPANCY_ICONS.company, description: `Occupied by: ${spot.companyName}` }
  if (hasPerson) return { type: 'person', icon: OCCUPANCY_ICONS.person, description: `Parker: ${spot.parkerName}` }
  return { type: null, icon: null, description: 'Available (Unassigned)' }
}

export default function PublicFloorPage() {
  const params = useParams()
  const router = useRouter()
  const floorId = params.floorId || '2'

  const currentIndex = FLOORS.findIndex(f => f.route === parseInt(floorId))
  const currentFloor = FLOORS[currentIndex] || { route: parseInt(floorId), label: 'P?' }

  const [svgContent, setSvgContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spots, setSpots] = useState([])
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [containerRect, setContainerRect] = useState(null)
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [svgDimensions, setSvgDimensions] = useState({ width: 1000, height: 800 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestModalSpot, setRequestModalSpot] = useState(null)
  const [expandedCompany, setExpandedCompany] = useState(null)
  const [tenantCompany, setTenantCompany] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const goToNextFloor = () => {
    if (currentIndex < FLOORS.length - 1) router.push(`/floor/${FLOORS[currentIndex + 1].route}`)
  }
  const goToPrevFloor = () => {
    if (currentIndex > 0) router.push(`/floor/${FLOORS[currentIndex - 1].route}`)
  }
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) containerRef.current.requestFullscreen()
      else if (containerRef.current.webkitRequestFullscreen) containerRef.current.webkitRequestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Read tenant cookie or detect admin
  useEffect(() => {
    const init = async () => {
      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, ...val] = cookie.trim().split('=')
          acc[key.trim()] = val.join('=')
          return acc
        }, {})
        if (cookies['tenant_session']) {
          const value = decodeURIComponent(cookies['tenant_session'])
          const tenant = JSON.parse(value)
          if (tenant?.company_name) {
            setTenantCompany(tenant.company_name)
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) setIsAdmin(true)
        }
      } catch (err) {
        console.error('Cookie read error:', err)
      }
    }
    init()
  }, [])

  const companiesMatchCI = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase()
  const isUnassignedSpot = (name) => name == null || String(name).toLowerCase() === 'unassigned'
  const isOtherCompany = (companyName) =>
    tenantCompany && companyName && !isUnassignedSpot(companyName) && !companiesMatchCI(companyName, tenantCompany)
  const canRequestSpot = (spot) => {
    if (spot.parkerName) return false
    if (!tenantCompany) return true
    return companiesMatchCI(spot.companyName, tenantCompany) || isUnassignedSpot(spot.companyName)
  }

  const normalizeColor = (color) => {
    if (!color) return ''
    color = color.toLowerCase().trim()
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g)
      if (match && match.length >= 3) {
        const r = parseInt(match[0]).toString(16).padStart(2, '0')
        const g = parseInt(match[1]).toString(16).padStart(2, '0')
        const b = parseInt(match[2]).toString(16).padStart(2, '0')
        return `#${r}${g}${b}`
      }
    }
    if (color.match(/^[0-9a-f]{6}$/i)) return `#${color}`
    return color.replace(/\s+/g, '')
  }

  const isTargetColor = (color) => {
    const normalized = normalizeColor(color)
    const cyan = '#80ffff'
    const yellow = '#ffff80'
    if (normalized === cyan || normalized === yellow) return { match: true, type: normalized === cyan ? 'cyan' : 'yellow' }
    const cyanVariations = ['#80ffff', '#7ffffe', '#81ffff']
    const yellowVariations = ['#ffff80', '#ffff7f', '#ffff81']
    if (cyanVariations.some(v => normalizeColor(v) === normalized)) return { match: true, type: 'cyan' }
    if (yellowVariations.some(v => normalizeColor(v) === normalized)) return { match: true, type: 'yellow' }
    return { match: false }
  }

  const findSpotsWithText = (svgElement) => {
    const spotsFound = []
    const viewBox = svgElement.viewBox?.animVal || svgElement.viewBox?.baseVal
    let svgWidth = viewBox?.width || svgElement.clientWidth || 1000
    let svgHeight = viewBox?.height || svgElement.clientHeight || 800
    setSvgDimensions({ width: svgWidth, height: svgHeight })

    const allElements = svgElement.querySelectorAll('*')
    const coloredShapes = []

    allElements.forEach((element, index) => {
      if (element.tagName.toLowerCase() === 'text') return
      try {
        const computedStyle = window.getComputedStyle(element)
        const fillColor = computedStyle.fill
        if (fillColor && fillColor !== 'none') {
          const colorCheck = isTargetColor(fillColor)
          if (colorCheck.match) {
            const bbox = element.getBBox()
            if (bbox.width < 10 || bbox.height < 10) return
            coloredShapes.push({ element, bbox, type: colorCheck.type, color: fillColor, index })
          }
        }
      } catch (err) {}
    })

    const allTextElements = Array.from(svgElement.querySelectorAll('text'))

    coloredShapes.forEach((shape, shapeIndex) => {
      try {
        const shapeBBox = shape.bbox
        const matchingTexts = []
        allTextElements.forEach((textElement) => {
          try {
            const textBBox = textElement.getBBox()
            const textContent = textElement.textContent?.trim()
            if (!textContent || textContent.length > 10) return
            const textCenterX = textBBox.x + textBBox.width / 2
            const textCenterY = textBBox.y + textBBox.height / 2
            const isInside = textCenterX >= shapeBBox.x && textCenterX <= shapeBBox.x + shapeBBox.width && textCenterY >= shapeBBox.y && textCenterY <= shapeBBox.y + shapeBBox.height
            const distance = Math.sqrt(Math.pow(textCenterX - (shapeBBox.x + shapeBBox.width / 2), 2) + Math.pow(textCenterY - (shapeBBox.y + shapeBBox.height / 2), 2))
            const maxDistance = Math.max(shapeBBox.width, shapeBBox.height) / 2
            if (isInside || distance < maxDistance) matchingTexts.push({ element: textElement, content: textContent, bbox: textBBox, distance, isInside })
          } catch (err) {}
        })
        matchingTexts.sort((a, b) => a.distance - b.distance)
        let spotText = matchingTexts.length > 0 ? matchingTexts[0].content : null
        let cleanText = null
        if (spotText) {
          cleanText = spotText.replace(/\s+/g, ' ').trim()
          const spotNumberMatch = cleanText.match(/([A-Z]?\d+[A-Z]?|\b[A-Z]\d*\b)/i)
          if (spotNumberMatch) cleanText = spotNumberMatch[1]
        }
        spotsFound.push({
          id: `spot_${floorId}_${shapeIndex}`,
          svgX: shapeBBox.x, svgY: shapeBBox.y, svgWidth: shapeBBox.width, svgHeight: shapeBBox.height,
          color: normalizeColor(shape.color), type: shape.type, elementType: shape.element.tagName.toLowerCase(),
          companyName: 'Unassigned', parkerName: null,
          spotNumber: cleanText || `SPOT-${shapeIndex + 1}`, originalSpotNumber: cleanText,
          spotType: 'regular', spotTypeConfig: SPOT_TYPES[0],
          hasText: !!cleanText, shapeIndex, matchingTextsCount: matchingTexts.length,
          isCustomLabeled: false, isFromDatabase: false, dbId: null
        })
      } catch (err) {
        console.error(`Error processing shape ${shapeIndex}:`, err)
      }
    })
    return spotsFound
  }

  useEffect(() => {
    const loadSVG = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/overlays/parking_page_${floorId}.svg`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        setSvgContent(text)
      } catch (err) {
        setError('Parking map not available for this floor')
        setSvgContent('')
      } finally {
        setLoading(false)
      }
    }
    loadSVG()
  }, [floorId])

  useEffect(() => {
    if (!containerRef.current || loading || error) return
    const timer = setTimeout(async () => {
      const container = containerRef.current
      if (!container) return
      const svgElement = container.querySelector('svg')
      if (!svgElement) return
      updateContainerRect()
      try {
        const detectedSpots = findSpotsWithText(svgElement)
        if (detectedSpots.length === 0) { setSpots([]); return }
        const { data: databaseSpots, error: dbError } = await supabase.from('parking_spots').select('*').eq('floor_id', floorId)
        if (dbError) { setSpots(detectedSpots); return }
        const mergedSpots = detectedSpots.map(detectedSpot => {
          const matchingDbSpot = databaseSpots?.find(dbSpot => Math.abs(dbSpot.svg_x - detectedSpot.svgX) < 10 && Math.abs(dbSpot.svg_y - detectedSpot.svgY) < 10)
          if (matchingDbSpot) {
            const spotType = matchingDbSpot.spot_type || 'regular'
            return { ...detectedSpot, id: matchingDbSpot.id, dbId: matchingDbSpot.id, companyName: matchingDbSpot.display_label || 'Unassigned', parkerName: matchingDbSpot.custom_label, spotNumber: matchingDbSpot.original_label || detectedSpot.spotNumber, spotType, spotTypeConfig: SPOT_TYPES.find(t => t.id === spotType) || SPOT_TYPES[0], originalSpotNumber: matchingDbSpot.original_label || detectedSpot.originalSpotNumber, isCustomLabeled: matchingDbSpot.is_custom_labeled, isFromDatabase: true }
          }
          return detectedSpot
        })
        mergedSpots.sort((a, b) => Math.abs(a.svgY - b.svgY) < 10 ? a.svgX - b.svgX : a.svgY - b.svgY)
        setSpots(mergedSpots)
      } catch (error) {
        setSpots([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [svgContent, loading, error, floorId])

  const updateContainerRect = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setContainerRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    }
  }

  useEffect(() => {
    window.addEventListener('resize', updateContainerRect)
    updateContainerRect()
    return () => window.removeEventListener('resize', updateContainerRect)
  }, [])

  const calculateSpotPosition = (spot) => {
    if (!spot || !svgDimensions.width || !svgDimensions.height) return null
    return {
      left: `${(spot.svgX / svgDimensions.width) * 100}%`,
      top: `${(spot.svgY / svgDimensions.height) * 100}%`,
      width: `${Math.max((spot.svgWidth / svgDimensions.width) * 100, 1)}%`,
      height: `${Math.max((spot.svgHeight / svgDimensions.height) * 100, 1)}%`
    }
  }

  const handleSpotClick = (spot) => setSelectedSpot(spot)
  const handleDirectorySpotClick = (spot) => {
    setSelectedSpot(spot)
    const spotEl = document.querySelector(`[data-spot-id="${spot.id}"]`)
    if (spotEl) { spotEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); spotEl.click() }
  }
  const handleRequestSpot = (spot = null) => {
    setRequestModalSpot(spot)
    setShowRequestModal(true)
  }

  const renderInteractiveOverlay = () => {
    if (!svgContent || spots.length === 0) return null
    return (
      <div className="absolute inset-0 pointer-events-none">
        {spots.map((spot) => {
          const pos = calculateSpotPosition(spot)
          if (!pos) return null
          const occupancy = getOccupancyStatus(spot)
          const dotColor = spot.spotTypeConfig?.color || '#9ca3af'
          return (
            <div key={spot.id} className="absolute group" style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}>
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="relative w-4 h-4 rounded-full border-2 border-white shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200 pointer-events-none flex items-center justify-center" style={{ backgroundColor: dotColor, borderColor: 'white' }}>
                  {occupancy.icon && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ width: '100%', height: '100%', color: occupancy.icon.color, padding: '3px' }} dangerouslySetInnerHTML={{ __html: occupancy.icon.svg }} />
                  )}
                </div>
              </div>
              <button
                data-spot-id={spot.id}
                className="absolute inset-0 cursor-pointer transition-all duration-200 border-2 border-transparent rounded pointer-events-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'transparent' }}
                onClick={() => handleSpotClick(spot)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = dotColor; e.currentTarget.style.backgroundColor = `${dotColor}20` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
              />
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl min-w-[200px]">
                  <div className="bg-gray-800 px-3 py-2 rounded-t-lg font-bold text-center border-b border-gray-700">{spot.spotNumber}</div>
                  <div className="p-3">
                    {spot.spotTypeConfig && (
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
                        <span className="text-gray-400">Type:</span>
                        <span className="font-medium" style={{ color: spot.spotTypeConfig.color }}>{spot.spotTypeConfig.name}</span>
                      </div>
                    )}
                    <div className="mb-2 pb-2 border-b border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400">Status:</span>
                        {occupancy.type === null ? (
                          <span className="text-green-400 font-medium">Available</span>
                        ) : (
                          <span className={occupancy.type === 'company' ? 'text-blue-400' : 'text-purple-400'}>Occupied</span>
                        )}
                      </div>
                      {occupancy.type !== null && (
                        <div className="text-xs mt-1">
                          {occupancy.type === 'company' ? (
                            <>
                              <div className="text-blue-300 truncate">
                                {isAdmin || !isOtherCompany(spot.companyName)
                                  ? `Company: ${spot.companyName}`
                                  : 'Company: Occupied'}
                              </div>
                              {spot.parkerName && (
                                <div className="text-purple-300">
                                  {isAdmin ? `Parker: ${spot.parkerName}` : 'Parker: Occupied'}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-purple-300">
                              {isAdmin && spot.parkerName ? `Parker: ${spot.parkerName}` : 'Parker: Occupied'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-center text-gray-500 italic">Click for more details</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parking map for {currentFloor.label}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentFloor.label} - Parking Spaces</h1>
              <p className="text-gray-600 mt-1">View parking spots. Click on any spot for details.</p>
              {!loading && !error && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border border-gray-300"></div>
                    <span className="text-gray-600">{spots.length} total spots</span>
                  </div>
                  <span className="text-gray-600">
                    {spots.filter(s => getOccupancyStatus(s).type !== null).length > 0 && `${spots.filter(s => getOccupancyStatus(s).type !== null).length} occupied`}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={goToPrevFloor} disabled={currentIndex <= 0} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                ← {currentIndex > 0 ? FLOORS[currentIndex - 1].label : 'Back'}
              </button>
              <button onClick={goToNextFloor} disabled={currentIndex >= FLOORS.length - 1} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                {currentIndex < FLOORS.length - 1 ? FLOORS[currentIndex + 1].label : 'Next'} →
              </button>
              {!tenantCompany && !isAdmin && (
                <button onClick={() => handleRequestSpot()} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center gap-2">
                  🅿️ Request a Spot
                </button>
              )}
              <Link href="/" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div ref={containerRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative flex-1">
            <div className="w-full h-[900px] relative overflow-hidden">
              {error && !loading && (
                <div className="text-center p-8 absolute inset-0 flex items-center justify-center bg-white">
                  <div>
                    <div className="text-4xl mb-4">🏢</div>
                    <p className="text-gray-600">{currentFloor.label}</p>
                    <p className="text-sm text-gray-400 mt-2">{error}</p>
                  </div>
                </div>
              )}
              {!loading && !error && svgContent && (
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                    <div ref={svgRef} className="w-full h-full max-w-full max-h-full" dangerouslySetInnerHTML={{ __html: svgContent }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                  </div>
                  {renderInteractiveOverlay()}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md text-xs z-10 max-w-[280px] border border-gray-200">
              <div className="p-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Space Type Breakdown</h3>
                <p className="text-gray-500 text-xs mt-1">Total: {spots.length} spaces</p>
              </div>
              <div className="p-3 max-h-[400px] overflow-y-auto">
                <div className="space-y-3">
                  {SPOT_TYPES.map(type => {
                    const typeSpots = spots.filter(s => s.spotTypeConfig?.id === type.id)
                    if (typeSpots.length === 0) return null
                    const availableCount = typeSpots.filter(s => getOccupancyStatus(s).type === null).length
                    const companyCount = typeSpots.filter(s => getOccupancyStatus(s).type === 'company').length
                    const personCount = typeSpots.filter(s => getOccupancyStatus(s).type === 'person').length
                    return (
                      <div key={type.id} className="border-l-2 pl-2" style={{ borderLeftColor: type.color }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                            <span className="font-medium text-gray-700">{type.name}</span>
                          </div>
                          <span className="font-bold text-gray-800">{typeSpots.length}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1 text-center text-[10px]">
                          {availableCount > 0 && <div className="bg-green-50 text-green-700 rounded px-1 py-0.5"><div>Available</div><div className="font-bold">{availableCount}</div></div>}
                          {companyCount > 0 && <div className="bg-blue-50 text-blue-700 rounded px-1 py-0.5"><div className="flex items-center justify-center gap-0.5"><div className="w-2.5 h-2.5" dangerouslySetInnerHTML={{ __html: OCCUPANCY_ICONS.company.svg }} /><span>Company</span></div><div className="font-bold">{companyCount}</div></div>}
                          {personCount > 0 && <div className="bg-purple-50 text-purple-700 rounded px-1 py-0.5"><div className="flex items-center justify-center gap-0.5"><div className="w-2.5 h-2.5" dangerouslySetInnerHTML={{ __html: OCCUPANCY_ICONS.person.svg }} /><span>Personal</span></div><div className="font-bold">{personCount}</div></div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tenant Directory */}
              {(() => {
                const companies = {}
                spots.forEach(spot => {
                  const company = spot.companyName
                  if (company && !isUnassignedSpot(company)) {
                    if (tenantCompany && !companiesMatchCI(company, tenantCompany)) return
                    if (!companies[company]) companies[company] = []
                    companies[company].push(spot)
                  }
                })
                const companyList = Object.entries(companies).sort((a, b) => a[0].localeCompare(b[0]))
                if (companyList.length === 0) return null
                return (
                  <div className="border-t border-gray-200">
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800">🏢 Tenant Directory</h3>
                      <p className="text-gray-500 text-xs mt-1">{companyList.length} companies</p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {companyList.map(([company, companySpots]) => (
                        <div key={company} className="border-b border-gray-100 last:border-0">
                          <button className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors text-left" onClick={() => setExpandedCompany(expandedCompany === company ? null : company)}>
                            <span className="font-medium text-gray-700 text-xs truncate">{company}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{companySpots.length}</span>
                              <span className="text-gray-400 text-xs">{expandedCompany === company ? '▲' : '▼'}</span>
                            </div>
                          </button>
                          {expandedCompany === company && (
                            <div className="px-3 pb-2 space-y-1">
                              {companySpots.map(spot => {
                                const occupancy = getOccupancyStatus(spot)
                                return (
                                  <button key={spot.id} onClick={() => handleDirectorySpotClick(spot)} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-left">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: spot.spotTypeConfig?.color || '#9ca3af' }} />
                                      <span className="text-xs font-medium text-gray-800">{spot.spotNumber}</span>
                                    </div>
                                    <span className={`text-xs ${occupancy.type === null ? 'text-green-600' : 'text-blue-600'}`}>
                                      {spot.parkerName ? 'Occupied' : 'Available'}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Selected Spot Panel & Spot List */}
        {!loading && !error && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {selectedSpot ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Spot Details</h3>
                    <button onClick={() => setSelectedSpot(null)} className="text-sm text-gray-500 hover:text-gray-700">✕ Close</button>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 mb-3">{selectedSpot.spotNumber}</div>
                      <div className="mb-3">
                        <div className="text-sm text-gray-500">Status</div>
                        <div className="font-medium text-gray-700">
                          {isAdmin
                            ? getOccupancyStatus(selectedSpot).description
                            : isOtherCompany(selectedSpot.companyName) ? 'Occupied' : getOccupancyStatus(selectedSpot).description}
                        </div>
                        {selectedSpot.parkerName && (
                          <div className="font-medium text-gray-700 mt-1">
                            Parker: {isAdmin ? selectedSpot.parkerName : 'Occupied'}
                          </div>
                        )}
                      </div>
                      {selectedSpot.spotTypeConfig && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-500">Spot Type</div>
                          <div className="font-medium" style={{ color: selectedSpot.spotTypeConfig.color }}>{selectedSpot.spotTypeConfig.name}</div>
                        </div>
                      )}
                    </div>
                    {!isAdmin && canRequestSpot(selectedSpot) && companiesMatchCI(selectedSpot.companyName, tenantCompany) && (
                      <button onClick={() => handleRequestSpot(selectedSpot)} className="mt-4 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                        Request This Spot
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-400 mb-2">👆</div>
                  <p className="text-sm text-gray-600">Click on any colored dot to view spot details</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Parking Spots ({spots.length})</h3>
                  <div className="text-sm text-gray-500">
                    <span className="text-green-600">{spots.filter(s => getOccupancyStatus(s).type === null).length} available</span>
                    {' • '}
                    <span className="text-blue-600">{spots.filter(s => getOccupancyStatus(s).type === 'company').length} company</span>
                    {' • '}
                    <span className="text-purple-600">{spots.filter(s => getOccupancyStatus(s).type === 'person').length} personal</span>
                  </div>
                </div>
                {spots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {spots.map((spot) => {
                      const occupancy = getOccupancyStatus(spot)
                      const isAvailable = occupancy.type === null
                      const spotTypeConfig = spot.spotTypeConfig || SPOT_TYPES[0]
                      return (
                        <div
                          key={spot.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedSpot?.id === spot.id ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' : isAvailable ? 'border-green-300 bg-green-50/30' : occupancy.type === 'company' ? 'border-blue-300 bg-blue-50/30' : 'border-purple-300 bg-purple-50/30'}`}
                          style={{ borderLeftColor: spotTypeConfig.color, borderLeftWidth: '4px' }}
                          onClick={() => handleSpotClick(spot)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="relative w-4 h-4">
                                <div className="w-full h-full rounded-full" style={{ backgroundColor: spotTypeConfig.color }}>
                                  {occupancy.icon && (
                                    <div className="absolute inset-0 flex items-center justify-center" style={{ width: '100%', height: '100%', color: 'white', padding: '2px' }} dangerouslySetInnerHTML={{ __html: occupancy.icon.svg }} />
                                  )}
                                </div>
                              </div>
                              <span className={`text-lg font-bold ${isAvailable ? 'text-green-700' : occupancy.type === 'company' ? 'text-blue-700' : 'text-purple-700'}`}>{spot.spotNumber}</span>
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-900 truncate mb-1">
                            {occupancy.type === 'company'
                              ? (isAdmin || !isOtherCompany(spot.companyName) ? spot.companyName : 'Occupied')
                              : occupancy.type === 'person' ? 'Personal Spot' : 'Available'}
                          </div>
                          {spot.spotTypeConfig && <div className="text-xs text-gray-600 mb-1">{spot.spotTypeConfig.name}</div>}
                          {spot.parkerName && (
                            <div className="text-xs text-purple-600 truncate">
                              Parker: {isAdmin ? spot.parkerName : 'Occupied'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-4">🚗</div>
                    <p>No parking spots available for this floor</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <SpotRequestModal
        isOpen={showRequestModal}
        onClose={() => { setShowRequestModal(false); setRequestModalSpot(null) }}
        preselectedSpot={requestModalSpot}
        floorId={floorId}
        floorLabel={currentFloor.label}
      />
    </div>
  )
}