import type { Component } from '../stores/components';
import type { ViewTransform } from './coords';
import {
  measureComponent,
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
  dragPreview?: { componentId: number; x: number; y: number };
  resizePreview?: { componentId: number; x: number; y: number; w: number; h: number };
  insertionIndicator?: { x: number; y: number; length: number; horizontal: boolean } | null;
  alignmentGuides?: AlignmentGuide[];
  imageCache?: Map<string, HTMLImageElement>;
  onImageLoaded?: () => void;
}

export function renderCanvas(opts: RenderOptions) {
  const { ctx, components, selectedComponentIds, transform, canvasW, canvasH, dpr, dragPreview, imageCache, onImageLoaded, alignmentGuides, insertionIndicator } = opts;

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
    const { resizePreview } = opts;
    renderComponent(ctx, comp, selectedComponentIds, dragPreview, 0, 0, imageCache, onImageLoaded, transform.zoom, resizePreview);
  }

  if (insertionIndicator) {
    drawInsertionLine(ctx, insertionIndicator.x, insertionIndicator.y, insertionIndicator.length, insertionIndicator.horizontal);
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
  dragPreview?: { componentId: number; x: number; y: number },
  parentX = 0,
  parentY = 0,
  imageCache?: Map<string, HTMLImageElement>,
  onImageLoaded?: () => void,
  zoom?: number,
  resizePreview?: RenderOptions['resizePreview'],
) {
  let wx = (comp.x ?? 0) + parentX;
  let wy = (comp.y ?? 0) + parentY;

  if (dragPreview && dragPreview.componentId === comp.id) {
    wx = dragPreview.x;
    wy = dragPreview.y;
  }

  let size = measureComponent(comp, ctx);
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
          const childSize = measureComponent(child, ctx);
          renderComponent(ctx, child, selectedIds, dragPreview, wx + padding, cy, imageCache, onImageLoaded, zoom, resizePreview);
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
          const childSize = measureComponent(child, ctx);
          const childCY = topY + (spaceContentH - childSize.ch) / 2 - childSize.oy;
          const childCYClamped = Math.max(topY, childCY);
          renderComponent(ctx, child, selectedIds, dragPreview, cx, childCYClamped, imageCache, onImageLoaded, zoom, resizePreview);
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
): number | null {
  for (let i = components.length - 1; i >= 0; i--) {
    const result = hitTestComponent(components[i], worldX, worldY, ctx, 0, 0);
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
): number | null {
  const compX = (comp.x ?? 0) + parentX;
  const compY = (comp.y ?? 0) + parentY;
  const size = measureComponent(comp, ctx);

  if (wx < compX || wx > compX + size.width || wy < compY || wy > compY + size.height) {
    return null;
  }

  if (comp.name === 'Space' && comp.children?.length) {
    const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
    const spaceContentH = size.ch - SPACE_PAD * 2;
    let cx = compX + SPACE_PAD;
    const topY = compY + SPACE_PAD;
    for (let i = comp.children.length - 1; i >= 0; i--) {
      const child = comp.children[i];
      const childSize = measureComponent(child, ctx);
      const childCY = topY + (spaceContentH - childSize.ch) / 2 - childSize.oy;
      const childCYClamped = Math.max(topY, childCY);
      if (wx >= cx && wx <= cx + childSize.width && wy >= childCYClamped && wy <= childCYClamped + childSize.height) {
        const deep = hitTestComponent(child, wx, wy, ctx, cx, childCYClamped);
        return deep ?? child.id;
      }
      cx += childSize.width + gap;
    }
  }

  if (comp.name === 'Card' && comp.children?.length) {
    const padding = 12;
    const titleHeight = 36;
    const gap = 8;
    let cy = compY + titleHeight + padding;
    for (let i = comp.children.length - 1; i >= 0; i--) {
      const child = comp.children[i];
      const childSize = measureComponent(child, ctx);
      if (wx >= compX + padding && wx <= compX + padding + childSize.width && wy >= cy && wy <= cy + childSize.height) {
        const deep = hitTestComponent(child, wx, wy, ctx, compX + padding, cy);
        return deep ?? child.id;
      }
      cy += childSize.height + gap;
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
