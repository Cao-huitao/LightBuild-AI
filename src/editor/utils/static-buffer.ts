import type { Component } from '../stores/components';
import type { ViewTransform } from './coords';
import type { MeasureCache } from './measure-cache';
import { measureComponent, measureComponentCached } from './canvas-drawers';
import {
  drawButton,
  drawInput,
  drawText,
  drawImage,
  drawCard,
  drawSpace,
  drawGrid,
  drawInsertionLine,
} from './canvas-drawers';

const SPACE_GAPS: Record<string, number> = { small: 8, middle: 16, large: 24 };
const SPACE_PAD = 16;

export interface StaticBufferState {
  /** 离屏 canvas */
  canvas: HTMLCanvasElement | null;
  /** 是否需要重建 */
  dirty: boolean;
  /** 上次渲染时的画布尺寸 */
  lastWidth: number;
  lastHeight: number;
  /** 上次渲染时的 DPR */
  lastDpr: number;
  /** 上次渲染时的变换状态 */
  lastTransform: ViewTransform | null;
  /** 被排除的组件 ID（正在拖拽/缩放的组件不进入缓冲） */
  excludedComponentIds: Set<number>;
}

export function createStaticBuffer(): StaticBufferState {
  return {
    canvas: null,
    dirty: true,
    lastWidth: 0,
    lastHeight: 0,
    lastDpr: 0,
    lastTransform: null,
    excludedComponentIds: new Set(),
  };
}

/** 确保离屏 canvas 尺寸匹配，尺寸变化时自动标记 dirty */
export function ensureStaticBufferSize(
  state: StaticBufferState,
  width: number,
  height: number,
  dpr: number,
): void {
  if (!state.canvas) {
    state.canvas = document.createElement('canvas');
  }
  const needResize =
    state.lastWidth !== width ||
    state.lastHeight !== height ||
    state.lastDpr !== dpr;

  if (needResize) {
    state.canvas.width = width * dpr;
    state.canvas.height = height * dpr;
    state.canvas.style.width = `${width}px`;
    state.canvas.style.height = `${height}px`;
    state.lastWidth = width;
    state.lastHeight = height;
    state.lastDpr = dpr;
    state.dirty = true;
  }
}

/** 标记缓冲需要重建 */
export function invalidateStaticBuffer(state: StaticBufferState): void {
  state.dirty = true;
}

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

/** 设置被排除的组件 ID 集合，集合变化时标记 dirty */
export function setExcludedComponents(
  state: StaticBufferState,
  ids: Set<number>,
): void {
  if (!setsEqual(state.excludedComponentIds, ids)) {
    state.excludedComponentIds = ids;
    state.dirty = true;
  }
}

/** 重建静态缓冲：在离屏 canvas 上渲染 grid + 所有非 excluded 组件（不含选中框） */
export function rebuildStaticBuffer(
  state: StaticBufferState,
  opts: {
    components: Component[];
    transform: ViewTransform;
    canvasW: number;
    canvasH: number;
    dpr: number;
    imageCache?: Map<string, HTMLImageElement>;
    measureCache?: MeasureCache;
    insertionIndicator?: { x: number; y: number; length: number; horizontal: boolean } | null;
  },
): void {
  ensureStaticBufferSize(state, opts.canvasW, opts.canvasH, opts.dpr);
  const canvas = state.canvas!;
  const ctx = canvas.getContext('2d')!;
  const {
    components, transform, canvasW, canvasH, dpr,
    imageCache, measureCache, insertionIndicator,
  } = opts;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  // 绘制 grid（屏幕空间）
  drawGrid(ctx, transform, canvasW, canvasH);

  // 世界空间变换
  ctx.setTransform(
    transform.zoom * dpr, 0, 0, transform.zoom * dpr,
    transform.panX * transform.zoom * dpr,
    transform.panY * transform.zoom * dpr,
  );

  // 绘制所有组件（跳过 excluded 的）
  for (const comp of components) {
    renderComponentStatic(
      ctx, comp, state.excludedComponentIds,
      0, 0, imageCache, measureCache,
    );
  }

  // 绘制插入线
  if (insertionIndicator) {
    drawInsertionLine(
      ctx, insertionIndicator.x, insertionIndicator.y,
      insertionIndicator.length, insertionIndicator.horizontal,
    );
  }

  ctx.restore();

  state.dirty = false;
  state.lastTransform = { ...transform };
}

/** 渲染组件（仅绘制组件本体，不绘制选中框和手柄） */
function renderComponentStatic(
  ctx: CanvasRenderingContext2D,
  comp: Component,
  excludedIds: Set<number>,
  parentX: number,
  parentY: number,
  imageCache?: Map<string, HTMLImageElement>,
  measureCache?: MeasureCache,
): void {
  if (excludedIds.has(comp.id)) return;

  const wx = (comp.x ?? 0) + parentX;
  const wy = (comp.y ?? 0) + parentY;

  const size = measureCache
    ? measureComponentCached(comp, ctx, measureCache)
    : measureComponent(comp, ctx);

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
      drawImage(ctx, wx, wy, size.width, size.height, comp.props, imageCache);
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
          renderComponentStatic(ctx, child, excludedIds, wx + padding, cy, imageCache, measureCache);
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
          renderComponentStatic(ctx, child, excludedIds, cx, childCYClamped, imageCache, measureCache);
          cx += childSize.width + gap;
        }
      }
      break;
    }
  }
  // 不绘制选中框和手柄
}
