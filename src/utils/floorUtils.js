/**
 * Get the displayed floor number for UI.
 * Floors 2–11: display as 3–12.
 * After floor 12, skip 13: internal 12 → 14, 13 → 15, ... 16 → 18.
 * Last floor (internal 17) displays as 18 (no floor 19).
 */
export function getDisplayFloor(internalFloor) {
  const floor = Number(internalFloor)
  if (floor <= 11) return floor + 1
  if (floor === 17) return 18
  return floor + 2
}

/** Display label: "P 3", "P 18", etc. */
export function getDisplayLabel(internalFloor) {
  return `P ${getDisplayFloor(internalFloor)}`
}
