const ROTATE_SPEED = 0.0045
const WHEEL_ZOOM_SPEED = 0.0012
const MIN_ELEVATION = -1.1
const MAX_ELEVATION = 1.35
const MIN_ZOOM = 0.4
const MAX_ZOOM = 3
/** Higher = snappier response to input. */
const SMOOTHING = 9

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v

interface PointerSample {
  x: number
  y: number
}

/**
 * Pointer + wheel input for orbiting around a focused planet.
 *
 * Owns no camera: it only turns drags into a smoothed azimuth / elevation
 * (radians) and a zoom factor, which CameraRig turns into a position
 * relative to the planet. Single pointer drags rotate, the wheel and a
 * two-finger pinch zoom. Disabled outside the focused state so overview
 * clicks are untouched.
 */
export class FocusOrbit {
  azimuth = 0
  elevation = 0
  zoom = 1

  private targetAzimuth = 0
  private targetElevation = 0
  private targetZoom = 1

  private enabled = false
  private dragging = false
  private pointers = new Map<number, PointerSample>()
  private pinchDistance = 0
  private readonly el: HTMLElement
  private readonly previousTouchAction: string

  constructor(el: HTMLElement) {
    this.el = el
    this.previousTouchAction = el.style.touchAction
    el.style.touchAction = 'none'
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('pointerup', this.onPointerUp)
    el.addEventListener('pointercancel', this.onPointerUp)
    el.addEventListener('wheel', this.onWheel, { passive: false })
  }

  dispose() {
    this.el.removeEventListener('pointerdown', this.onPointerDown)
    this.el.removeEventListener('pointermove', this.onPointerMove)
    this.el.removeEventListener('pointerup', this.onPointerUp)
    this.el.removeEventListener('pointercancel', this.onPointerUp)
    this.el.removeEventListener('wheel', this.onWheel)
    this.el.style.touchAction = this.previousTouchAction
    this.endDrag()
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) this.endDrag()
  }

  /** Snap back to the default framing (used when the focused planet changes). */
  reset(defaultElevation: number) {
    this.azimuth = this.targetAzimuth = 0
    this.elevation = this.targetElevation = clamp(
      defaultElevation,
      MIN_ELEVATION,
      MAX_ELEVATION,
    )
    this.zoom = this.targetZoom = 1
  }

  /** Ease the smoothed values toward their targets. */
  update(delta: number) {
    const k = 1 - Math.exp(-SMOOTHING * delta)
    this.azimuth += (this.targetAzimuth - this.azimuth) * k
    this.elevation += (this.targetElevation - this.elevation) * k
    this.zoom += (this.targetZoom - this.zoom) * k
  }

  private endDrag() {
    if (this.dragging) document.body.style.cursor = 'auto'
    this.dragging = false
    this.pointers.clear()
    this.pinchDistance = 0
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    this.el.setPointerCapture(e.pointerId)
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()]
      this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
    }
    this.dragging = true
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return
    const previous = this.pointers.get(e.pointerId)
    if (!previous) return
    const current = { x: e.clientX, y: e.clientY }
    this.pointers.set(e.pointerId, current)

    if (this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (this.pinchDistance > 0 && distance > 0) {
        this.targetZoom = clamp(
          this.targetZoom * (this.pinchDistance / distance),
          MIN_ZOOM,
          MAX_ZOOM,
        )
      }
      this.pinchDistance = distance
      return
    }

    document.body.style.cursor = 'grabbing'
    const dx = current.x - previous.x
    const dy = current.y - previous.y
    // Drag right: the planet appears to turn to the right (camera moves left).
    this.targetAzimuth -= dx * ROTATE_SPEED
    this.targetElevation = clamp(
      this.targetElevation + dy * ROTATE_SPEED,
      MIN_ELEVATION,
      MAX_ELEVATION,
    )
  }

  private onPointerUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId)
    if (this.el.hasPointerCapture(e.pointerId)) {
      this.el.releasePointerCapture(e.pointerId)
    }
    if (this.pointers.size === 0) this.endDrag()
    else if (this.pointers.size === 1) this.pinchDistance = 0
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return
    e.preventDefault()
    this.targetZoom = clamp(
      this.targetZoom * Math.exp(e.deltaY * WHEEL_ZOOM_SPEED),
      MIN_ZOOM,
      MAX_ZOOM,
    )
  }
}
