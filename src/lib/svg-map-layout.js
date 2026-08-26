import { getFloorMapCrop, getFloorMapZoomForRoute } from '@/lib/constants'

/** Side panel width (280px) + inset (right-2 / left-2 = 8px). */
export const MAP_SIDE_PANEL_INSET = 296

export function getSvgViewBoxSize(svgElement) {
  const viewBox = svgElement.viewBox?.baseVal
  const width = viewBox?.width || svgElement.width?.baseVal?.value || svgElement.clientWidth
  const height = viewBox?.height || svgElement.height?.baseVal?.value || svgElement.clientHeight
  return { width, height }
}

export function getFloorMapViewBoxCrop(floorRoute) {
  return getFloorMapCrop(floorRoute)
}

export function getFloorMapZoom(floorRoute) {
  return getFloorMapZoomForRoute(floorRoute)
}

export function applyFloorMapViewBoxCrop(svgElement, floorRoute) {
  const crop = getFloorMapViewBoxCrop(floorRoute)
  if (!crop) return null

  svgElement.setAttribute(
    'viewBox',
    `${crop.x} ${crop.y} ${crop.width} ${crop.height}`
  )
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  return crop
}

/** Map viewBox coordinates into a container using SVG meet scaling. */
export function getSvgMeetLayout(vbWidth, vbHeight, containerWidth, containerHeight, options = {}) {
  if (!vbWidth || !vbHeight || !containerWidth || !containerHeight) return null

  const {
    cropX = 0,
    cropY = 0,
    leftInset = 0,
    rightInset = 0,
    align = 'center',
    fit = 'meet', // 'meet' | 'cover'
    zoom = 1,
  } = options

  const bandWidth = Math.max(containerWidth - leftInset - rightInset, 1)
  const scaleH = containerHeight / vbHeight
  const scaleW = bandWidth / vbWidth
  const baseScale = fit === 'cover' ? Math.max(scaleH, scaleW) : Math.min(scaleH, scaleW)
  const scale = baseScale * zoom
  const renderedWidth = vbWidth * scale
  const renderedHeight = vbHeight * scale

  let offsetX
  if (align === 'right') {
    offsetX = leftInset + Math.max(0, bandWidth - renderedWidth)
  } else {
    offsetX = leftInset + (bandWidth - renderedWidth) / 2
  }
  const offsetY = (containerHeight - renderedHeight) / 2

  return {
    scale,
    offsetX,
    offsetY,
    renderedWidth,
    renderedHeight,
    cropX,
    cropY,
    vbWidth,
    vbHeight,
    containerWidth,
    containerHeight,
  }
}

export function spotToOverlayPercent(spot, layout) {
  if (!spot || !layout) return null

  const { scale, offsetX, offsetY, cropX = 0, cropY = 0, containerWidth, containerHeight } = layout
  const leftPx = offsetX + (spot.svgX - cropX) * scale
  const topPx = offsetY + (spot.svgY - cropY) * scale
  const widthPx = spot.svgWidth * scale
  const heightPx = spot.svgHeight * scale

  return {
    left: `${(leftPx / containerWidth) * 100}%`,
    top: `${(topPx / containerHeight) * 100}%`,
    width: `${Math.max((widthPx / containerWidth) * 100, 0.5)}%`,
    height: `${Math.max((heightPx / containerHeight) * 100, 0.5)}%`,
  }
}
