import { useRef, useState, useCallback, useEffect } from 'react';
import type { ViewTransform } from '../utils/coords';
import { zoomAtPoint, clampZoom } from '../utils/coords';

export function useCanvasTransform() {
  const transformRef = useRef<ViewTransform>({ panX: 0, panY: 0, zoom: 1 });
  const [transform, setTransformState] = useState<ViewTransform>({ panX: 0, panY: 0, zoom: 1 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setTransform = useCallback((t: ViewTransform) => {
    transformRef.current = t;
    setTransformState(t);
  }, []);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('wheel', handleWheel);
    }
    containerRef.current = node;
    if (node) {
      node.addEventListener('wheel', handleWheel, { passive: false });
    }
  }, []);

  // Stable ref to avoid re-registering event listener
  const handleWheelRef = useRef<(e: WheelEvent) => void>();
  handleWheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = clampZoom(transformRef.current.zoom * delta);
    const newTransform = zoomAtPoint(transformRef.current, { x: canvasX, y: canvasY }, newZoom);
    transformRef.current = newTransform;
    setTransformState(newTransform);
  };

  function handleWheel(e: WheelEvent) {
    handleWheelRef.current?.(e);
  }

  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  return { transform, setTransform, transformRef, setContainerRef };
}
