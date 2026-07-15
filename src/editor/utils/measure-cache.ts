import type { Component } from '../stores/components';
import type { ComponentSize } from './canvas-drawers';

export interface MeasureCacheEntry {
  size: ComponentSize;
  contentHash: string;
}

export type MeasureCache = Map<number, MeasureCacheEntry>;

function resolveTextForHash(value: any): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return String(value.value ?? '');
  return String(value ?? '');
}

/** 计算影响测量结果的组件属性 hash，hash 变化时缓存失效 */
export function computeContentHash(comp: Component): string {
  const s = comp.props?.style || {};
  switch (comp.name) {
    case 'Button': {
      const text = resolveTextForHash(comp.props?.children);
      return `btn:${text}:${s.fontSize}:${s.width}:${s.height}`;
    }
    case 'Text': {
      const text = resolveTextForHash(comp.props?.children);
      return `txt:${text}:${s.fontSize}:${s.width}:${s.height}`;
    }
    case 'Input':
      return `inp:${comp.props?.placeholder ?? ''}:${s.fontSize}:${s.width}:${s.height}`;
    case 'Image':
      return `img:${s.width}:${s.height}`;
    case 'Card':
    case 'Space': {
      const childIds = (comp.children || []).map(c => c.id).join(',');
      return `${comp.name}:${childIds}:${s.width}:${s.height}:${comp.props?.size ?? ''}`;
    }
    default:
      return `${comp.name}:${s.width}:${s.height}`;
  }
}

/** 查询缓存，hash 不匹配则返回 null 并清除过期条目 */
export function getCachedMeasure(
  comp: Component,
  cache: MeasureCache,
): ComponentSize | null {
  const entry = cache.get(comp.id);
  if (!entry) return null;
  const currentHash = computeContentHash(comp);
  if (entry.contentHash !== currentHash) {
    cache.delete(comp.id);
    return null;
  }
  return entry.size;
}

/** 写入测量缓存 */
export function setCachedMeasure(
  comp: Component,
  size: ComponentSize,
  cache: MeasureCache,
): void {
  cache.set(comp.id, {
    size,
    contentHash: computeContentHash(comp),
  });
}

/** 递归查找并失效组件及其所有祖先容器（子组件大小变化影响父布局） */
export function invalidateMeasureCache(
  componentId: number,
  cache: MeasureCache,
  components: Component[],
): void {
  cache.delete(componentId);
  findParentAndInvalidate(components, componentId, cache);
}

function findParentAndInvalidate(
  comps: Component[],
  targetId: number,
  cache: MeasureCache,
): boolean {
  for (const comp of comps) {
    if (
      comp.children?.some(
        c => c.id === targetId || findParentAndInvalidate(comp.children!, targetId, cache),
      )
    ) {
      cache.delete(comp.id);
      return true;
    }
    if (comp.children?.length) {
      if (findParentAndInvalidate(comp.children, targetId, cache)) {
        cache.delete(comp.id);
        return true;
      }
    }
  }
  return comps.some(c => c.id === targetId);
}
