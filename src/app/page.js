'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackgroundImage from '../components/ParkingMap/BackgroundImage'

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
  { route: 13, label: 'P14' },
  { route: 14, label: 'P15' },
  { route: 15, label: 'P16' },
  { route: 16, label: 'P18' },
  { route: 17, label: 'P18' },
]

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()

  const currentFloor = FLOORS[currentIndex]

  /* =============================
     NAVIGATION
  ============================== */
  const goToFloor = (route) => {
    router.push(`/floor/${route}`)
  }

  const goPrev = () => setCurrentIndex(i => Math.max(0, i - 1))
  const goNext = () => setCurrentIndex(i => Math.min(FLOORS.length - 1, i + 1))

  /* =============================
     KEYBOARD NAVIGATION
  ============================== */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA'
      ) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        goToFloor(currentFloor.route)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* HEADER */}
        <div className="my-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Parking Garage Interactive Map
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Browse floors and click to view parking spaces
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Use ← → keys, then press <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-200 rounded text-xs sm:text-sm">Enter</kbd>
          </p>
        </div>

        {/* MAP CONTAINER */}
        <div className="relative bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden border border-gray-200 h-[50vh] sm:h-[60vh] md:h-[80vh]">

          {/* LEFT ARROW */}
          <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition-all
                ${currentIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-95 sm:hover:scale-105 border-blue-200'
                }`}
              aria-label="Previous floor"
            >
              <span className="text-lg sm:text-xl">←</span>
            </button>
          </div>

          {/* RIGHT ARROW */}
          <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={goNext}
              disabled={currentIndex === FLOORS.length - 1}
              className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition-all
                ${currentIndex === FLOORS.length - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-95 sm:hover:scale-105 border-blue-200'
                }`}
              aria-label="Next floor"
            >
              <span className="text-lg sm:text-xl">→</span>
            </button>
          </div>

          {/* FLOOR INDICATOR */}
          <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-sm">
            <div className="bg-white/95 backdrop-blur rounded-lg sm:rounded-xl shadow px-3 sm:px-4 md:px-6 py-2 sm:py-3 border border-blue-100">
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 justify-between">
                <div className="text-center min-w-[80px] sm:min-w-[100px]">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">{currentFloor.label}</div>
                </div>
                <div className="h-8 sm:h-10 w-px bg-blue-200"></div>
                <div className="text-xs sm:text-sm md:text-base text-gray-600 flex-1 text-right sm:text-left">
                  Tap to view<br />parking spaces
                </div>
              </div>
            </div>
          </div>

          {/* IMAGE */}
          <div className="absolute inset-0 top-20 lg:top-0">
            <BackgroundImage floor={currentFloor.route} />
          </div>

          {/* CTA OVERLAY */}
          <button
            onClick={() => goToFloor(currentFloor.route)}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 hover:bg-black/20 active:bg-black/30 transition-all"
            aria-label={`View parking spaces on ${currentFloor.label}`}
          >
            <div className="bg-black/80 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base md:text-lg font-medium transition-transform active:scale-95 sm:hover:scale-105">
              <span className="hidden sm:inline">View parking spaces </span>
              <span className="sm:hidden">View spots </span>
              <span className="hidden xs:inline">→</span>
            </div>
          </button>
        </div>

        {/* FLOOR DOTS */}
        <div className="mt-4 sm:mt-6 md:mt-8 px-2 overflow-x-auto">
          <div className="flex justify-center space-x-1 sm:space-x-2 min-w-max mx-auto">
            {FLOORS.map((floor, index) => (
              <button
                key={floor.route}
                onClick={() => setCurrentIndex(index)}
                className={`rounded-full transition-all flex-shrink-0
                  ${currentIndex === index
                    ? 'bg-blue-600 w-8 sm:w-10 md:w-12 h-2 sm:h-2.5'
                    : 'bg-gray-300 hover:bg-gray-400 w-4 sm:w-6 md:w-8 h-2 sm:h-2.5'
                  }`}
                aria-label={`Go to ${floor.label}`}
              />
            ))}
          </div>
        </div>

        {/* MOBILE INSTRUCTIONS */}
        <div className="mt-4 sm:hidden text-center">
          <p className="text-xs text-gray-500">
            Swipe or tap arrows to navigate floors
          </p>
        </div>

      </div>
    </div>
  )
}