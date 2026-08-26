// app/floor/[floorId]/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SpotRequestModal from '@/components/SpotRequestModal'
import DesktopOnlyNotice from '@/components/DesktopOnlyNotice'
import { useIsPhone } from '@/hooks/useIsPhone'
import { supabase } from '@/lib/supabase'
import { FLOORS } from '@/lib/constants'
import {
  MAP_SIDE_PANEL_INSET,
  applyFloorMapViewBoxCrop,
  getFloorMapZoom,
  getSvgMeetLayout,
  getSvgViewBoxSize,
  spotToOverlayPercent,
} from '@/lib/svg-map-layout'

const SPOT_TYPES = [
  { id: 'regular', name: 'Regular', color: '#fbbf24' },
  { id: 'reserved', name: 'Reserved', color: '#ef4444' },
  { id: 'compact', name: 'Compact', color: '#a855f7' },
  { id: 'ev', name: 'EV', color: '#10b981' },
  { id: 'ada', name: 'ADA', color: '#3b82f6' },
  { id: 'ada_ev', name: 'ADA + EV', color: '#1e40af' },
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
  const router = useRouter()
  const isPhone = useIsPhone()
  const [phoneGate, setPhoneGate] = useState('pending')

  useEffect(() => {
    if (isPhone !== true) {
      if (isPhone === false) setPhoneGate('desktop')
      return
    }

    let cancelled = false
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (!cancelled) setPhoneGate('blocked')
          return
        }
        if (cancelled) return
        setPhoneGate('redirect')
        router.replace('/admin/summary')
      } catch {
        if (!cancelled) setPhoneGate('blocked')
      }
    }
    check()
    return () => { cancelled = true }
  }, [isPhone, router])

  if (isPhone === null || phoneGate === 'pending' || phoneGate === 'redirect') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isPhone === true && phoneGate === 'blocked') {
    return (
      <DesktopOnlyNotice
        title="Use a computer"
        message="The parking map is available on a desktop or laptop. Phone access is limited to Allocation Summary for admin staff."
      />
    )
  }

  return <FloorMapView />
}

