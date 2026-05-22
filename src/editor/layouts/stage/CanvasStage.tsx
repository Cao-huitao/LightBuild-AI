import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useComponents } from '../../stores/components';
import { useCanvasTransform } from '../../hooks/useCanvasTransform';
import { renderCanvas, hitTest, findComponentById, getAbsolutePosition } from '../../utils/canvas-renderer';
import { screenToWorld } from '../../utils/coords';

const ACCEPT_TYPES = ['Button', 'Space', 'Input', 'Text', 'Image', 'Card'];

interface DragState {
  type: 'none' | 'pan' | 'move';
  startScreenX: number;
  startScreenY: number;
  startPanX: number;
  startPanY: number;
  componentId?: number;
  startCompX?: number;
  startCompY?: number;
  baseX?: number;
  baseY?: number;
}

const CanvasStage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    type: 'none', startScreenX: 0, startScreenY: 0, startPanX: 0, startPanY: 0,
  });
  const dragPreviewRef = useRef<{ componentId: number; x: number; y: number } | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const spaceRef = useRef(false);
  const dprRef = useRef(window.devicePixelRatio || 1);

  const components = useComponents((s) => s.components);
  const selectedId = useComponents((s) => s.selectedComponentId);
  const selectComponent = useComponents((s) => s.selectComponent);
  const updateComponentPosition = useComponents((s) => s.updateComponentPosition);
  const deleteComponent = useComponents((s) => s.deleteComponent);

  const { transform, setTransform, transformRef, setContainerRef: setTransformRef } = useCanvasTransform();

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [renderTick, setRenderTick] = useState(0);

  const onImageLoaded = useCallback(() => {
    setRenderTick((tick) => tick + 1);
  }, []);

  const doRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderCanvas({
      ctx,
      components,
      selectedComponentId: selectedId,
      transform: transformRef.current,
      canvasW: canvasSize.width,
      canvasH: canvasSize.height,
      dpr: dprRef.current,
      dragPreview: dragPreviewRef.current ?? undefined,
      imageCache: imageCacheRef.current,
      onImageLoaded,
    });
  }, [components, selectedId, canvasSize, transform]);

  // Store-driven re-renders
  useEffect(() => {
    doRender();
  }, [doRender, renderTick]);

  // Drop target
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ACCEPT_TYPES,
    drop: (_item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset) return undefined;
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(offset.x, offset.y, rect, transformRef.current);
      const ctx = canvas.getContext('2d');
      if (!ctx) return { x: Math.round(world.x), y: Math.round(world.y) };

      const hitId = hitTest(components, world.x, world.y, ctx);
      if (hitId !== null) {
        const hitComp = findComponentById(components, hitId);
        if (hitComp?.name === 'Space') {
          const abs = getAbsolutePosition(components, hitId, ctx);
          if (abs) {
            return {
              id: hitId,
              x: Math.round(world.x - abs.x - 16),
              y: Math.round(world.y - abs.y - 16),
            };
          }
        }
      }
      return { x: Math.round(world.x), y: Math.round(world.y) };
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [components]);

  // Container ref merging DnD + canvas container + transform wheel
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    dropRef(node);
    setTransformRef(node);
  }, [dropRef, setTransformRef]);

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }
        setCanvasSize({ width, height });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Keyboard: Space for pan mode, Delete for remove
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        spaceRef.current = true;
        e.preventDefault();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
        if (document.activeElement === document.body || document.activeElement === containerRef.current) {
          e.preventDefault();
          deleteComponent(selectedId);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedId, deleteComponent]);

  // Mouse down on canvas
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    // Middle button or Space+left = pan
    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      e.preventDefault();
      dragStateRef.current = {
        type: 'pan',
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startPanX: transformRef.current.panX,
        startPanY: transformRef.current.panY,
      };
      return;
    }

    // Left click = select / drag
    if (e.button === 0) {
      const world = screenToWorld(e.clientX, e.clientY, rect, transformRef.current);
      const hitId = hitTest(components, world.x, world.y, ctx);

      if (hitId !== null) {
        selectComponent(hitId);
        const abs = getAbsolutePosition(components, hitId, ctx);
        const hitComp = findComponentById(components, hitId);
        dragStateRef.current = {
          type: 'move',
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          startPanX: 0,
          startPanY: 0,
          componentId: hitId,
          startCompX: abs?.x ?? 0,
          startCompY: abs?.y ?? 0,
          baseX: hitComp?.x ?? 0,
          baseY: hitComp?.y ?? 0,
        };
      } else {
        selectComponent(null);
        dragStateRef.current = {
          type: 'pan',
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          startPanX: transformRef.current.panX,
          startPanY: transformRef.current.panY,
        };
      }
    }
  }, [components, selectComponent]);

  // Window-level mouse move + up
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (ds.type === 'pan') {
        const dx = e.clientX - ds.startScreenX;
        const dy = e.clientY - ds.startScreenY;
        const t = transformRef.current;
        setTransform({ panX: ds.startPanX + dx / t.zoom, panY: ds.startPanY + dy / t.zoom, zoom: t.zoom });
      } else if (ds.type === 'move' && ds.componentId !== undefined) {
        const t = transformRef.current;
        const dx = (e.clientX - ds.startScreenX) / t.zoom;
        const dy = (e.clientY - ds.startScreenY) / t.zoom;
        dragPreviewRef.current = {
          componentId: ds.componentId,
          x: (ds.startCompX ?? 0) + dx,
          y: (ds.startCompY ?? 0) + dy,
        };
        setRenderTick((tick) => tick + 1);
      }
    };

    const onMouseUp = (_e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (ds.type === 'move' && ds.componentId !== undefined) {
        const preview = dragPreviewRef.current;
        if (preview && (preview.x !== ds.startCompX || preview.y !== ds.startCompY)) {
          const newX = (ds.baseX ?? 0) + Math.round(preview.x) - (ds.startCompX ?? 0);
          const newY = (ds.baseY ?? 0) + Math.round(preview.y) - (ds.startCompY ?? 0);
          updateComponentPosition(preview.componentId, newX, newY);
        }
        dragPreviewRef.current = null;
        setRenderTick((tick) => tick + 1);
      }
      dragStateRef.current = {
        type: 'none', startScreenX: 0, startScreenY: 0, startPanX: 0, startPanY: 0,
      };
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [setTransform, updateComponentPosition]);

  const isPanMode = spaceRef.current;
  const cursor = isPanMode ? 'grab' : (isOver ? 'copy' : 'default');

  return (
    <div
      ref={setContainerRef}
      className="stage-container h-full w-full overflow-hidden relative"
      style={{ cursor, border: isOver ? '1px solid #1677ff' : 'none' }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default CanvasStage;
