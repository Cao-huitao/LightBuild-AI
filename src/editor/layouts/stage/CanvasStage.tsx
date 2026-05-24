import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useComponents } from '../../stores/components';
import { useCanvasTransform } from '../../hooks/useCanvasTransform';
import { renderCanvas, hitTest, findComponentById, getAbsolutePosition } from '../../utils/canvas-renderer';
import { measureComponent } from '../../utils/canvas-drawers';
import type { AlignmentGuide } from '../../utils/canvas-drawers';
import { screenToWorld } from '../../utils/coords';
import type { Component } from '../../stores/components';

const ALIGN_THRESHOLD = 5;

function findAlignments(
  dragComp: Component,
  dragX: number,
  dragY: number,
  components: Component[],
  ctx: CanvasRenderingContext2D,
): AlignmentGuide[] {
  const dragSize = measureComponent(dragComp, ctx);
  const dr = { x: dragX, y: dragY, w: dragSize.width, h: dragSize.height };
  const guides: AlignmentGuide[] = [];

  const dEdges = {
    left: dr.x,
    right: dr.x + dr.w,
    top: dr.y,
    bottom: dr.y + dr.h,
    cx: dr.x + dr.w / 2,
    cy: dr.y + dr.h / 2,
  };

  // Collect all component rects recursively
  const allRects: Array<{ id: number; x: number; y: number; w: number; h: number }> = [];
  function collect(comps: Component[], px: number, py: number) {
    for (const comp of comps) {
      const cx = (comp.x ?? 0) + px;
      const cy = (comp.y ?? 0) + py;
      const size = measureComponent(comp, ctx);
      allRects.push({ id: comp.id, x: cx, y: cy, w: size.width, h: size.height });
      if (comp.children?.length && comp.name === 'Space') {
        collect(comp.children, cx + 16, cy + 16);
      } else if (comp.children?.length && comp.name === 'Card') {
        collect(comp.children, cx + 12, cy + 48);
      }
    }
  }
  collect(components, 0, 0);

  for (const r of allRects) {
    if (r.id === dragComp.id) continue;

    const segXMin = Math.min(dr.x, r.x);
    const segXMax = Math.max(dr.x + dr.w, r.x + r.w);
    const segYMin = Math.min(dr.y, r.y);
    const segYMax = Math.max(dr.y + dr.h, r.y + r.h);

    const checks: Array<{ type: AlignmentGuide['type']; val: number; tar: number }> = [
      { type: 'left',    val: dEdges.left,   tar: r.x },
      { type: 'right',   val: dEdges.right,  tar: r.x + r.w },
      { type: 'top',     val: dEdges.top,    tar: r.y },
      { type: 'bottom',  val: dEdges.bottom, tar: r.y + r.h },
      { type: 'centerX', val: dEdges.cx,     tar: r.x + r.w / 2 },
      { type: 'centerY', val: dEdges.cy,     tar: r.y + r.h / 2 },
    ];

    for (const ck of checks) {
      if (Math.abs(ck.val - ck.tar) < ALIGN_THRESHOLD) {
        const isH = ck.type === 'left' || ck.type === 'right' || ck.type === 'centerX';
        guides.push({
          type: ck.type,
          value: ck.tar,
          segStart: (isH ? segYMin : segXMin) - 10,
          segEnd: (isH ? segYMax : segXMax) + 10,
        });
      }
    }
  }

  return guides;
}

const ACCEPT_TYPES = ['Button', 'Space', 'Input', 'Text', 'Image', 'Card'];

type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragTarget {
  componentId: number;
  startCompX: number;
  startCompY: number;
  baseX: number;
  baseY: number;
}

interface DragState {
  type: 'none' | 'pan' | 'move' | 'resize' | 'boxSelect';
  handle?: HandleDir;
  startScreenX: number;
  startScreenY: number;
  startPanX: number;
  startPanY: number;
  componentId?: number;
  startCompX?: number;
  startCompY?: number;
  baseX?: number;
  baseY?: number;
  startW?: number;
  startH?: number;
  resizeBaseX?: number;
  resizeBaseY?: number;
  resizeBaseW?: number;
  resizeBaseH?: number;
  targets?: DragTarget[];
}

