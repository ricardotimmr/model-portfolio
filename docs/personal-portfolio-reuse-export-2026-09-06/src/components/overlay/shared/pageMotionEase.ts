import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

export const PAGE_MOTION_EASE_NAME = 'pageCreepWhipSettle-v7'

const PAGE_MOTION_EASE_CURVE =
  // Travel-anchored phases:
  // - creep reaches ~10% travel
  // - whip reaches ~80% travel
  // - then long settle that keeps decelerating toward 100%
  // S commands keep tangent continuity at phase joins for smoother speed blending.
  'M0,0 C0.08,0.001 0.24,0.028 0.40,0.10 S0.59,0.70 0.66,0.85 C0.72,0.885 0.79,0.93 0.86,0.955 C0.93,0.978 0.97,0.992 1,1'

let hasRegisteredPageMotionEase = false

export function ensurePageMotionEase() {
  if (hasRegisteredPageMotionEase) {
    return PAGE_MOTION_EASE_NAME
  }

  gsap.registerPlugin(CustomEase)
  CustomEase.create(PAGE_MOTION_EASE_NAME, PAGE_MOTION_EASE_CURVE)
  hasRegisteredPageMotionEase = true

  return PAGE_MOTION_EASE_NAME
}
