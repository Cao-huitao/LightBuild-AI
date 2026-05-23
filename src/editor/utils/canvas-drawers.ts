import type { Component } from '../stores/components';

const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function resolveText(value: any): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return String(value.value ?? '');
  }
  return String(value ?? '');
}

function toCSS(v: any): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof v.toHexString === 'function') return v.toHexString();
  return String(v ?? '');
}

function parseCSSPixel(value: any, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return fallback;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function applyShadow(ctx: CanvasRenderingContext2D, style: any) {
  if (!style) return;
  if (style.shadowX !== undefined || style.shadowY !== undefined) {
    ctx.shadowOffsetX = style.shadowX || 0;
    ctx.shadowOffsetY = style.shadowY || 0;
    ctx.shadowBlur = style.shadowBlur || 0;
    ctx.shadowColor = toCSS(style.shadowColor || 'rgba(0,0,0,0.2)');
  }
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

export interface ComponentSize {
  width: number;
  height: number;
  cw: number;
  ch: number;
  ox: number;
  oy: number;
}

export function measureComponent(
  component: Component,
  ctx: CanvasRenderingContext2D,
): ComponentSize {
  const s = component.props?.style || {};
  let cw: number;
  let ch: number;

  switch (component.name) {
    case 'Button': {
      const text = resolveText(component.props?.children) || '按钮';
      const fontSize = parseCSSPixel(s.fontSize, 14);
      ctx.font = `${fontSize}px ${FONT_FAMILY}`;
      const textWidth = ctx.measureText(text).width;
      cw = parseCSSPixel(s.width, textWidth + 30);
      ch = parseCSSPixel(s.height, 32);
      break;
    }
    case 'Input':
      cw = parseCSSPixel(s.width, 180);
      ch = parseCSSPixel(s.height, 32);
      break;
    case 'Text': {
      const text = resolveText(component.props?.children) || '文本';
      const fontSize = parseCSSPixel(s.fontSize, 14);
      ctx.font = `${fontSize}px ${FONT_FAMILY}`;
      const textWidth = ctx.measureText(text).width;
      cw = parseCSSPixel(s.width, textWidth + 4);
      ch = parseCSSPixel(s.height, fontSize * 1.4);
      break;
    }
    case 'Image':
      cw = parseCSSPixel(s.width, 200);
      ch = parseCSSPixel(s.height, 150);
      break;
    case 'Card': {
      const cs = measureCard(component, ctx);
      cw = cs.cw;
      ch = cs.ch;
      break;
    }
    case 'Space': {
      const ss = measureSpace(component, ctx);
      cw = ss.cw;
      ch = ss.ch;
      break;
    }
    default:
      cw = 100;
      ch = 32;
  }

  const ml = typeof s.marginLeft === 'number' ? s.marginLeft : 0;
  const mr = typeof s.marginRight === 'number' ? s.marginRight : 0;
  const mt = typeof s.marginTop === 'number' ? s.marginTop : 0;
  const mb = typeof s.marginBottom === 'number' ? s.marginBottom : 0;

  return { width: cw + ml + mr, height: ch + mt + mb, cw, ch, ox: ml, oy: mt };
}

function marginOf(style: any) {
  return {
    ml: typeof style?.marginLeft === 'number' ? style.marginLeft : 0,
    mr: typeof style?.marginRight === 'number' ? style.marginRight : 0,
    mt: typeof style?.marginTop === 'number' ? style.marginTop : 0,
    mb: typeof style?.marginBottom === 'number' ? style.marginBottom : 0,
  };
}

function measureSpace(
  component: Component,
  ctx: CanvasRenderingContext2D,
): ComponentSize {
  const children = component.children || [];
  const size = component.props?.size || 'middle';
  const gap = ({ small: 8, middle: 16, large: 24 } as Record<string, number>)[size] || 16;
  const padding = 16;

  if (children.length === 0) {
    return { width: 320, height: 200, cw: 320, ch: 200, ox: 0, oy: 0 };
  }

  let totalWidth = padding;
  let maxTotalH = 0;

  for (const child of children) {
    const cs = measureComponent(child, ctx);
    totalWidth += cs.width + gap;
    maxTotalH = Math.max(maxTotalH, cs.height);
  }

  totalWidth = totalWidth - gap + padding;
  return { width: totalWidth, height: maxTotalH + padding * 2, cw: totalWidth, ch: maxTotalH + padding * 2, ox: 0, oy: 0 };
}

function measureCard(
  component: Component,
  ctx: CanvasRenderingContext2D,
): ComponentSize {
  const children = component.children || [];
  const padding = 12;
  const titleHeight = 36;

  if (children.length === 0) {
    return { width: 260, height: 160, cw: 260, ch: 160, ox: 0, oy: 0 };
  }

  let maxChildWidth = 0;
  let totalChildHeight = 0;

  for (let i = 0; i < children.length; i++) {
    const cs = measureComponent(children[i], ctx);
    maxChildWidth = Math.max(maxChildWidth, cs.width);
    totalChildHeight += cs.height;
    if (i < children.length - 1) totalChildHeight += 8;
  }

  const h = titleHeight + totalChildHeight + padding * 2;
  return { width: Math.max(260, maxChildWidth + padding * 2), height: h, cw: Math.max(260, maxChildWidth + padding * 2), ch: h, ox: 0, oy: 0 };
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  props: any,
) {
  const s = props?.style || {};
  const { ml, mr, mt, mb } = marginOf(s);
  const cx = x + ml, cy = y + mt, cw = w - ml - mr, ch = h - mt - mb;
  const isPrimary = props?.type === 'primary';

  applyShadow(ctx, s);

  const bgColor = toCSS(s.backgroundColor || (isPrimary ? '#1677ff' : '#ffffff'));
  const borderRadius = parseCSSPixel(s.borderRadius, 6);

  drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  clearShadow(ctx);

  if (!isPrimary || parseCSSPixel(s.borderWidth, 0) > 0) {
    const bw = parseCSSPixel(s.borderWidth, isPrimary ? 0 : 1);
    if (bw > 0) {
      drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
      ctx.strokeStyle = toCSS(s.borderColor || '#d9d9d9');
      ctx.lineWidth = bw;
      ctx.stroke();
    }
  }

  const text = resolveText(props?.children) || '按钮';
  const fontSize = parseCSSPixel(s.fontSize, 14);
  const textColor = toCSS(s.color || (isPrimary ? '#ffffff' : 'rgba(0,0,0,0.88)'));

  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx + cw / 2, cy + ch / 2);
}

export function drawInput(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  props: any,
) {
  const s = props?.style || {};
  const { ml, mr, mt, mb } = marginOf(s);
  const cx = x + ml, cy = y + mt, cw = w - ml - mr, ch = h - mt - mb;
  const borderRadius = parseCSSPixel(s.borderRadius, 6);

  applyShadow(ctx, s);

  drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
  ctx.fillStyle = toCSS(s.backgroundColor || '#ffffff');
  ctx.fill();

  clearShadow(ctx);

  const bw = parseCSSPixel(s.borderWidth, 1);
  drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
  ctx.strokeStyle = toCSS(s.borderColor || '#d9d9d9');
  ctx.lineWidth = bw;
  ctx.stroke();

  const placeholder = props?.placeholder || '请输入...';
  const fontSize = parseCSSPixel(s.fontSize, 14);

  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#bfbfbf';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.save();
  drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
  ctx.clip();
  ctx.fillText(placeholder, cx + 12, cy + ch / 2);
  ctx.restore();
}

export function drawSpace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _props: any,
  isEmpty: boolean,
) {
  const s = _props?.style || {};
  const { ml, mr, mt, mb } = marginOf(s);
  const cx = x + ml, cy = y + mt, cw = w - ml - mr, ch = h - mt - mb;

  ctx.fillStyle = 'rgba(0,0,0,0.02)';
  ctx.fillRect(cx, cy, cw, ch);

  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(cx, cy, cw, ch);
  ctx.setLineDash([]);

  if (isEmpty) {
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#bfbfbf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('拖入组件到此处', cx + cw / 2, cy + ch / 2);
  }
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  props: any,
) {
  const s = props?.style || {};
  const { ml, mr, mt, mb } = marginOf(s);
  const cx = x + ml, cy = y + mt, cw = w - ml - mr, ch = h - mt - mb;
  const text = resolveText(props?.children) || '文本';
  const fontSize = parseCSSPixel(s.fontSize, 14);
  const textColor = toCSS(s.color || '#333333');
  const bgColor = toCSS(s.backgroundColor || 'transparent');
  const borderRadius = parseCSSPixel(s.borderRadius, 0);

  applyShadow(ctx, s);

  if (bgColor !== 'transparent') {
    if (borderRadius > 0) {
      drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
      ctx.fillStyle = bgColor;
      ctx.fill();
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(cx, cy, cw, ch);
    }
  }

  const bw = parseCSSPixel(s.borderWidth, 0);
  if (bw > 0) {
    if (borderRadius > 0) {
      drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
    } else {
      ctx.strokeRect(cx, cy, cw, ch);
    }
    ctx.strokeStyle = toCSS(s.borderColor || '#d9d9d9');
    ctx.lineWidth = bw;
    if (s.borderStyle === 'dashed') ctx.setLineDash([bw * 3, bw * 3]);
    else if (s.borderStyle === 'dotted') ctx.setLineDash([bw, bw]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  clearShadow(ctx);

  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const padX = bw > 0 ? bw + 2 : 2;
  const padY = (ch - fontSize) / 2;
  ctx.fillText(text, cx + padX, cy + Math.max(0, padY));
}

export function drawImage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  props: any,
  imageCache?: Map<string, HTMLImageElement>,
  onImageLoaded?: () => void,
) {
  const s = props?.style || {};
  const { ml, mr, mt, mb } = marginOf(s);
  const cx = x + ml, cy = y + mt, cw = w - ml - mr, ch = h - mt - mb;
  const rawSrc = props?.src;
  const url: string = typeof rawSrc === 'object' ? (rawSrc.value || '') : (typeof rawSrc === 'string' ? rawSrc : '');
  const borderRadius = parseCSSPixel(s.borderRadius, 4);
  const bgColor = toCSS(s.backgroundColor || '#f5f5f5');
  const borderColor = toCSS(s.borderColor || '#d9d9d9');
  const bw = parseCSSPixel(s.borderWidth, 1);

  let imageDrawn = false;
  if (url && imageCache) {
    const cached = imageCache.get(url);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      ctx.save();
      if (borderRadius > 0) {
        drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(cx, cy, cw, ch);
        ctx.clip();
      }
      ctx.drawImage(cached, cx, cy, cw, ch);
      ctx.restore();
      imageDrawn = true;
    } else if (!cached) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.set(url, img);
        onImageLoaded?.();
      };
      img.onerror = () => {
        imageCache.set(url, null as any);
        onImageLoaded?.();
      };
      img.src = url;
      imageCache.set(url, null as any);
    }
  }

  applyShadow(ctx, s);

  if (!imageDrawn) {
    drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
    ctx.fillStyle = bgColor;
    ctx.fill();
  }

  if (bw > 0) {
    drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = bw;
    if (s.borderStyle === 'dashed') ctx.setLineDash([bw * 3, bw * 3]);
    else if (s.borderStyle === 'dotted') ctx.setLineDash([bw, bw]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  clearShadow(ctx);

  if (!imageDrawn) {
    const iconSize = Math.min(cw, ch) * 0.18;
    ctx.font = `${iconSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#bfbfbf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖼', cx + cw / 2, cy + ch / 2 - 8);

    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillText('Image', cx + cw / 2, cy + ch / 2 + 14);
  }
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  props: any,
  isEmpty: boolean,
) {
  const s = props?.style || {};
  const { ml, mr, mt, mb } = marginOf(s);
  const cx = x + ml, cy = y + mt, cw = w - ml - mr, ch = h - mt - mb;
  const title = resolveText(props?.title) || '卡片标题';
  const borderRadius = parseCSSPixel(s.borderRadius, 8);
  const titleHeight = 36;
  const bgColor = toCSS(s.backgroundColor || '#ffffff');
  const borderColor = toCSS(s.borderColor || '#e8e8e8');
  const bw = parseCSSPixel(s.borderWidth, 1);
  const titleBg = toCSS(s.backgroundColor || '#fafafa');
  const titleTextColor = toCSS(s.color || '#333333');

  applyShadow(ctx, s);

  drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  if (bw > 0) {
    drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = bw;
    if (s.borderStyle === 'dashed') ctx.setLineDash([bw * 3, bw * 3]);
    else if (s.borderStyle === 'dotted') ctx.setLineDash([bw, bw]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  clearShadow(ctx);

  ctx.save();
  drawRoundRect(ctx, cx, cy, cw, titleHeight, borderRadius);
  ctx.clip();
  ctx.fillStyle = titleBg;
  ctx.fillRect(cx, cy, cw, titleHeight);
  ctx.strokeStyle = toCSS(s.borderColor || '#f0f0f0');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy + titleHeight);
  ctx.lineTo(cx + cw, cy + titleHeight);
  ctx.stroke();
  ctx.restore();

  if (bw > 0) {
    drawRoundRect(ctx, cx, cy, cw, ch, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = bw;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  const titleFontSize = parseCSSPixel(s.fontSize, 13);
  ctx.font = `${titleFontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = titleTextColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, cx + 12, cy + titleHeight / 2);

  if (isEmpty) {
    ctx.font = `11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#bfbfbf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('拖入组件到此处', cx + cw / 2, cy + titleHeight + (ch - titleHeight) / 2);
  }
}

export interface AlignmentGuide {
  type: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
  value: number;
  segStart: number;
  segEnd: number;
}

export function drawAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  guides: AlignmentGuide[],
) {
  if (!guides.length) return;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  for (const g of guides) {
    const isH = g.type === 'left' || g.type === 'right' || g.type === 'centerX';
    if (isH) {
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.8)';
      ctx.beginPath();
      ctx.moveTo(g.value, g.segStart);
      ctx.lineTo(g.value, g.segEnd);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.8)';
      ctx.beginPath();
      ctx.moveTo(g.segStart, g.value);
      ctx.lineTo(g.segEnd, g.value);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number,
) {
  const hs = 7 / zoom;
  const hh = hs / 2;
  const points = [
    { x: x, y: y },           // nw
    { x: x + w / 2, y: y },   // n
    { x: x + w, y: y },       // ne
    { x: x + w, y: y + h / 2 }, // e
    { x: x + w, y: y + h },   // se
    { x: x + w / 2, y: y + h }, // s
    { x: x, y: y + h },       // sw
    { x: x, y: y + h / 2 },   // w
  ];
  for (const p of points) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x - hh, p.y - hh, hs, hs);
    ctx.strokeStyle = 'rgb(66, 133, 244)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(p.x - hh, p.y - hh, hs, hs);
  }
}

export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const pad = 2;
  ctx.fillStyle = 'rgba(66, 133, 244, 0.15)';
  ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);

  ctx.strokeStyle = 'rgb(66, 133, 244)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  transform: { panX: number; panY: number; zoom: number },
  canvasW: number,
  canvasH: number,
) {
  const BASE_GRID = 20;
  const lodLevel = Math.round(Math.log2(transform.zoom));
  const gridSize = BASE_GRID * Math.pow(2, -lodLevel);

  const worldLeft = -transform.panX;
  const worldTop = -transform.panY;
  const worldRight = canvasW / transform.zoom - transform.panX;
  const worldBottom = canvasH / transform.zoom - transform.panY;

  const startX = Math.floor(worldLeft / gridSize) * gridSize;
  const startY = Math.floor(worldTop / gridSize) * gridSize;

  const dotRadius = Math.max(0.5, gridSize * 0.04);

  for (let gx = startX; gx <= worldRight; gx += gridSize) {
    for (let gy = startY; gy <= worldBottom; gy += gridSize) {
      ctx.fillStyle = transform.zoom < 0.5 ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(gx - dotRadius, gy - dotRadius, dotRadius * 2, dotRadius * 2);
    }
  }
}
