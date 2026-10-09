// A small event surface for OrbitControls. Only navigation gestures are forwarded;
// building events never enter its pointer state. The real canvas owns capture.
export class CameraInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.style = canvas.style;
    this.listeners = new Map();
    this.pointers = new Map();
  }
  get clientWidth() { return this.canvas.clientWidth; }
  get clientHeight() { return this.canvas.clientHeight; }
  get ownerDocument() { return this.canvas.ownerDocument; }
  getRootNode() { return this.canvas.getRootNode(); }
  getBoundingClientRect() { return this.canvas.getBoundingClientRect(); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  // Capture/release happen once, in the application's real-canvas event router.
  setPointerCapture() {}
  releasePointerCapture() {}
  send(type, event) {
    if (type === 'pointerdown' || type === 'pointermove') this.pointers.set(event.pointerId, event);
    if (type === 'pointerup' || type === 'pointercancel') this.pointers.delete(event.pointerId);
    for (const listener of [...(this.listeners.get(type) || [])]) listener(event);
  }
  reset() {
    for (const event of [...this.pointers.values()]) this.send('pointercancel', event);
  }
}
