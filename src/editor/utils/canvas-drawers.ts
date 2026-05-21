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

export function measureComponent(
  component: Component,
  ctx: CanvasRenderingContext2D,
): { width: number; height: number } {
  const s = component.props?.style || {};

  switch (component.name) {
    case 'Button': {
      const text = resolveText(component.props?.children) || '按钮';
      const fontSize = parseCSSPixel(s.fontSize, 14);
      ctx.font = `${fontSize}px ${FONT_FAMILY}`;
      const textWidth = ctx.measureText(text).width;
      return {
        width: parseCSSPixel(s.width, textWidth + 30),
        height: parseCSSPixel(s.height, 32),
      };
    }
    case 'Input':
      return {
        width: parseCSSPixel(s.width, 180),
        height: parseCSSPixel(s.height, 32),
      };
    case 'Text': {
      const text = resolveText(component.props?.children) || '文本';
      const fontSize = parseCSSPixel(s.fontSize, 14);
      ctx.font = `${fontSize}px ${FONT_FAMILY}`;
      const textWidth = ctx.measureText(text).width;
      return {
        width: parseCSSPixel(s.width, textWidth + 4),
        height: parseCSSPixel(s.height, fontSize * 1.4),
      };
    }
    case 'Image':
      return {
        width: parseCSSPixel(s.width, 200),
        height: parseCSSPixel(s.height, 150),
      };
    case 'Card':
      return measureCard(component, ctx);
    case 'Space':
      return measureSpace(component, ctx);
    default:
      return { width: 100, height: 32 };
  }
}

function measureSpace(
  component: Component,
  ctx: CanvasRenderingContext2D,
): { width: number; height: number } {
  const children = component.children || [];
  const size = component.props?.size || 'middle';
  const gap = ({ small: 8, middle: 16, large: 24 } as Record<string, number>)[size] || 16;
  const padding = 16;

  if (children.length === 0) {
    return { width: 320, height: 200 };
  }

  let totalWidth = padding;
  let maxHeight = 0;

  for (const child of children) {
    const cs = measureComponent(child, ctx);
    totalWidth += cs.width + gap;
    maxHeight = Math.max(maxHeight, cs.height);
  }

  totalWidth = totalWidth - gap + padding;
  return { width: totalWidth, height: maxHeight + padding * 2 };
}

