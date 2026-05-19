import { useRef, useState, useCallback } from 'react';
import type { ViewTransform } from '../utils/coords';
import { zoomAtPoint, clampZoom } from '../utils/coords';

export function useCanvasTransform() {
  const transformRef = useRef<ViewTransform>({ panX: 0, panY: 0, zoom: 1 });
  const [transform, setTransformState] = useState<ViewTransform>({ panX: 0, panY: 0, zoom: 1 });

  const setTransform = useCallback((t: ViewTransform) => {
    transformRef.current = t;
    setTransformState(t);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = clampZoom(transformRef.current.zoom * delta);
    const newTransform = zoomAtPoint(transformRef.current, { x: canvasX, y: canvasY }, newZoom);
    transformRef.current = newTransform;
    setTransformState(newTransform);
  }, []);

  return { transform, setTransform, transformRef, onWheel };
}
