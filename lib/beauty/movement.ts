export type Box = { x: number; y: number; width: number; height: number };
// Normalized coordinates stay independent of video resolution and orientation.
export function coverBox(box: Box, videoW: number, videoH: number, viewW: number, viewH: number): Box {
  if (!videoW || !videoH || !viewW || !viewH) return { x: 0, y: 0, width: 0, height: 0 };
  const scale = Math.max(viewW / videoW, viewH / videoH);
  return { x: box.x * videoW * scale + (viewW - videoW * scale) / 2, y: box.y * videoH * scale + (viewH - videoH * scale) / 2, width: box.width * videoW * scale, height: box.height * videoH * scale };
}
export class MovementTracker {
  private anchor: { x: number; y: number } | null = null;
  private hits = 0;
  private lastSeen = 0;
  private lastMovement = -Infinity;
  update(box: Box | null, now: number) {
    if (!box) {
      if (now - this.lastSeen > 800) { this.anchor = null; this.hits = 0; this.lastMovement = -Infinity; }
      return false;
    }
    this.lastSeen = now;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (!this.anchor) this.anchor = center;
    const distance = Math.hypot(center.x - this.anchor.x, center.y - this.anchor.y);
    this.hits = distance > .035 ? this.hits + 1 : 0;
    if (this.hits >= 3) { this.lastMovement = now; this.anchor = center; this.hits = 0; }
    return now - this.lastMovement < 1800;
  }
}
