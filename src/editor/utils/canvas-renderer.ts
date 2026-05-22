import type { Component } from '../stores/components';
import type { ViewTransform } from './coords';
import {
  measureComponent,
  drawButton,
  drawInput,
  drawText,
  drawImage,
  drawCard,
  drawSpace,
  drawSelectionBox,
  drawGrid,
} from './canvas-drawers';

const SPACE_GAPS: Record<string, number> = { small: 8, middle: 16, large: 24 };
const SPACE_PAD = 16;

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  components: Component[];
  selectedComponentId: number | null;
  transform: ViewTransform;
  canvasW: number;
  canvasH: number;
  dpr: number;
  dragPreview?: { componentId: number; x: number; y: number };
  imageCache?: Map<string, HTMLImageElement>;
  onImageLoaded?: () => void;
}

export function renderCanvas(opts: RenderOptions) {
  const { ctx, components, selectedComponentId, transform, canvasW, canvasH, dpr, dragPreview, imageCache, onImageLoaded } = opts;

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
    renderComponent(ctx, comp, selectedComponentId, dragPreview, 0, 0, imageCache, onImageLoaded);
  }

  ctx.restore();
}

function renderComponent(
  ctx: CanvasRenderingContext2D,
  comp: Component,
  selectedId: number | null,
  dragPreview?: { componentId: number; x: number; y: number },
  parentX = 0,
  parentY = 0,
  imageCache?: Map<string, HTMLImageElement>,
  onImageLoaded?: () => void,
) {
  let wx = (comp.x ?? 0) + parentX;
  let wy = (comp.y ?? 0) + parentY;

  if (dragPreview && dragPreview.componentId === comp.id) {
    wx = dragPreview.x;
    wy = dragPreview.y;
  }

  const compStyle = comp.props?.style || {};
  wx += typeof compStyle.marginLeft === 'number' ? compStyle.marginLeft : 0;
  wy += typeof compStyle.marginTop === 'number' ? compStyle.marginTop : 0;

  const size = measureComponent(comp, ctx);

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
          renderComponent(ctx, child, selectedId, dragPreview, wx + padding, cy, imageCache, onImageLoaded);
          const childS = child.props?.style || {};
          const mb = typeof childS.marginBottom === 'number' ? childS.marginBottom : 0;
          cy += childSize.height + mb + gap;
        }
      }
      break;
    }
    case 'Space': {
      drawSpace(ctx, wx, wy, size.width, size.height, comp.props, !comp.children?.length);

      if (comp.children?.length) {
        const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
        let cx = wx + SPACE_PAD;
        const cy = wy + SPACE_PAD;
        for (const child of comp.children) {
          const childSize = measureComponent(child, ctx);
          renderComponent(ctx, child, selectedId, dragPreview, cx, cy, imageCache, onImageLoaded);
          const childS = child.props?.style || {};
          const mr = typeof childS.marginRight === 'number' ? childS.marginRight : 0;
          cx += childSize.width + mr + gap;
        }
      }
      break;
    }
  }

  if (comp.id === selectedId) {
    drawSelectionBox(ctx, wx, wy, size.width, size.height);
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
  const compStyle = comp.props?.style || {};
  const ml = typeof compStyle.marginLeft === 'number' ? compStyle.marginLeft : 0;
  const mt = typeof compStyle.marginTop === 'number' ? compStyle.marginTop : 0;
  const compX = (comp.x ?? 0) + parentX + ml;
  const compY = (comp.y ?? 0) + parentY + mt;
  const size = measureComponent(comp, ctx);

  if (wx < compX || wx > compX + size.width || wy < compY || wy > compY + size.height) {
    return null;
  }

  if (comp.name === 'Space' && comp.children?.length) {
    const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
    let cx = compX + SPACE_PAD;
    const cy = compY + SPACE_PAD;
    for (let i = comp.children.length - 1; i >= 0; i--) {
      const child = comp.children[i];
      const childSize = measureComponent(child, ctx);
      if (wx >= cx && wx <= cx + childSize.width && wy >= cy && wy <= cy + childSize.height) {
        const deep = hitTestComponent(child, wx, wy, ctx, cx, cy);
        return deep ?? child.id;
      }
      const childS = child.props?.style || {};
      const mr = typeof childS.marginRight === 'number' ? childS.marginRight : 0;
      cx += childSize.width + mr + gap;
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
      const childS = child.props?.style || {};
      const mb = typeof childS.marginBottom === 'number' ? childS.marginBottom : 0;
      cy += childSize.height + mb + gap;
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
      const compStyle = comp.props?.style || {};
      const ml = typeof compStyle.marginLeft === 'number' ? compStyle.marginLeft : 0;
      const mt = typeof compStyle.marginTop === 'number' ? compStyle.marginTop : 0;
      const compX = (comp.x ?? 0) + cx + ml;
      const compY = (comp.y ?? 0) + py + mt;
      if (comp.id === targetId) return { x: compX, y: compY };
      const mr = typeof compStyle.marginRight === 'number' ? compStyle.marginRight : 0;
      const mb = typeof compStyle.marginBottom === 'number' ? compStyle.marginBottom : 0;
      if (comp.children?.length && comp.name === 'Space') {
        const childSize = measureComponent(comp, ctx);
        const found = walk(comp.children, compX + SPACE_PAD, compY + SPACE_PAD, true);
        if (found) return found;
        if (useLayout) {
          const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
          cx += childSize.width + mr + gap;
        }
      } else if (comp.children?.length && comp.name === 'Card') {
        const childSize = measureComponent(comp, ctx);
        const found = walk(comp.children, compX + 12, compY + 48, false);
        if (found) return found;
        if (useLayout) {
          const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
          cx += childSize.width + mr + gap;
        }
      } else if (useLayout) {
        const compSize = measureComponent(comp, ctx);
        const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
        cx += compSize.width + mr + gap;
      }
    }
    return null;
  }
  return walk(components, 0, 0, false);
}
