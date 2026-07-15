import type { Component } from '../stores/components';
import type { ViewTransform } from './coords';
import type { MeasureCache } from './measure-cache';
import type { StaticBufferState } from './static-buffer';
import { getCachedMeasure } from './measure-cache';
import {
  measureComponent,
  measureComponentCached,
  drawButton,
  drawInput,
  drawText,
  drawResizeHandles,
  drawInsertionLine,
  drawImage,
  drawCard,
  drawSpace,
  drawSelectionBox,
  drawGrid,
  drawAlignmentGuides,
  type AlignmentGuide,
} from './canvas-drawers';

const SPACE_GAPS: Record<string, number> = { small: 8, middle: 16, large: 24 };
const SPACE_PAD = 16;

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  components: Component[];
  selectedComponentIds: number[];
  transform: ViewTransform;
  canvasW: number;
  canvasH: number;
  dpr: number;
  dragPreview?: Array<{ componentId: number; x: number; y: number }>;
  resizePreview?: { componentId: number; x: number; y: number; w: number; h: number };
  insertionIndicator?: { x: number; y: number; length: number; horizontal: boolean } | null;
  selectionRect?: { x: number; y: number; w: number; h: number } | null;
  alignmentGuides?: AlignmentGuide[];
  imageCache?: Map<string, HTMLImageElement>;
  onImageLoaded?: () => void;
  measureCache?: MeasureCache;
}

export function renderCanvas(opts: RenderOptions) {
  const { ctx, components, selectedComponentIds, transform, canvasW, canvasH, dpr, dragPreview, resizePreview, imageCache, onImageLoaded, alignmentGuides, insertionIndicator, selectionRect, measureCache } = opts;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  drawGrid(ctx, transform, canvasW, canvasH);

  ctx.setTransform(
    transform.zoom * dpr,
    0,
    0,
    transform.zoom * dpr,
    transform.panX * transform.zoom * dpr,
    transform.panY * transform.zoom * dpr,
  );

  for (const comp of components) {
    renderComponent(ctx, comp, selectedComponentIds, dragPreview, 0, 0, imageCache, onImageLoaded, transform.zoom, resizePreview, measureCache);
  }

  if (insertionIndicator) {
    drawInsertionLine(ctx, insertionIndicator.x, insertionIndicator.y, insertionIndicator.length, insertionIndicator.horizontal);
  }

  if (selectionRect) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(66, 133, 244, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.fillStyle = 'rgba(66, 133, 244, 0.08)';
    ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.setLineDash([]);
  }

  if (alignmentGuides?.length) {
    drawAlignmentGuides(ctx, alignmentGuides);
  }

  ctx.restore();
}

function renderComponent(
  ctx: CanvasRenderingContext2D,
  comp: Component,
  selectedIds: number[],
  dragPreviews?: Array<{ componentId: number; x: number; y: number }>,
  parentX = 0,
  parentY = 0,
  imageCache?: Map<string, HTMLImageElement>,
  onImageLoaded?: () => void,
  zoom?: number,
  resizePreview?: RenderOptions['resizePreview'],
  measureCache?: MeasureCache,
) {
  let wx = (comp.x ?? 0) + parentX;
  let wy = (comp.y ?? 0) + parentY;

  const dp = dragPreviews?.find((p) => p.componentId === comp.id);
  if (dp) {
    wx = dp.x;
    wy = dp.y;
  }

  let size = measureCache
    ? measureComponentCached(comp, ctx, measureCache)
    : measureComponent(comp, ctx);
  if (resizePreview && resizePreview.componentId === comp.id) {
    const rp = resizePreview;
    const totalW = rp.w + size.ox + (size.width - size.cw - size.ox);
    const totalH = rp.h + size.oy + (size.height - size.ch - size.oy);
    size = { ...size, cw: rp.w, ch: rp.h, width: totalW, height: totalH };
    wx = rp.x;
    wy = rp.y;
  }

  switch (comp.name) {
    case 'Button':
      drawButton(ctx, wx, wy, size.width, size.height, comp.props);
      break;
    case 'Input':
      drawInput(ctx, wx, wy, size.width, size.height, comp.props);
      break;
    case 'Text':
      drawText(ctx, wx, wy, size.width, size.height, comp.props);
      break;
    case 'Image':
      drawImage(ctx, wx, wy, size.width, size.height, comp.props, imageCache, onImageLoaded);
      break;
    case 'Card': {
      drawCard(ctx, wx, wy, size.width, size.height, comp.props, !comp.children?.length);

      if (comp.children?.length) {
        const padding = 12;
        const titleHeight = 36;
        const gap = 8;
        let cy = wy + titleHeight + padding;
        for (const child of comp.children) {
          const childSize = measureCache
            ? measureComponentCached(child, ctx, measureCache)
            : measureComponent(child, ctx);
          renderComponent(ctx, child, selectedIds, dragPreviews, wx + padding, cy, imageCache, onImageLoaded, zoom, resizePreview, measureCache);
          cy += childSize.height + gap;
        }
      }
      break;
    }
    case 'Space': {
      drawSpace(ctx, wx, wy, size.width, size.height, comp.props, !comp.children?.length);

      if (comp.children?.length) {
        const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
        const spaceContentH = size.ch - SPACE_PAD * 2;
        let cx = wx + SPACE_PAD;
        const topY = wy + SPACE_PAD;
        for (const child of comp.children) {
          const childSize = measureCache
            ? measureComponentCached(child, ctx, measureCache)
            : measureComponent(child, ctx);
          const childCY = topY + (spaceContentH - childSize.ch) / 2 - childSize.oy;
          const childCYClamped = Math.max(topY, childCY);
          renderComponent(ctx, child, selectedIds, dragPreviews, cx, childCYClamped, imageCache, onImageLoaded, zoom, resizePreview, measureCache);
          cx += childSize.width + gap;
        }
      }
      break;
    }
  }

  if (selectedIds.includes(comp.id)) {
    const sx = wx + size.ox, sy = wy + size.oy, sw = size.cw, sh = size.ch;
    drawSelectionBox(ctx, sx, sy, sw, sh);
    if (zoom) {
      drawResizeHandles(ctx, sx, sy, sw, sh, zoom);
    }
  }
}

