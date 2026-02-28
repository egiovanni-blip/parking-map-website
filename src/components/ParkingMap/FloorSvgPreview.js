'use client'

import { useEffect, useState } from 'react'
import { getDisplayLabel } from '@/utils/floorUtils'

export default function FloorSvgPreview({ floor }) {
  const [svgContent, setSvgContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const loadSVG = async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/overlays/parking_page_${floor}.svg`)
        if (!res.ok) throw new Error('SVG not found')
        const text = await res.text()
        setSvgContent(text)
      } catch (err) {
        console.error('Failed to load SVG preview:', err)
        setError(true)
        setSvgContent('')
      } finally {
        setLoading(false)
      }
    }

    loadSVG()
  }, [floor])

  if (loading) {
    return (
      <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏢</div>
          <p className="text-gray-600">Loading {getDisplayLabel(floor)}...</p>
        </div>
      </div>
    )
  }

  if (error || !svgContent) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Map not available</h3>
          <p className="text-gray-600">{getDisplayLabel(floor)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white overflow-hidden">
      <div
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {getDisplayLabel(floor)}
      </div>
    </div>
  )
}
