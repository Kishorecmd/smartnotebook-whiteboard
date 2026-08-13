/**
 * The board area currently visible, in world units, shrunk slightly so an
 * imported image lands comfortably inside the view rather than filling it edge
 * to edge. Used to cap the size of imported media.
 */
export function visibleWorldBox(
  zoom: number,
  canvasCssWidth: number,
  canvasCssHeight: number,
  fill: number = 0.8
): { width: number; height: number } {
  const safeZoom = zoom > 0 ? zoom : 1;
  return {
    width: (canvasCssWidth / safeZoom) * fill,
    height: (canvasCssHeight / safeZoom) * fill,
  };
}
