export interface ViewTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export function screenToWorld(
  clientX: number,
  clientY: number,
  canvasRect: { left: number; top: number },
  transform: ViewTransform,
): { x: number; y: number } {
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;
  return {
    x: canvasX / transform.zoom - transform.panX,
    y: canvasY / transform.zoom - transform.panY,
  };
}

export function zoomAtPoint(
  transform: ViewTransform,
  canvasPoint: { x: number; y: number },
  newZoom: number,
): ViewTransform {
  const worldX = canvasPoint.x / transform.zoom - transform.panX;
  const worldY = canvasPoint.y / transform.zoom - transform.panY;
  return {
    panX: canvasPoint.x / newZoom - worldX,
    panY: canvasPoint.y / newZoom - worldY,
    zoom: newZoom,
  };
}

export function clampZoom(zoom: number): number {
  return Math.max(0.1, Math.min(5.0, zoom));
}