function FloorMapView() {
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
  const [hoveredSpotId, setHoveredSpotId] = useState(null)
  const [mapLayout, setMapLayout] = useState(null)
  const svgRef = useRef(null)
  const mapStageRef = useRef(null)
  const containerRef = useRef(null)
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

  // Resolve tenant/admin via server session APIs (tenant cookie is HttpOnly + signed)
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/tenant/session')
        const data = await res.json()
        if (data.isTenant && data.company_name) {
          setTenantCompany(data.company_name)
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        if (session) setIsAdmin(true)
      } catch (err) {
        console.error('Session check error:', err)
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
    if (spot.spotTypeConfig?.id === 'reserved' || spot.spotType === 'reserved') return false
    if (isOtherCompany(spot.companyName)) return false
    if (!tenantCompany) return isUnassignedSpot(spot.companyName)
    // Tenants may only request available spots assigned to their company
    return companiesMatchCI(spot.companyName, tenantCompany)
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
      updateMapLayout()
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

  useEffect(() => {
    if (!svgRef.current) return
    svgRef.current.innerHTML = svgContent || ''
  }, [floorId, svgContent])

  const updateMapLayout = () => {
    const stage = mapStageRef.current
    if (!stage) return
    const svgElement = stage.querySelector('svg')
    if (!svgElement) return

    const crop = applyFloorMapViewBoxCrop(svgElement, floorId)
    const { width: vbWidth, height: vbHeight } = getSvgViewBoxSize(svgElement)
    const { width: containerWidth, height: containerHeight } = stage.getBoundingClientRect()
    setMapLayout(getSvgMeetLayout(vbWidth, vbHeight, containerWidth, containerHeight, {
      cropX: crop?.x ?? 0,
      cropY: crop?.y ?? 0,
      leftInset: MAP_SIDE_PANEL_INSET,
      rightInset: MAP_SIDE_PANEL_INSET,
      align: 'center',
      fit: 'meet',
      zoom: getFloorMapZoom(floorId),
    }))
  }

  useEffect(() => {
    if (!mapStageRef.current) return
    const observer = new ResizeObserver(() => updateMapLayout())
    observer.observe(mapStageRef.current)
    updateMapLayout()
    return () => observer.disconnect()
  }, [svgContent, loading, error, spots.length])

  const calculateSpotPosition = (spot) => spotToOverlayPercent(spot, mapLayout)

  const handleSpotClick = (spot) => {
    setSelectedSpot(spot)
  }
  const handleDirectorySpotClick = (spot) => {
    setSelectedSpot(spot)
  }
  const handleRequestSpot = (spot = null) => {
    setRequestModalSpot(spot)
    setShowRequestModal(true)
  }

  const getCompanyList = () => {
    const companies = {}
    spots.forEach(spot => {
      const company = spot.companyName
      if (company && !isUnassignedSpot(company)) {
        if (tenantCompany && !companiesMatchCI(company, tenantCompany)) return
        if (!companies[company]) companies[company] = []
        companies[company].push(spot)
      }
    })
    let companyEntries = Object.entries(companies)
    if (tenantCompany && !isAdmin) {
      companyEntries = companyEntries.filter(([company]) =>
        companiesMatchCI(company, tenantCompany)
      )
    }
    return companyEntries.sort((a, b) => a[0].localeCompare(b[0]))
  }

  const renderBreakdown = () => (
    <div className="p-3 space-y-3">
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
              {availableCount > 0 && (
                <div className={`rounded px-1 py-0.5 ${type.id === 'reserved' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  <div>{type.id === 'reserved' ? 'Reserved' : 'Available'}</div>
                  <div className="font-bold">{availableCount}</div>
                </div>
              )}
              {companyCount > 0 && <div className="bg-blue-50 text-blue-700 rounded px-1 py-0.5"><div className="flex items-center justify-center gap-0.5"><div className="w-2.5 h-2.5" dangerouslySetInnerHTML={{ __html: OCCUPANCY_ICONS.company.svg }} /><span>Company</span></div><div className="font-bold">{companyCount}</div></div>}
              {personCount > 0 && <div className="bg-purple-50 text-purple-700 rounded px-1 py-0.5"><div className="flex items-center justify-center gap-0.5"><div className="w-2.5 h-2.5" dangerouslySetInnerHTML={{ __html: OCCUPANCY_ICONS.person.svg }} /><span>Personal</span></div><div className="font-bold">{personCount}</div></div>}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderDirectory = () => {
    const companyList = getCompanyList()
    if (companyList.length === 0) {
      return <p className="p-3 text-gray-500 text-xs">No companies on this floor.</p>
    }
    return (
      <div>
        {companyList.map(([company, companySpots]) => (
          <div key={company} className="border-b border-gray-100 last:border-0">
            <button className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left touch-manipulation" onClick={() => setExpandedCompany(expandedCompany === company ? null : company)}>
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
                  const isReservedType = spot.spotTypeConfig?.id === 'reserved'
                  const statusLabel = spot.parkerName
                    ? 'Occupied'
                    : isReservedType
                      ? 'Reserved'
                      : 'Available'
                  return (
                    <button key={spot.id} onClick={() => handleDirectorySpotClick(spot)} className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left touch-manipulation">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: spot.spotTypeConfig?.color || '#9ca3af' }} />
                        <span className="text-xs font-medium text-gray-800">{spot.spotNumber}</span>
                      </div>
                      <span className={`text-xs ${spot.parkerName ? 'text-blue-600' : isReservedType ? 'text-red-600' : occupancy.type === null ? 'text-green-600' : 'text-blue-600'}`}>
                        {statusLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const getSpotStatusDisplay = (spot, occupancy) => {
    if (occupancy.type === null) {
      const reserved = spot.spotTypeConfig?.id === 'reserved'
      return {
        label: reserved ? 'Reserved' : 'Available',
        className: reserved ? 'text-red-400' : 'text-green-400',
      }
    }
    if (isOtherCompany(spot.companyName)) {
      return { label: 'Reserved', className: 'text-red-400' }
    }
    return {
      label: 'Occupied',
      className: occupancy.type === 'company' ? 'text-blue-400' : 'text-purple-400',
    }
  }

  const renderSpotDetails = () => {
    if (!selectedSpot) {
      return <p className="p-3 text-gray-500 text-xs">Tap a space on the map to see details.</p>
    }
    const occupancy = getOccupancyStatus(selectedSpot)
    const status = getSpotStatusDisplay(selectedSpot, occupancy)
    return (
      <div className="p-3 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">Space Details</h3>
          <button onClick={() => setSelectedSpot(null)} className="text-xs text-gray-500 hover:text-gray-700 py-1 px-2">✕ Close</button>
        </div>
        <div className="bg-white rounded-lg border border-gray-400 p-3">
          <div className="text-xl font-bold text-gray-900 mb-2">{selectedSpot.spotNumber}</div>
          <div className="mb-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Status</div>
            <div className="font-medium text-gray-700 text-sm">
              {isOtherCompany(selectedSpot.companyName) && !isAdmin
                ? 'Reserved'
                : status.label}
            </div>
            {selectedSpot.parkerName && isAdmin && (
              <div className="font-medium text-gray-700 text-sm mt-1">
                Parker: {selectedSpot.parkerName}
              </div>
            )}
            {occupancy.type === 'company' && !isOtherCompany(selectedSpot.companyName) && (
              <div className="font-medium text-gray-700 text-sm mt-1">
                Company: {selectedSpot.companyName}
              </div>
            )}
          </div>
          {selectedSpot.spotTypeConfig && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Space type</div>
              <div className="font-medium text-sm" style={{ color: selectedSpot.spotTypeConfig.color }}>{selectedSpot.spotTypeConfig.name}</div>
            </div>
          )}
          {!isAdmin && canRequestSpot(selectedSpot) && companiesMatchCI(selectedSpot.companyName, tenantCompany) && (
            <button onClick={() => handleRequestSpot(selectedSpot)} className="mt-2 w-full px-3 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium touch-manipulation">
              Request This Space
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderInteractiveOverlay = () => {
    if (!svgContent || spots.length === 0 || !mapLayout) return null
    const highlightColor = '#00CCBE'
    return (
      <div className="absolute inset-0 pointer-events-none">
        {spots.map((spot) => {
          const pos = calculateSpotPosition(spot)
          if (!pos) return null
          const occupancy = getOccupancyStatus(spot)
          const dotColor = spot.spotTypeConfig?.color || '#9ca3af'
          const isSelected = selectedSpot?.id === spot.id
          const isHovered = hoveredSpotId === spot.id
          const isHighlighted = hoveredSpotId ? isHovered : isSelected
          return (
            <div key={spot.id} className={`absolute group ${isHighlighted ? 'z-30' : ''}`} style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}>
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div
                  className={`relative w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-200 flex items-center justify-center ${
                    isHighlighted ? 'opacity-100 scale-125 ring-2 ring-offset-1 ring-vend-mint-600' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: dotColor, borderColor: 'white' }}
                >
                  {occupancy.icon && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ width: '100%', height: '100%', color: occupancy.icon.color, padding: '3px' }} dangerouslySetInnerHTML={{ __html: occupancy.icon.svg }} />
                  )}
                </div>
              </div>
              <button
                data-spot-id={spot.id}
                type="button"
                tabIndex={-1}
                className="absolute inset-0 cursor-pointer transition-all duration-200 rounded pointer-events-auto focus:outline-none"
                style={{
                  backgroundColor: isHighlighted ? `${highlightColor}30` : 'transparent',
                  boxShadow: isHighlighted ? `0 0 0 3px ${highlightColor}, 0 0 14px ${highlightColor}99` : 'none',
                  zIndex: isHighlighted ? 30 : 1,
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                }}
                onClick={() => handleSpotClick(spot)}
                onMouseEnter={() => setHoveredSpotId(spot.id)}
                onMouseLeave={() => setHoveredSpotId(null)}
              />
              {isHighlighted && (
                <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-1.5 pointer-events-none flex flex-col items-center z-30">
                  <div className="bg-vend-mint text-vend-black text-xs font-bold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
                    {spot.spotNumber}
                  </div>
                  <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-vend-mint -mt-px" />
                </div>
              )}
              {isHighlighted && (
                <div
                  className={`absolute inset-0 rounded pointer-events-none ${isSelected && !hoveredSpotId ? 'animate-pulse' : ''}`}
                  style={{ boxShadow: `inset 0 0 0 2px ${highlightColor}` }}
                />
              )}
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
        <div className="mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-headline text-vend-black tracking-tight">{currentFloor.label} — Parking Spaces</h1>
              <p className="text-vend-slate mt-1">Click a space for details. Request when it&apos;s available.</p>
              {!loading && !error && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border border-gray-300"></div>
                    <span className="text-gray-600">{spots.length} total spaces</span>
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
              <Link href="/" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div ref={containerRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative flex-1">
            <div className="w-full h-[960px] lg:h-[calc(100vh-180px)] relative overflow-hidden">
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
                <div ref={mapStageRef} className="relative w-full h-full overflow-hidden bg-white">
                  <div
                    ref={svgRef}
                    className="absolute [&>svg]:h-full [&>svg]:w-full"
                    style={mapLayout ? {
                      left: mapLayout.offsetX,
                      top: mapLayout.offsetY,
                      width: mapLayout.renderedWidth,
                      height: mapLayout.renderedHeight,
                    } : {
                      inset: 0,
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  {renderInteractiveOverlay()}
                </div>
              )}
            </div>

            {!loading && !error && (
              <>
                <div className="absolute top-2 left-2 z-10 w-[280px] max-h-[calc(100%-1rem)] overflow-hidden rounded-lg border border-gray-400 bg-white/95 text-xs shadow-md backdrop-blur-sm flex flex-col">
                  <div className="flex-shrink-0 border-b border-gray-400 p-3">
                    <h3 className="font-semibold text-gray-800">Space Type Breakdown</h3>
                    <p className="mt-1 text-xs text-gray-500">Total: {spots.length} spaces</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {renderBreakdown()}
                  </div>
                </div>

                <div className="absolute top-2 right-2 z-10 w-[280px] max-h-[calc(100%-1rem)] overflow-hidden rounded-lg border border-gray-400 bg-white/95 text-xs shadow-md backdrop-blur-sm flex flex-col">
                  {(() => {
                    const companyList = getCompanyList()
                    if (companyList.length === 0) {
                      return (
                        <div className="p-3">
                          <h3 className="font-semibold text-gray-800">🏢 Tenant Directory</h3>
                          <p className="mt-2 text-xs text-gray-500">No companies on this floor.</p>
                        </div>
                      )
                    }
                    return (
                      <>
                        <div className="flex-shrink-0 border-b border-gray-400 p-3">
                          <h3 className="font-semibold text-gray-800">🏢 Tenant Directory</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {tenantCompany && !isAdmin
                              ? `${companyList[0]?.[1]?.length || 0} spaces`
                              : `${companyList.length} companies`}
                          </p>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                          {renderDirectory()}
                        </div>
                      </>
                    )
                  })()}
                  {selectedSpot && (
                    <div className="border-t border-gray-400">
                      {renderSpotDetails()}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <SpotRequestModal
        isOpen={showRequestModal}
        onClose={() => { setShowRequestModal(false); setRequestModalSpot(null) }}
        preselectedSpot={requestModalSpot}
        floorId={floorId}
        floorLabel={currentFloor.label}
        tenantCompany={tenantCompany}
      />
    </div>
  )
}