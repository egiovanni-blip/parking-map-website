export const FLOORS = [
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

/** Unified zoom — all floors match P7 (full plan visible with margin). */
export const FLOOR_MAP_ZOOM = 0.78

/** Standard crop dimensions (P8–P17): removes elevation strip, consistent map scale. */
export const FLOOR_DETAIL_STRIP_CROP = { x: 272, y: 554, width: 2012, height: 1419 }

/** P7 reference crop — P6 uses the same frame for consistent sizing. */
export const FLOOR_P7_CROP = { x: 302, y: 452, width: 2016, height: 1429 }

/** Per-route crops where the floor plan origin differs from P8–P17. */
export const FLOOR_MAP_CROPS = {
  2: { x: 247, y: 452, width: 2016, height: 1429 },  // P3
  3: { x: 266, y: 400, width: 2012, height: 1419 },  // P4
  4: { x: 263, y: 400, width: 2012, height: 1419 },  // P5
  5: FLOOR_P7_CROP,                                    // P6 — match P7
  6: FLOOR_P7_CROP,                                    // P7
  16: { x: 272, y: 554, width: 2011, height: 1419 },  // P18
}

export function getFloorMapCrop(route) {
  const id = parseInt(route, 10)
  if (id >= 7 && id <= 15) return FLOOR_DETAIL_STRIP_CROP
  return FLOOR_MAP_CROPS[id] ?? null
}

export function getFloorMapZoomForRoute(_route) {
  return FLOOR_MAP_ZOOM
}
