const WHEEL_DELTA_MODE_PIXEL = 0
const WHEEL_DELTA_MODE_LINE = 1
const WHEEL_DELTA_MODE_PAGE = 2
const WHEEL_LINE_HEIGHT_PX = 16

export function normalizeWheelDeltaToPixels(delta: number, deltaMode: number, pageSizePx: number) {
  if (!Number.isFinite(delta) || delta === 0) {
    return 0
  }

  if (deltaMode === WHEEL_DELTA_MODE_LINE) {
    return delta * WHEEL_LINE_HEIGHT_PX
  }

  if (deltaMode === WHEEL_DELTA_MODE_PAGE) {
    return delta * Math.max(1, pageSizePx)
  }

  if (deltaMode !== WHEEL_DELTA_MODE_PIXEL) {
    return delta
  }

  return delta
}