export function hitTest(
  components: Component[],
  worldX: number,
  worldY: number,
  ctx: CanvasRenderingContext2D,
  measureCache?: MeasureCache,
): number | null {
  for (let i = components.length - 1; i >= 0; i--) {
    const result = hitTestComponent(components[i], worldX, worldY, ctx, 0, 0, measureCache);
    if (result !== null) return result;
  }
  return null;
}

function hitTestComponent(
  comp: Component,
  wx: number,
  wy: number,
  ctx: CanvasRenderingContext2D,
  parentX: number,
  parentY: number,
  measureCache?: MeasureCache,
): number | null {
  const compX = (comp.x ?? 0) + parentX;
  const compY = (comp.y ?? 0) + parentY;
  const size = measureCache
    ? measureComponentCached(comp, ctx, measureCache)
    : measureComponent(comp, ctx);

  if (wx < compX || wx > compX + size.width || wy < compY || wy > compY + size.height) {
    return null;
  }

  if (comp.name === 'Space' && comp.children?.length) {
    const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
    const spaceContentH = size.ch - SPACE_PAD * 2;
    const topY = compY + SPACE_PAD;
    const positions: Array<{ child: Component; cx: number; cy: number; w: number; h: number }> = [];
    let cx = compX + SPACE_PAD;
    for (const child of comp.children) {
      const childSize = measureCache
        ? measureComponentCached(child, ctx, measureCache)
        : measureComponent(child, ctx);
      const childCY = topY + (spaceContentH - childSize.ch) / 2 - childSize.oy;
      positions.push({ child, cx, cy: Math.max(topY, childCY), w: childSize.width, h: childSize.height });
      cx += childSize.width + gap;
    }
    for (let i = positions.length - 1; i >= 0; i--) {
      const p = positions[i];
      if (wx >= p.cx && wx <= p.cx + p.w && wy >= p.cy && wy <= p.cy + p.h) {
        const deep = hitTestComponent(p.child, wx, wy, ctx, p.cx, p.cy, measureCache);
        return deep ?? p.child.id;
      }
    }
  }

  if (comp.name === 'Card' && comp.children?.length) {
    const padding = 12;
    const titleHeight = 36;
    const gap = 8;
    const positions: Array<{ child: Component; cx: number; cy: number; w: number; h: number }> = [];
    let cy = compY + titleHeight + padding;
    for (const child of comp.children) {
      const childSize = measureCache
        ? measureComponentCached(child, ctx, measureCache)
        : measureComponent(child, ctx);
      positions.push({ child, cx: compX + padding, cy, w: childSize.width, h: childSize.height });
      cy += childSize.height + gap;
    }
    for (let i = positions.length - 1; i >= 0; i--) {
      const p = positions[i];
      if (wx >= p.cx && wx <= p.cx + p.w && wy >= p.cy && wy <= p.cy + p.h) {
        const deep = hitTestComponent(p.child, wx, wy, ctx, p.cx, p.cy, measureCache);
        return deep ?? p.child.id;
      }
    }
  }

  return comp.id;
}