function measureCard(
  component: Component,
  ctx: CanvasRenderingContext2D,
): { width: number; height: number } {
  const children = component.children || [];
  const padding = 12;
  const titleHeight = 36;

  if (children.length === 0) {
    return { width: 260, height: 160 };
  }

  let maxChildWidth = 0;
  let totalChildHeight = 0;

  for (let i = 0; i < children.length; i++) {
    const cs = measureComponent(children[i], ctx);
    maxChildWidth = Math.max(maxChildWidth, cs.width);
    totalChildHeight += cs.height;
    if (i < children.length - 1) totalChildHeight += 8; // gap
  }

  return {
    width: Math.max(260, maxChildWidth + padding * 2),
    height: titleHeight + totalChildHeight + padding * 2,
  };
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
  const isPrimary = props?.type === 'primary';

  applyShadow(ctx, s);

  const bgColor = toCSS(s.backgroundColor || (isPrimary ? '#1677ff' : '#ffffff'));
  const borderRadius = parseCSSPixel(s.borderRadius, 6);

  drawRoundRect(ctx, x, y, w, h, borderRadius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  clearShadow(ctx);

  if (!isPrimary || parseCSSPixel(s.borderWidth, 0) > 0) {
    const bw = parseCSSPixel(s.borderWidth, isPrimary ? 0 : 1);
    if (bw > 0) {
      drawRoundRect(ctx, x, y, w, h, borderRadius);
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
  ctx.fillText(text, x + w / 2, y + h / 2);
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
  const borderRadius = parseCSSPixel(s.borderRadius, 6);

  applyShadow(ctx, s);

  drawRoundRect(ctx, x, y, w, h, borderRadius);
  ctx.fillStyle = toCSS(s.backgroundColor || '#ffffff');
  ctx.fill();

  clearShadow(ctx);

  const bw = parseCSSPixel(s.borderWidth, 1);
  drawRoundRect(ctx, x, y, w, h, borderRadius);
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
  drawRoundRect(ctx, x, y, w, h, borderRadius);
  ctx.clip();
  ctx.fillText(placeholder, x + 12, y + h / 2);
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
  ctx.fillStyle = 'rgba(0,0,0,0.02)';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  if (isEmpty) {
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#bfbfbf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('拖入组件到此处', x + w / 2, y + h / 2);
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
  const text = resolveText(props?.children) || '文本';
  const fontSize = parseCSSPixel(s.fontSize, 14);
  const textColor = toCSS(s.color || '#333333');
  const bgColor = toCSS(s.backgroundColor || 'transparent');
  const borderRadius = parseCSSPixel(s.borderRadius, 0);

  applyShadow(ctx, s);

  // Background
  if (bgColor !== 'transparent') {
    if (borderRadius > 0) {
      drawRoundRect(ctx, x, y, w, h, borderRadius);
      ctx.fillStyle = bgColor;
      ctx.fill();
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, w, h);
    }
  }

  // Border
  const bw = parseCSSPixel(s.borderWidth, 0);
  if (bw > 0) {
    if (borderRadius > 0) {
      drawRoundRect(ctx, x, y, w, h, borderRadius);
    } else {
      ctx.strokeRect(x, y, w, h);
    }
    ctx.strokeStyle = toCSS(s.borderColor || '#d9d9d9');
    ctx.lineWidth = bw;
    if (s.borderStyle === 'dashed') ctx.setLineDash([bw * 3, bw * 3]);
    else if (s.borderStyle === 'dotted') ctx.setLineDash([bw, bw]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  clearShadow(ctx);

  // Text
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const padX = bw > 0 ? bw + 2 : 2;
  const padY = (h - fontSize) / 2;
  ctx.fillText(text, x + padX, y + Math.max(0, padY));
}

export function drawImage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  props: any,
) {
  const s = props?.style || {};
  const borderRadius = parseCSSPixel(s.borderRadius, 4);
  const bgColor = toCSS(s.backgroundColor || '#f5f5f5');
  const borderColor = toCSS(s.borderColor || '#d9d9d9');
  const bw = parseCSSPixel(s.borderWidth, 1);

  applyShadow(ctx, s);

  // Background
  drawRoundRect(ctx, x, y, w, h, borderRadius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Border
  if (bw > 0) {
    drawRoundRect(ctx, x, y, w, h, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = bw;
    if (s.borderStyle === 'dashed') ctx.setLineDash([bw * 3, bw * 3]);
    else if (s.borderStyle === 'dotted') ctx.setLineDash([bw, bw]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  clearShadow(ctx);

  // Placeholder icon
  const iconSize = Math.min(w, h) * 0.18;
  ctx.font = `${iconSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#bfbfbf';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🖼', x + w / 2, y + h / 2 - 8);

  ctx.font = `12px ${FONT_FAMILY}`;
  ctx.fillText('Image', x + w / 2, y + h / 2 + 14);
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
  const title = resolveText(props?.title) || '卡片标题';
  const borderRadius = parseCSSPixel(s.borderRadius, 8);
  const titleHeight = 36;
  const bgColor = toCSS(s.backgroundColor || '#ffffff');
  const borderColor = toCSS(s.borderColor || '#e8e8e8');
  const bw = parseCSSPixel(s.borderWidth, 1);
  const titleBg = toCSS(s.color || '#fafafa');
  const titleTextColor = toCSS(s.color || '#333333');

  applyShadow(ctx, s);

  // Card background
  drawRoundRect(ctx, x, y, w, h, borderRadius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Border
  if (bw > 0) {
    drawRoundRect(ctx, x, y, w, h, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = bw;
    if (s.borderStyle === 'dashed') ctx.setLineDash([bw * 3, bw * 3]);
    else if (s.borderStyle === 'dotted') ctx.setLineDash([bw, bw]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  clearShadow(ctx);

  // Title bar background
  ctx.save();
  drawRoundRect(ctx, x, y, w, titleHeight, borderRadius);
  ctx.clip();
  ctx.fillStyle = titleBg;
  ctx.fillRect(x, y, w, titleHeight);
  ctx.strokeStyle = toCSS(s.color || '#f0f0f0');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + titleHeight);
  ctx.lineTo(x + w, y + titleHeight);
  ctx.stroke();
  ctx.restore();

  // Redraw border after title clip
  if (bw > 0) {
    drawRoundRect(ctx, x, y, w, h, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = bw;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  // Title text
  const titleFontSize = parseCSSPixel(s.fontSize, 13);
  ctx.font = `${titleFontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = titleTextColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + 12, y + titleHeight / 2);

  // Empty placeholder
  if (isEmpty) {
    ctx.font = `11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#bfbfbf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('拖入组件到此处', x + w / 2, y + titleHeight + (h - titleHeight) / 2);
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
