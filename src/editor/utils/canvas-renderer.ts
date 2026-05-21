import type { Component } from '../stores/components';
import type { ViewTransform } from './coords';
import {
  measureComponent,
  drawButton,
  drawInput,
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
}

export function renderCanvas(opts: RenderOptions) {
  const { ctx, components, selectedComponentId, transform, canvasW, canvasH, dpr, dragPreview } = opts;

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
    renderComponent(ctx, comp, selectedComponentId, dragPreview);
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
) {
  let wx = (comp.x ?? 0) + parentX;
  let wy = (comp.y ?? 0) + parentY;

  if (dragPreview && dragPreview.componentId === comp.id) {
    wx = dragPreview.x;
    wy = dragPreview.y;
  }

  const size = measureComponent(comp, ctx);

  switch (comp.name) {
    case 'Button':
      drawButton(ctx, wx, wy, size.width, size.height, comp.props);
      break;
    case 'Input':
      drawInput(ctx, wx, wy, size.width, size.height, comp.props);
      break;
    case 'Space': {
      drawSpace(ctx, wx, wy, size.width, size.height, comp.props, !comp.children?.length);

      if (comp.children?.length) {
        const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
        let cx = wx + SPACE_PAD;
        const cy = wy + SPACE_PAD;
        for (const child of comp.children) {
          const childSize = measureComponent(child, ctx);
          renderComponent(ctx, child, selectedId, dragPreview, cx, cy);
          cx += childSize.width + gap;
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
  const compX = (comp.x ?? 0) + parentX;
  const compY = (comp.y ?? 0) + parentY;
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
      cx += childSize.width + gap;
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
  function walk(comps: Component[], px: number, py: number): { x: number; y: number } | null {
    let cx = px;
    for (const comp of comps) {
      const compX = (comp.x ?? 0) + cx;
      const compY = (comp.y ?? 0) + py;
      if (comp.id === targetId) return { x: compX, y: compY };
      if (comp.children?.length && comp.name === 'Space') {
        const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
        const childSize = measureComponent(comp, ctx);
        const found = walk(comp.children, compX + SPACE_PAD, compY + SPACE_PAD);
        if (found) return found;
        cx += childSize.width + gap;
      }
    }
    return null;
  }
  return walk(components, 0, 0);
}