export function findComponentById(components: Component[], id: number): Component | null {
  for (const comp of components) {
    if (comp.id === id) return comp;
    if (comp.children?.length) {
      const found = findComponentById(comp.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function getAbsolutePosition(
  components: Component[],
  targetId: number,
  ctx: CanvasRenderingContext2D,
): { x: number; y: number } | null {
  function walk(comps: Component[], px: number, py: number, useLayout: boolean): { x: number; y: number } | null {
    let cx = px;
    for (const comp of comps) {
      const compX = (comp.x ?? 0) + cx;
      const compY = (comp.y ?? 0) + py;
      if (comp.id === targetId) return { x: compX, y: compY };
      if (comp.children?.length && comp.name === 'Space') {
        const parentSize = measureComponent(comp, ctx);
        const spaceContentH = parentSize.ch - SPACE_PAD * 2;
        const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
        const topY = compY + SPACE_PAD;
        let childCx = compX + SPACE_PAD;
        for (const child of comp.children) {
          const cs = measureComponent(child, ctx);
          const childCY = topY + (spaceContentH - cs.ch) / 2 - cs.oy;
          const childCYClamped = Math.max(topY, childCY);
          // Check this child directly
          if (child.id === targetId) return { x: childCx, y: childCYClamped };
          // Recurse into child if it's a container
          if (child.children?.length && (child.name === 'Space' || child.name === 'Card')) {
            const deep = walk(child.children, childCx + (child.name === 'Space' ? SPACE_PAD : 12), childCYClamped + (child.name === 'Space' ? SPACE_PAD : 48), child.name === 'Space');
            if (deep) return deep;
          }
          childCx += cs.width + gap;
        }
        if (useLayout) {
          cx += parentSize.width + gap;
        }
      } else if (comp.children?.length && comp.name === 'Card') {
        const childSize = measureComponent(comp, ctx);
        const found = walk(comp.children, compX + 12, compY + 48, false);
        if (found) return found;
        if (useLayout) {
          cx += childSize.width + SPACE_GAPS[comp.props?.size || 'middle'] || 16;
        }
      } else if (useLayout) {
        const compSize = measureComponent(comp, ctx);
        cx += compSize.width + (SPACE_GAPS[comp.props?.size || 'middle'] || 16);
      }
    }
    return null;
  }
  return walk(components, 0, 0, false);
}

/** 为单个组件及其子组件递归绘制选中框覆盖层（不重绘组件本体） */
function drawSelectionOverlaysForComponent(
  ctx: CanvasRenderingContext2D,
  comp: Component,
  selectedIds: number[],
  parentX: number,
  parentY: number,
  zoom?: number,
  measureCache?: MeasureCache,
): void {
  const wx = (comp.x ?? 0) + parentX;
  const wy = (comp.y ?? 0) + parentY;

  if (selectedIds.includes(comp.id)) {
    const size = measureCache
      ? getCachedMeasure(comp, measureCache) ?? measureComponent(comp, ctx)
      : measureComponent(comp, ctx);
    const sx = wx + size.ox, sy = wy + size.oy, sw = size.cw, sh = size.ch;
    drawSelectionBox(ctx, sx, sy, sw, sh);
    if (zoom && selectedIds.length === 1) {
      drawResizeHandles(ctx, sx, sy, sw, sh, zoom);
    }
  }

  // Recurse into container children
  if (comp.children?.length) {
    if (comp.name === 'Card') {
      const padding = 12;
      const titleHeight = 36;
      const gap = 8;
      let cy = wy + titleHeight + padding;
      for (const child of comp.children) {
        const childSize = measureCache
          ? (getCachedMeasure(child, measureCache) ?? measureComponent(child, ctx))
          : measureComponent(child, ctx);
        drawSelectionOverlaysForComponent(ctx, child, selectedIds, wx + padding, cy, zoom, measureCache);
        cy += childSize.height + gap;
      }
    } else if (comp.name === 'Space') {
      const SPACE_GAPS: Record<string, number> = { small: 8, middle: 16, large: 24 };
      const SPACE_PAD = 16;
      const parentSize = measureCache
        ? (getCachedMeasure(comp, measureCache) ?? measureComponent(comp, ctx))
        : measureComponent(comp, ctx);
      const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
      const spaceContentH = parentSize.ch - SPACE_PAD * 2;
      const topY = wy + SPACE_PAD;
      let cx = wx + SPACE_PAD;
      for (const child of comp.children) {
        const childSize = measureCache
          ? (getCachedMeasure(child, measureCache) ?? measureComponent(child, ctx))
          : measureComponent(child, ctx);
        const childCY = topY + (spaceContentH - childSize.ch) / 2 - childSize.oy;
        const childCYClamped = Math.max(topY, childCY);
        drawSelectionOverlaysForComponent(ctx, child, selectedIds, cx, childCYClamped, zoom, measureCache);
        cx += childSize.width + gap;
      }
    }
  }
}

/** 优化渲染路径：blit 静态缓冲 + 只绘制动态元素 */
export function renderCanvasOptimized(
  mainCtx: CanvasRenderingContext2D,
  staticBuffer: StaticBufferState,
  opts: RenderOptions,
): void {
  const {
    ctx, components, selectedComponentIds, transform, canvasW, canvasH, dpr,
    dragPreview, resizePreview, insertionIndicator, selectionRect,
    alignmentGuides, imageCache, onImageLoaded, measureCache,
  } = opts;

  const canUseBuffer = staticBuffer.canvas && !staticBuffer.dirty;

  mainCtx.save();
  mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (canUseBuffer) {
    // Blit 静态缓冲（grid + 所有静态组件）
    mainCtx.clearRect(0, 0, canvasW, canvasH);
    mainCtx.drawImage(staticBuffer.canvas!, 0, 0, canvasW, canvasH);
  } else {
    // 回退：至少清背景并画 grid
    mainCtx.clearRect(0, 0, canvasW, canvasH);
    drawGrid(mainCtx, transform, canvasW, canvasH);
  }

  // 世界空间变换
  mainCtx.setTransform(
    transform.zoom * dpr, 0, 0, transform.zoom * dpr,
    transform.panX * transform.zoom * dpr,
    transform.panY * transform.zoom * dpr,
  );

  if (canUseBuffer && dragPreview?.length) {
    // 拖拽优化路径：只绘制移动中的组件
    const movingIds = new Set(dragPreview.map(p => p.componentId));

    // 为静态组件绘制选中框覆盖层
    for (const comp of components) {
      if (movingIds.has(comp.id)) continue;
      drawSelectionOverlaysForComponent(
        mainCtx, comp, selectedComponentIds, 0, 0, transform.zoom, measureCache,
      );
    }

    // 绘制移动中的组件（含选中框和手柄）
    for (const comp of components) {
      if (!movingIds.has(comp.id)) continue;
      renderComponent(
        mainCtx, comp, selectedComponentIds, dragPreview, 0, 0,
        imageCache, onImageLoaded, transform.zoom, resizePreview, measureCache,
      );
    }
  } else if (canUseBuffer && resizePreview) {
    // 缩放优化路径：只绘制缩放中的组件
    const resizeId = resizePreview.componentId;
    for (const comp of components) {
      if (comp.id === resizeId) {
        renderComponent(
          mainCtx, comp, selectedComponentIds, undefined, 0, 0,
          imageCache, onImageLoaded, transform.zoom, resizePreview, measureCache,
        );
      } else {
        drawSelectionOverlaysForComponent(
          mainCtx, comp, selectedComponentIds, 0, 0, transform.zoom, measureCache,
        );
      }
    }
  } else if (canUseBuffer) {
    // 无拖拽/缩放但有缓冲可用（如 DnD hover、选择变化）：blit 缓冲 + 绘制选中覆盖层
    for (const comp of components) {
      drawSelectionOverlaysForComponent(
        mainCtx, comp, selectedComponentIds, 0, 0, transform.zoom, measureCache,
      );
    }
  } else {
    // 全量渲染路径（缓冲脏或无缓冲）
    for (const comp of components) {
      renderComponent(
        mainCtx, comp, selectedComponentIds, dragPreview, 0, 0,
        imageCache, onImageLoaded, transform.zoom, resizePreview, measureCache,
      );
    }
  }

  // 绘制覆盖层
  if (insertionIndicator) {
    drawInsertionLine(mainCtx, insertionIndicator.x, insertionIndicator.y,
      insertionIndicator.length, insertionIndicator.horizontal);
  }
  if (selectionRect) {
    mainCtx.setLineDash([4, 4]);
    mainCtx.strokeStyle = 'rgba(66, 133, 244, 0.8)';
    mainCtx.lineWidth = 1;
    mainCtx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    mainCtx.fillStyle = 'rgba(66, 133, 244, 0.08)';
    mainCtx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    mainCtx.setLineDash([]);
  }
  if (alignmentGuides?.length) {
    drawAlignmentGuides(mainCtx, alignmentGuides);
  }

  mainCtx.restore();
}