const CanvasStage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    type: 'none', startScreenX: 0, startScreenY: 0, startPanX: 0, startPanY: 0,
  });
  const dragPreviewRef = useRef<Array<{ componentId: number; x: number; y: number }>>([]);
  const resizePreviewRef = useRef<{ componentId: number; x: number; y: number; w: number; h: number } | null>(null);
  const insertionRef = useRef<{ x: number; y: number; length: number; horizontal: boolean } | null>(null);
  const insertionStateRef = useRef<{ containerId: number; index: number } | null>(null);
  const selectionRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const alignmentRef = useRef<AlignmentGuide[]>([]);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const spaceRef = useRef(false);
  const dprRef = useRef(window.devicePixelRatio || 1);

  const components = useComponents((s) => s.components);
  const selectedIds = useComponents((s) => s.selectedComponentIds);
  const selectComponent = useComponents((s) => s.selectComponent);
  const toggleSelectComponent = useComponents((s) => s.toggleSelectComponent);
  const selectComponents = useComponents((s) => s.selectComponents);
  const clearSelection = useComponents((s) => s.clearSelection);
  const deleteSelectedComponents = useComponents((s) => s.deleteSelectedComponents);
  const updateComponentPosition = useComponents((s) => s.updateComponentPosition);
  const deleteComponent = useComponents((s) => s.deleteComponent);
  const updateComponentStyles = useComponents((s) => s.updateComponentStyles);

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
      selectedComponentIds: selectedIds,
      transform: transformRef.current,
      canvasW: canvasSize.width,
      canvasH: canvasSize.height,
      dpr: dprRef.current,
      dragPreview: dragPreviewRef.current.length > 0 ? dragPreviewRef.current : undefined,
      resizePreview: resizePreviewRef.current ?? undefined,
      insertionIndicator: insertionRef.current,
      imageCache: imageCacheRef.current,
      onImageLoaded,
      alignmentGuides: alignmentRef.current,
      selectionRect: selectionRectRef.current,
    });
  }, [components, selectedIds, canvasSize, transform]);

  // Store-driven re-renders
  useEffect(() => {
    doRender();
  }, [doRender, renderTick]);

  // Drop target
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ACCEPT_TYPES,
    hover: (_item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset) { insertionRef.current = null; return; }
      const canvas = canvasRef.current;
      if (!canvas) { insertionRef.current = null; return; }
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(offset.x, offset.y, rect, transformRef.current);
      const ctx = canvas.getContext('2d');
      if (!ctx) { insertionRef.current = null; return; }
      const hitId = hitTest(components, world.x, world.y, ctx);
      if (hitId === null) { insertionRef.current = null; insertionStateRef.current = null; setRenderTick(t => t + 1); return; }
      const hitComp = findComponentById(components, hitId);
      const isContainer = hitComp?.name === 'Space' || hitComp?.name === 'Card';
      if (!hitComp || !isContainer) { insertionRef.current = null; insertionStateRef.current = null; setRenderTick(t => t + 1); return; }
      const abs = getAbsolutePosition(components, hitId, ctx);
      if (!abs) { insertionRef.current = null; insertionStateRef.current = null; setRenderTick(t => t + 1); return; }
      const cs = measureComponent(hitComp, ctx);
      const children = hitComp.children ?? [];
      const sx = abs.x + cs.ox, sy = abs.y + cs.oy;
      if (hitComp.name === 'Space') {
        const gap = ({ small: 8, middle: 16, large: 24 } as Record<string, number>)[hitComp.props?.size || 'middle'] || 16;
        let cx = sx + 16;
        let idx = 0;
        for (const child of children) {
          const childCs = measureComponent(child, ctx);
          if (world.x < cx + childCs.width / 2) break;
          cx += childCs.width + gap;
          idx++;
        }
        const len = Math.max(cs.ch - 32, 32);
        insertionRef.current = { x: cx - gap / 2, y: sy + 16, length: len, horizontal: false };
        insertionStateRef.current = { containerId: hitId, index: idx };
      } else if (hitComp.name === 'Card') {
        let cy = sy + 48;
        let idx = 0;
        for (const child of children) {
          const childCs = measureComponent(child, ctx);
          if (world.y < cy + childCs.height / 2) break;
          cy += childCs.height + 8;
          idx++;
        }
        const len = Math.max(cs.cw - 24, 48);
        insertionRef.current = { x: sx + 12, y: cy - 4, length: len, horizontal: true };
        insertionStateRef.current = { containerId: hitId, index: idx };
      }
      setRenderTick(t => t + 1);
    },
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
      const is = insertionStateRef.current;
      insertionRef.current = null;
      insertionStateRef.current = null;
      if (hitId !== null && is && is.containerId === hitId) {
        return { id: hitId, index: is.index, x: Math.round(world.x), y: Math.round(world.y) };
      }
      if (hitId !== null) {
        const hitComp = findComponentById(components, hitId);
        if (hitComp?.name === 'Space' || hitComp?.name === 'Card') {
          return { id: hitId, index: hitComp.children?.length ?? 0, x: Math.round(world.x), y: Math.round(world.y) };
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        if (document.activeElement === document.body || document.activeElement === containerRef.current) {
          e.preventDefault();
          if (selectedIds.length > 1) {
            deleteSelectedComponents();
          } else {
            deleteComponent(selectedIds[0]);
          }
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
  }, [selectedIds, deleteComponent, deleteSelectedComponents]);

  function hitTestHandle(
    comp: Component,
    worldX: number,
    worldY: number,
    ctx: CanvasRenderingContext2D,
  ): HandleDir | null {
    const abs = getAbsolutePosition(components, comp.id, ctx);
    if (!abs) return null;
    const size = measureComponent(comp, ctx);
    const sx = abs.x + size.ox, sy = abs.y + size.oy, sw = size.cw, sh = size.ch;
    const hs = 10 / transformRef.current.zoom;
    const points: Array<{ dir: HandleDir; x: number; y: number }> = [
      { dir: 'nw', x: sx, y: sy },
      { dir: 'n',  x: sx + sw / 2, y: sy },
      { dir: 'ne', x: sx + sw, y: sy },
      { dir: 'e',  x: sx + sw, y: sy + sh / 2 },
      { dir: 'se', x: sx + sw, y: sy + sh },
      { dir: 's',  x: sx + sw / 2, y: sy + sh },
      { dir: 'sw', x: sx, y: sy + sh },
      { dir: 'w',  x: sx, y: sy + sh / 2 },
    ];
    for (const p of points) {
      if (Math.abs(worldX - p.x) < hs && Math.abs(worldY - p.y) < hs) {
        return p.dir;
      }
    }
    return null;
  }

  // Mouse down on canvas
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('shiftKey:', e.shiftKey);
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
        if (e.shiftKey && hitId) {
          console.log('before toggle:', useComponents.getState().selectedComponentIds);
          toggleSelectComponent(hitId);
          console.log('after toggle:', useComponents.getState().selectedComponentIds);
          return;
        }
        console.log('=== multiDrag gate ===');
        console.log('selectedComponentIds:', selectedIds);
        console.log('length:', selectedIds.length);
        console.log('hitId:', hitId, 'type:', typeof hitId);
        console.log('includes?', selectedIds.includes(hitId));
        console.log('raw condition result:', selectedIds.length > 1 && selectedIds.includes(hitId));
        const multiDrag = selectedIds.length > 1 && selectedIds.includes(hitId);
        if (!multiDrag && !selectedIds.includes(hitId)) {
          selectComponent(hitId);
        }
        const hitComp = findComponentById(components, hitId);
        const handle = !multiDrag ? hitTestHandle(hitComp!, world.x, world.y, ctx) : null;
        if (handle) {
          const abs = getAbsolutePosition(components, hitId, ctx);
          const size = measureComponent(hitComp!, ctx);
          dragStateRef.current = {
            type: 'resize',
            handle,
            startScreenX: e.clientX,
            startScreenY: e.clientY,
            startPanX: 0,
            startPanY: 0,
            componentId: hitId,
            startCompX: abs?.x ?? 0,
            startCompY: abs?.y ?? 0,
            resizeBaseX: abs?.x ?? 0,
            resizeBaseY: abs?.y ?? 0,
            resizeBaseW: size.cw,
            resizeBaseH: size.ch,
            baseX: hitComp?.x ?? 0,
            baseY: hitComp?.y ?? 0,
          };
        } else {
          const idsToMove = multiDrag ? selectedIds : [hitId];
          const targets: DragTarget[] = [];
          for (const id of idsToMove) {
            const c = findComponentById(components, id);
            const abs = getAbsolutePosition(components, id, ctx);
            if (c && abs) {
              targets.push({
                componentId: id,
                startCompX: abs.x,
                startCompY: abs.y,
                baseX: c.x ?? 0,
                baseY: c.y ?? 0,
              });
            }
          }
          console.log('[mousedown] multiDrag:', multiDrag, 'targets.length:', targets.length);
          dragStateRef.current = {
            type: 'move',
            startScreenX: e.clientX,
            startScreenY: e.clientY,
            startPanX: 0,
            startPanY: 0,
            componentId: hitId,
            startCompX: targets[0]?.startCompX ?? 0,
            startCompY: targets[0]?.startCompY ?? 0,
            baseX: targets[0]?.baseX ?? 0,
            baseY: targets[0]?.baseY ?? 0,
            targets,
          };
        }
      } else {
        if (e.shiftKey) return;  // Shift+空白 → 保持选中不变
        clearSelection();
        dragStateRef.current = {
          type: 'boxSelect',
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          startPanX: 0,
          startPanY: 0,
          startCompX: world.x,
          startCompY: world.y,
        };
      }
    }
  }, [components, selectComponent, selectedIds, toggleSelectComponent, clearSelection, selectComponents]);

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
        const targets = ds.targets ?? [{ componentId: ds.componentId, startCompX: ds.startCompX ?? 0, startCompY: ds.startCompY ?? 0, baseX: ds.baseX ?? 0, baseY: ds.baseY ?? 0 }];
        dragPreviewRef.current = targets.map((tg) => ({
          componentId: tg.componentId,
          x: tg.startCompX + dx,
          y: tg.startCompY + dy,
        }));
        if (targets.length > 1) console.log('[mousemove] previews.length:', dragPreviewRef.current.length, 'dx:', dx, 'dy:', dy);

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const dragComp = findComponentById(components, ds.componentId);
            if (dragComp && dragPreviewRef.current.length > 0) {
              const p0 = dragPreviewRef.current[0];
              alignmentRef.current = findAlignments(dragComp, p0.x, p0.y, components, ctx);
            }
          }
        }
        setRenderTick((tick) => tick + 1);
      } else if (ds.type === 'resize' && ds.componentId !== undefined && ds.handle) {
        const t = transformRef.current;
        const dx = (e.clientX - ds.startScreenX) / t.zoom;
        const dy = (e.clientY - ds.startScreenY) / t.zoom;
        const bw = ds.resizeBaseW ?? 100, bh = ds.resizeBaseH ?? 32;
        const bx = ds.resizeBaseX ?? 0, by = ds.resizeBaseY ?? 0;
        const MIN = 20;
        const ratio = bw / bh;
        let nw = bw, nh = bh, nx = bx, ny = by;

        const h = ds.handle;
        if (h === 'e')  { nw = Math.max(MIN, bw + dx); }
        if (h === 'w')  { nw = Math.max(MIN, bw - dx); nx = bx + dx; }
        if (h === 's')  { nh = Math.max(MIN, bh + dy); }
        if (h === 'n')  { nh = Math.max(MIN, bh - dy); ny = by + dy; }
        if (h === 'ne') { nw = Math.max(MIN, bw + dx); nh = nw / ratio; ny = by + bh - nh; }
        if (h === 'sw') { nh = Math.max(MIN, bh + dy); nw = nh * ratio; nx = bx + bw - nw; }
        if (h === 'nw') {
          if (Math.abs(dx / bw) > Math.abs(dy / bh)) { nw = Math.max(MIN, bw - dx); nh = nw / ratio; }
          else { nh = Math.max(MIN, bh - dy); nw = nh * ratio; }
          nx = bx + bw - nw; ny = by + bh - nh;
        }
        if (h === 'se') {
          if (Math.abs(dx / bw) > Math.abs(dy / bh)) { nw = Math.max(MIN, bw + dx); nh = nw / ratio; }
          else { nh = Math.max(MIN, bh + dy); nw = nh * ratio; }
        }

        resizePreviewRef.current = { componentId: ds.componentId, x: nx, y: ny, w: nw, h: nh };

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const dragComp = findComponentById(components, ds.componentId);
            if (dragComp) {
              alignmentRef.current = findAlignments(dragComp, nx + nw / 2, ny + nh / 2, components, ctx);
            }
          }
        }
        setRenderTick((tick) => tick + 1);
      } else if (ds.type === 'boxSelect') {
        const t = transformRef.current;
        const dx = (e.clientX - ds.startScreenX) / t.zoom;
        const dy = (e.clientY - ds.startScreenY) / t.zoom;
        const sx = (ds.startCompX ?? 0), sy = (ds.startCompY ?? 0);
        selectionRectRef.current = {
          x: Math.min(sx, sx + dx),
          y: Math.min(sy, sy + dy),
          w: Math.abs(dx),
          h: Math.abs(dy),
        };
        setRenderTick((tick) => tick + 1);
      }
    };

    const onMouseUp = (_e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (ds.type === 'boxSelect') {
        const sr = selectionRectRef.current;
        selectionRectRef.current = null;
        if (sr && sr.w > 2 && sr.h > 2) {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const ids: number[] = [];
              function collectInRect(comps: Component[], px: number, py: number) {
                for (const comp of comps) {
                  const cx = (comp.x ?? 0) + px;
                  const cy = (comp.y ?? 0) + py;
                  const sz = measureComponent(comp, ctx);
                  if (cx >= sr.x && cy >= sr.y && cx + sz.width <= sr.x + sr.w && cy + sz.height <= sr.y + sr.h) {
                    ids.push(comp.id);
                  }
                  if (comp.children?.length && (comp.name === 'Space' || comp.name === 'Card')) {
                    const ox = comp.name === 'Space' ? 16 : 12;
                    const oy = comp.name === 'Space' ? 16 : 48;
                    collectInRect(comp.children, cx + ox, cy + oy);
                  }
                }
              }
              collectInRect(components, 0, 0);
              selectComponents(ids);
            }
          }
        }
        setRenderTick((tick) => tick + 1);
      }
      if (ds.type === 'move' && ds.componentId !== undefined) {
        const previews = dragPreviewRef.current;
        if (previews.length > 0) {
          const targets = ds.targets ?? [{ componentId: ds.componentId, startCompX: ds.startCompX ?? 0, startCompY: ds.startCompY ?? 0, baseX: ds.baseX ?? 0, baseY: ds.baseY ?? 0 }];
          let commitCount = 0;
          for (const tg of targets) {
            const pv = previews.find((p) => p.componentId === tg.componentId);
            if (pv && (pv.x !== tg.startCompX || pv.y !== tg.startCompY)) {
              const newX = tg.baseX + Math.round(pv.x) - tg.startCompX;
              const newY = tg.baseY + Math.round(pv.y) - tg.startCompY;
              updateComponentPosition(tg.componentId, newX, newY);
              commitCount++;
            }
          }
          if (targets.length > 1) console.log('[mouseup] commitCount:', commitCount, '/', targets.length);
        }
        dragPreviewRef.current = [];
        setRenderTick((tick) => tick + 1);
      } else if (ds.type === 'resize' && ds.componentId !== undefined) {
        const rp = resizePreviewRef.current;
        if (rp && ds.handle) {
          const comp = findComponentById(components, ds.componentId);
          const oldX = ds.baseX ?? 0, oldY = ds.baseY ?? 0;
          if (rp.x !== ds.resizeBaseX || rp.y !== ds.resizeBaseY) {
            const newX = oldX + Math.round(rp.x) - Math.round(ds.resizeBaseX ?? 0);
            const newY = oldY + Math.round(rp.y) - Math.round(ds.resizeBaseY ?? 0);
            updateComponentPosition(ds.componentId, newX, newY);
          }
          updateComponentStyles(ds.componentId, {
            width: Math.round(rp.w),
            height: Math.round(rp.h),
          });
        }
        resizePreviewRef.current = null;
        setRenderTick((tick) => tick + 1);
      }
      dragStateRef.current = {
        type: 'none', startScreenX: 0, startScreenY: 0, startPanX: 0, startPanY: 0,
      };
      alignmentRef.current = [];
      selectionRectRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [setTransform, updateComponentPosition, updateComponentStyles, components]);

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
