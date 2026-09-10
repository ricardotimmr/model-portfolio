export const GALLERY_SCROLL_WHEEL_DRAG_FACTOR = 0.64;
export const GALLERY_SCROLL_INERTIAL_LERP = 0.126;
export const GALLERY_SCROLL_MAX_WHEEL_DELTA = 420;

const WHEEL_DELTA_MODE_PIXEL = 0;
const WHEEL_DELTA_MODE_LINE = 1;
const WHEEL_DELTA_MODE_PAGE = 2;
const WHEEL_LINE_HEIGHT_PX = 16;
const PARALLAX_EDGE_GUARD_PX = 1;

export function getSafeParallaxShift(
  frameSize: number,
  imageScale: number,
  requestedShift: number,
) {
  if (
    !Number.isFinite(frameSize) ||
    !Number.isFinite(imageScale) ||
    !Number.isFinite(requestedShift) ||
    frameSize <= 0 ||
    imageScale <= 1
  ) {
    return 0;
  }

  const availableOverflow = Math.max(
    0,
    (frameSize * (imageScale - 1)) / 2 - PARALLAX_EDGE_GUARD_PX,
  );
  return Math.min(Math.abs(requestedShift), availableOverflow);
}

export function normalizeWheelDeltaToPixels(
  delta: number,
  deltaMode: number,
  pageSizePx: number,
) {
  if (!Number.isFinite(delta) || delta === 0) return 0;
  if (deltaMode === WHEEL_DELTA_MODE_LINE) return delta * WHEEL_LINE_HEIGHT_PX;
  if (deltaMode === WHEEL_DELTA_MODE_PAGE)
    return delta * Math.max(1, pageSizePx);
  if (deltaMode !== WHEEL_DELTA_MODE_PIXEL) return delta;
  return delta;
}
