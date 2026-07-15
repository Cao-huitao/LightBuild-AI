
# 画布拖拽与渲染 - 逻辑文档

## 一、架构概览

### 1.1 双轨画布架构

项目采用 Canvas + DOM 双轨渲染架构：

| 模式 | 文件 | 渲染方式 | 用途 |
|------|------|---------|------|
| Canvas 画布 | `src/editor/layouts/stage/CanvasStage.tsx` | HTML5 Canvas API | 编辑模式主画布 |
| DOM 画布 | `src/editor/layouts/stage/edit.tsx` | React 组件 | 编辑模式辅助渲染 |

---

## 二、核心文件索引

| 文件路径 | 行数 | 主要功能 |
|---------|------|---------|
| `src/editor/layouts/stage/CanvasStage.tsx` | 650 | Canvas 画布主逻辑、拖拽处理 |
| `src/editor/utils/canvas-renderer.ts` | 260 | Canvas 渲染函数 |
| `src/editor/utils/canvas-drawers.ts` | 600+ | 组件绘制函数库 |
| `src/editor/utils/coords.ts` | 37 | 坐标转换函数 |
| `src/editor/hooks/useCanvasTransform.ts` | 52 | 视口变换 Hook |
| `src/editor/common/component-item.tsx` | 87 | 物料区拖拽项 |

---

## 三、拖拽系统详解

### 3.1 拖拽类型分类

| 拖拽模式 | 触发方式 | 对应状态 type |
|---------|---------|--------------|
| 外部拖拽 | 从物料区拖入 | react-dnd |
| 内部移动 | 点击组件拖动 | `'move'` |
| 组件调整 | 拖动调整手柄 | `'resize'` |
| 画布平移 | 中键 / 空格 + 左键 | `'pan'` |
| 框选 | 空白处拖动 | `'boxSelect'` |

### 3.2 拖拽状态机定义

**文件**：`src/editor/layouts/stage/CanvasStage.tsx` (第95-114行)

```typescript
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
```

**字段说明**：
| 字段 | 含义 |
|------|------|
| `type` | 当前拖拽模式 |
| `startScreenX/Y` | 鼠标起始屏幕坐标 |
| `startPanX/Y` | 平移起始位置 |
| `componentId` | 目标组件 ID |
| `startCompX/Y` | 组件起始世界坐标 |
| `baseX/Y` | 组件相对父元素坐标 |
| `targets` | 多选目标列表 |

### 3.3 外部拖拽流程（物料区 → 画布）

#### 3.3.1 物料区拖拽源

**文件**：`src/editor/common/component-item.tsx` (第16-87行)

**核心 Hook**：`useDrag` (第41-69行) - 来自 `react-dnd` 库

```typescript
const [{ isDragging }, drag] = useDrag(() => ({
  type: name,           // 拖拽类型标识：'Button'/'Space'/'Input' 等
  item: { type: name }, // 拖拽传递数据
  end: (item, monitor) => {
    const dropResult = monitor.getDropResult() as DropResult;
    
    const newComponent = {
      id: Date.now(),
      name: item.type,
      props: getDefaultProps(item.type),
    };
    
    const parentId = dropResult?.id !== undefined ? dropResult.id : undefined;
    const insertIndex = dropResult?.index;
    
    addComponent(newComponent, parentId, insertIndex);  // 来源：useComponents store
    selectComponent(newId);
  },
  collect: (monitor) => ({ isDragging: monitor.isDragging() }),
}), [name, addComponent, selectComponent]);
```

**调用的 Store 方法**：
- `addComponent()` → `src/editor/stores/components.ts` (第201-238行)
- `selectComponent()` → `src/editor/stores/components.ts` (第168-181行)

#### 3.3.2 画布放置目标

**文件**：`src/editor/layouts/stage/CanvasStage.tsx` (第181-256行)

**核心 Hook**：`useDrop` (第181-256行) - 来自 `react-dnd` 库

```typescript
const [{ isOver }, dropRef] = useDrop(() => ({
  accept: ACCEPT_TYPES,  // 接受类型数组：['Button','Space','Input'...] (第83行)
  
  hover: (_item, monitor) => {
    const offset = monitor.getClientOffset();
    const rect = canvasRef.current.getBoundingClientRect();
    
    // 坐标转换：屏幕 → 世界
    const world = screenToWorld(offset.x, offset.y, rect, transformRef.current);
    // 来源：src/editor/utils/coords.ts (第7-19行)
    
    // 点击检测
    const hitId = hitTest(components, world.x, world.y, ctx);
    // 来源：src/editor/utils/canvas-renderer.ts (第171-182行)
    
    const hitComp = findComponentById(components, hitId);
    // 来源：src/editor/utils/canvas-renderer.ts (第244-254行)
    
    const isContainer = hitComp?.name === 'Space' || hitComp?.name === 'Card';
    
    if (hitComp && isContainer) {
      const abs = getAbsolutePosition(components, hitId, ctx);
      // 来源：src/editor/utils/canvas-renderer.ts (第256-276行)
      const cs = measureComponent(hitComp, ctx);
      // 来源：src/editor/utils/canvas-drawers.ts (第76-133行)
      
      // 计算插入位置
      let insertionRef = { x, y, length, horizontal };
    }
    
    setRenderTick((tick) => tick + 1);
  },
  
  drop: (_item, monitor) => {
    const offset = monitor.getClientOffset();
    const rect = canvasRef.current.getBoundingClientRect();
    const world = screenToWorld(offset.x, offset.y, rect, transformRef.current);
    
    const hitId = hitTest(components, world.x, world.y, ctx);
    const is = insertionStateRef.current;
    
    insertionRef.current = null;
    insertionStateRef.current = null;
    
    if (hitId !== null && is && is.containerId === hitId) {
      return { id: hitId, index: is.index, x: Math.round(world.x), y: Math.round(world.y) };
    }
    
    return { x: Math.round(world.x), y: Math.round(world.y) };
  },
  
  collect: (monitor) => ({ isOver: monitor.isOver() }),
}), [components]);
```

### 3.4 内部拖拽流程（组件移动）

#### 3.4.1 鼠标按下 - 状态初始化

**文件**：`src/editor/layouts/stage/CanvasStage.tsx` (第347-457行)

```typescript
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  
  // 模式1：画布平移（中键或空格+左键）
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
  
  // 模式2：左键点击
  if (e.button === 0) {
    const world = screenToWorld(e.clientX, e.clientY, rect, transformRef.current);
    const hitId = hitTest(components, world.x, world.y, ctx);
    
    if (hitId !== null) {
      // Shift 点击：多选切换
      if (e.shiftKey && hitId) {
        toggleSelectComponent(hitId);
        return;
      }
      
      const multiDrag = selectedIds.length > 1 && selectedIds.includes(hitId);
      if (!multiDrag && !selectedIds.includes(hitId)) {
        selectComponent(hitId);
      }
      
      const hitComp = findComponentById(components, hitId);
      
      // 检测是否点击调整手柄
      const handle = !multiDrag ? hitTestHandle(hitComp!, world.x, world.y, ctx) : null;
      // 来源：第317-344行
      
      if (handle) {
        // 调整大小模式
        const abs = getAbsolutePosition(components, hitId, ctx);
        const size = measureComponent(hitComp!, ctx);
        dragStateRef.current = {
          type: 'resize',
          handle,
          startScreenX: e.clientX,
          startScreenY: e.clientY,
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
        // 移动模式（支持多选）
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
        
        dragStateRef.current = {
          type: 'move',
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          componentId: hitId,
          targets,
        };
      }
    } else {
      // 空白处点击
      if (e.shiftKey) return;
      clearSelection();
      
      // 框选模式
      dragStateRef.current = {
        type: 'boxSelect',
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startCompX: world.x,
        startCompY: world.y,
      };
    }
  }
}, [components, selectComponent, selectedIds, toggleSelectComponent, clearSelection, selectComponents]);
```

**调用的 Store 方法**：
- `toggleSelectComponent()` → `src/editor/stores/components.ts` (第183-199行)
- `selectComponents()` → `src/editor/stores/components.ts` (第151-166行)
- `clearSelection()` → `src/editor/stores/components.ts` (第145-149行)

#### 3.4.2 鼠标移动 - 实时预览

**文件**：`src/editor/layouts/stage/CanvasStage.tsx` (第460-545行)

```typescript
useEffect(() => {
  const onMouseMove = (e: MouseEvent) => {
    const ds = dragStateRef.current;
    
    // 情况1：平移模式
    if (ds.type === 'pan') {
      const dx = e.clientX - ds.startScreenX;
      const dy = e.clientY - ds.startScreenY;
      const t = transformRef.current;
      
      setTransform({ 
        panX: ds.startPanX + dx / t.zoom, 
        panY: ds.startPanY + dy / t.zoom, 
        zoom: t.zoom 
      });
      // 来源：useCanvasTransform hook
    }
    
    // 情况2：移动模式
    else if (ds.type === 'move' && ds.componentId !== undefined) {
      const t = transformRef.current;
      const dx = (e.clientX - ds.startScreenX) / t.zoom;
      const dy = (e.clientY - ds.startScreenY) / t.zoom;
      
      const targets = ds.targets ?? [
        { componentId: ds.componentId, startCompX: ds.startCompX ?? 0, 
          startCompY: ds.startCompY ?? 0, baseX: ds.baseX ?? 0, baseY: ds.baseY ?? 0 }
      ];
      
      // 更新拖拽预览
      dragPreviewRef.current = targets.map((tg) => ({
        componentId: tg.componentId,
        x: tg.startCompX + dx,
        y: tg.startCompY + dy,
      }));
      
      // 计算对齐参考线
      const dragComp = findComponentById(components, ds.componentId);
      if (dragComp && dragPreviewRef.current.length > 0) {
        const p0 = dragPreviewRef.current[0];
        alignmentRef.current = findAlignments(dragComp, p0.x, p0.y, components, ctx);
        // 来源：第13-81行
      }
      
      setRenderTick((tick) => tick + 1);
    }
    
    // 情况3：调整大小模式
    else if (ds.type === 'resize' && ds.componentId !== undefined && ds.handle) {
      const t = transformRef.current;
      const dx = (e.clientX - ds.startScreenX) / t.zoom;
      const dy = (e.clientY - ds.startScreenY) / t.zoom;
      
      const bw = ds.resizeBaseW ?? 100;
      const bh = ds.resizeBaseH ?? 32;
      const bx = ds.resizeBaseX ?? 0;
      const by = ds.resizeBaseY ?? 0;
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
        if (Math.abs(dx / bw) > Math.abs(dy / bh)) { 
          nw = Math.max(MIN, bw - dx); nh = nw / ratio; 
        } else { 
          nh = Math.max(MIN, bh - dy); nw = nh * ratio; 
        }
        nx = bx + bw - nw; ny = by + bh - nh;
      }
      if (h === 'se') {
        if (Math.abs(dx / bw) > Math.abs(dy / bh)) { 
          nw = Math.max(MIN, bw + dx); nh = nw / ratio; 
        } else { 
          nh = Math.max(MIN, bh + dy); nw = nh * ratio; 
        }
      }
      
      resizePreviewRef.current = { 
        componentId: ds.componentId, 
        x: nx, y: ny, w: nw, h: nh 
      };
      
      setRenderTick((tick) => tick + 1);
    }
    
    // 情况4：框选模式
    else if (ds.type === 'boxSelect') {
      const t = transformRef.current;
      const dx = (e.clientX - ds.startScreenX) / t.zoom;
      const dy = (e.clientY - ds.startScreenY) / t.zoom;
      const sx = ds.startCompX ?? 0;
      const sy = ds.startCompY ?? 0;
      
      selectionRectRef.current = {
        x: Math.min(sx, sx + dx),
        y: Math.min(sy, sy + dy),
        w: Math.abs(dx),
        h: Math.abs(dy),
      };
      
      setRenderTick((tick) => tick + 1);
    }
  };
  
  window.addEventListener('mousemove', onMouseMove);
  return () => window.removeEventListener('mousemove', onMouseMove);
}, [setTransform, updateComponentPosition, updateComponentStyles, components]);
```

#### 3.4.3 鼠标释放 - 提交状态

**文件**：`src/editor/layouts/stage/CanvasStage.tsx` (第547-621行)

```typescript
const onMouseUp = (_e: MouseEvent) => {
  const ds = dragStateRef.current;
  
  // 情况1：框选提交
  if (ds.type === 'boxSelect') {
    const sr = selectionRectRef.current;
    selectionRectRef.current = null;
    
    if (sr && sr.w > 2 && sr.h > 2) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const ids: number[] = [];
      
      function collectInRect(comps: Component[], px: number, py: number) {
        for (const comp of comps) {
          const cx = (comp.x ?? 0) + px;
          const cy = (comp.y ?? 0) + py;
          const sz = measureComponent(comp, ctx);
          
          if (cx >= sr.x && cy >= sr.y && 
              cx + sz.width <= sr.x + sr.w && 
              cy + sz.height <= sr.y + sr.h) {
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
    
    setRenderTick((tick) => tick + 1);
  }
  
  // 情况2：移动提交
  if (ds.type === 'move' && ds.componentId !== undefined) {
    const previews = dragPreviewRef.current;
    
    if (previews.length > 0) {
      const targets = ds.targets ?? [
        { componentId: ds.componentId, startCompX: ds.startCompX ?? 0, 
          startCompY: ds.startCompY ?? 0, baseX: ds.baseX ?? 0, baseY: ds.baseY ?? 0 }
      ];
      
      for (const tg of targets) {
        const pv = previews.find((p) => p.componentId === tg.componentId);
        if (pv && (pv.x !== tg.startCompX || pv.y !== tg.startCompY)) {
          const newX = tg.baseX + Math.round(pv.x) - tg.startCompX;
          const newY = tg.baseY + Math.round(pv.y) - tg.startCompY;
          updateComponentPosition(tg.componentId, newX, newY);
          // 来源：src/editor/stores/components.ts (第274-283行)
        }
      }
    }
    
    dragPreviewRef.current = [];
    setRenderTick((tick) => tick + 1);
  }
  
  // 情况3：调整大小提交
  else if (ds.type === 'resize' && ds.componentId !== undefined) {
    const rp = resizePreviewRef.current;
    
    if (rp && ds.handle) {
      const comp = findComponentById(components, ds.componentId);
      const oldX = ds.baseX ?? 0;
      const oldY = ds.baseY ?? 0;
      
      if (rp.x !== ds.resizeBaseX || rp.y !== ds.resizeBaseY) {
        const newX = oldX + Math.round(rp.x) - Math.round(ds.resizeBaseX ?? 0);
        const newY = oldY + Math.round(rp.y) - Math.round(ds.resizeBaseY ?? 0);
        updateComponentPosition(ds.componentId, newX, newY);
      }
      
      updateComponentStyles(ds.componentId, {
        width: Math.round(rp.w),
        height: Math.round(rp.h),
      });
      // 来源：src/editor/stores/components.ts (第285-301行)
    }
    
    resizePreviewRef.current = null;
    setRenderTick((tick) => tick + 1);
  }
  
  // 重置所有状态
  dragStateRef.current = {
    type: 'none', startScreenX: 0, startScreenY: 0, startPanX: 0, startPanY: 0,
  };
  alignmentRef.current = [];
  selectionRectRef.current = null;
};
```

### 3.5 对齐辅助线计算

**文件**：`src/editor/layouts/stage/CanvasStage.tsx` (第13-81行)

```typescript
const ALIGN_THRESHOLD = 5;  // 对齐阈值：5像素

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
```

### 3.6 调整手柄点击检测

**文件**：`src/editor/layouts/stage/CanvasStage.tsx` (第317-344行)

```typescript
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
```

---

## 四、渲染系统详解

### 4.1 整体渲染流程

**文件**：`src/editor/layouts/stage/CanvasStage.tsx` (第148-179行)

```typescript
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
  // 来源：src/editor/utils/canvas-renderer.ts (第39-80行)
}, [components, selectedIds, canvasSize, transform]);

// 状态驱动重渲染
useEffect(() => {
  doRender();
}, [doRender, renderTick]);
```

### 4.2 Canvas 渲染函数

**文件**：`src/editor/utils/canvas-renderer.ts` (第39-80行)

```typescript
export function renderCanvas(opts: RenderOptions) {
  const { 
    ctx, components, selectedComponentIds, transform, 
    canvasW, canvasH, dpr, dragPreview, resizePreview,
    insertionIndicator, selectionRect, alignmentGuides,
    imageCache, onImageLoaded 
  } = opts;
  
  // 步骤1：DPR 缩放 + 清空画布
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);
  
  // 步骤2：绘制网格
  drawGrid(ctx, transform, canvasW, canvasH);
  // 来源：src/editor/utils/canvas-drawers.ts
  
  // 步骤3：应用视口变换
  ctx.setTransform(
    transform.zoom * dpr,
    0,
    0,
    transform.zoom * dpr,
    transform.panX * transform.zoom * dpr,
    transform.panY * transform.zoom * dpr,
  );
  
  // 步骤4：递归渲染所有组件
  for (const comp of components) {
    renderComponent(
      ctx, comp, selectedComponentIds, dragPreview, 0, 0,
      imageCache, onImageLoaded, transform.zoom, resizePreview
    );
    // 来源：第82-169行
  }
  
  // 步骤5：绘制插入指示器
  if (insertionIndicator) {
    drawInsertionLine(
      ctx, insertionIndicator.x, insertionIndicator.y,
      insertionIndicator.length, insertionIndicator.horizontal
    );
    // 来源：src/editor/utils/canvas-drawers.ts
  }
  
  // 步骤6：绘制选择框
  if (selectionRect) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(66, 133, 244, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.fillStyle = 'rgba(66, 133, 244, 0.08)';
    ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.setLineDash([]);
  }
  
  // 步骤7：绘制对齐参考线
  if (alignmentGuides?.length) {
    drawAlignmentGuides(ctx, alignmentGuides);
    // 来源：src/editor/utils/canvas-drawers.ts
  }
  
  ctx.restore();
}
```

### 4.3 组件渲染函数

**文件**：`src/editor/utils/canvas-renderer.ts` (第82-169行)

```typescript
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
) {
  // 步骤1：计算位置
  let wx = (comp.x ?? 0) + parentX;
  let wy = (comp.y ?? 0) + parentY;
  
  // 步骤2：拖拽预览覆盖
  const dp = dragPreviews?.find((p) => p.componentId === comp.id);
  if (dp) {
    wx = dp.x;
    wy = dp.y;
  }
  
  // 步骤3：测量尺寸
  let size = measureComponent(comp, ctx);
  // 来源：src/editor/utils/canvas-drawers.ts (第76-133行)
  
  // 步骤4：调整大小预览覆盖
  if (resizePreview && resizePreview.componentId === comp.id) {
    const rp = resizePreview;
    const totalW = rp.w + size.ox + (size.width - size.cw - size.ox);
    const totalH = rp.h + size.oy + (size.height - size.ch - size.oy);
    size = { ...size, cw: rp.w, ch: rp.h, width: totalW, height: totalH };
    wx = rp.x;
    wy = rp.y;
  }
  
  // 步骤5：根据组件类型绘制
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
    case 'Card':
      drawCard(ctx, wx, wy, size.width, size.height, comp.props, !comp.children?.length);
      
      // 递归渲染 Card 子组件
      if (comp.children?.length) {
        const padding = 12;
        const titleHeight = 36;
        const gap = 8;
        let cy = wy + titleHeight + padding;
        
        for (const child of comp.children) {
          const childSize = measureComponent(child, ctx);
          renderComponent(
            ctx, child, selectedIds, dragPreviews, 
            wx + padding, cy, imageCache, onImageLoaded, zoom, resizePreview
          );
          cy += childSize.height + gap;
        }
      }
      break;
    case 'Space':
      drawSpace(ctx, wx, wy, size.width, size.height, comp.props, !comp.children?.length);
      
      // 递归渲染 Space 子组件（水平排列）
      if (comp.children?.length) {
        const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
        const spaceContentH = size.ch - SPACE_PAD * 2;
        let cx = wx + SPACE_PAD;
        const topY = wy + SPACE_PAD;
        
        for (const child of comp.children) {
          const childSize = measureComponent(child, ctx);
          const childCY = topY + (spaceContentH - childSize.ch) / 2 - childSize.oy;
          const childCYClamped = Math.max(topY, childCY);
          
          renderComponent(
            ctx, child, selectedIds, dragPreviews,
            cx, childCYClamped, imageCache, onImageLoaded, zoom, resizePreview
          );
          
          cx += childSize.width + gap;
        }
      }
      break;
  }
  
  // 步骤6：选中状态绘制（选择框 + 调整手柄）
  if (selectedIds.includes(comp.id)) {
    const sx = wx + size.ox, sy = wy + size.oy, sw = size.cw, sh = size.ch;
    drawSelectionBox(ctx, sx, sy, sw, sh);
    if (zoom) {
      drawResizeHandles(ctx, sx, sy, sw, sh, zoom);
    }
  }
}
```

### 4.4 点击检测函数

**文件**：`src/editor/utils/canvas-renderer.ts` (第171-242行)

```typescript
export function hitTest(
  components: Component[],
  worldX: number,
  worldY: number,
  ctx: CanvasRenderingContext2D,
): number | null {
  // 从后往前遍历（顶层组件优先）
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
  
  // 检查是否在组件范围内
  if (wx < compX || wx > compX + size.width || wy < compY || wy > compY + size.height) {
    return null;
  }
  
  // Space 子组件检测
  if (comp.name === 'Space' && comp.children?.length) {
    const gap = SPACE_GAPS[comp.props?.size || 'middle'] || 16;
    const spaceContentH = size.ch - SPACE_PAD * 2;
    const topY = compY + SPACE_PAD;
    
    const positions: Array<{ child: Component; cx: number; cy: number; w: number; h: number }> = [];
    let cx = compX + SPACE_PAD;
    
    for (const child of comp.children) {
      const childSize = measureComponent(child, ctx);
      const childCY = topY + (spaceContentH - childSize.ch) / 2 - childSize.oy;
      positions.push({ child, cx, cy: Math.max(topY, childCY), w: childSize.width, h: childSize.height });
      cx += childSize.width + gap;
    }
    
    // 从后往前检测
    for (let i = positions.length - 1; i >= 0; i--) {
      const p = positions[i];
      if (wx >= p.cx && wx <= p.cx + p.w && wy >= p.cy && wy <= p.cy + p.h) {
        const deep = hitTestComponent(p.child, wx, wy, ctx, p.cx, p.cy);
        return deep ?? p.child.id;
      }
    }
  }
  
  // Card 子组件检测
  if (comp.name === 'Card' && comp.children?.length) {
    const padding = 12;
    const titleHeight = 36;
    const gap = 8;
    
    const positions: Array<{ child: Component; cx: number; cy: number; w: number; h: number }> = [];
    let cy = compY + titleHeight + padding;
    
    for (const child of comp.children) {
      const childSize = measureComponent(child, ctx);
      positions.push({ child, cx: compX + padding, cy, w: childSize.width, h: childSize.height });
      cy += childSize.height + gap;
    }
    
    for (let i = positions.length - 1; i >= 0; i--) {
      const p = positions[i];
      if (wx >= p.cx && wx <= p.cx + p.w && wy >= p.cy && wy <= p.cy + p.h) {
        const deep = hitTestComponent(p.child, wx, wy, ctx, p.cx, p.cy);
        return deep ?? p.child.id;
      }
    }
  }
  
  return comp.id;
}
```

### 4.5 组件查找函数

**文件**：`src/editor/utils/canvas-renderer.ts` (第244-254行)

```typescript
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
```

### 4.6 绝对位置获取函数

**文件**：`src/editor/utils/canvas-renderer.ts` (第256-276行)

```typescript
export function getAbsolutePosition(
  components: Component[],
  id: number,
  ctx: CanvasRenderingContext2D,
): { x: number; y: number } | null {
  function findWithOffset(
    comps: Component[],
    offsetX: number,
    offsetY: number,
  ): { x: number; y: number; comp: Component } | null {
    for (const comp of comps) {
      if (comp.id === id) {
        return { x: (comp.x ?? 0) + offsetX, y: (comp.y ?? 0) + offsetY, comp };
      }
      if (comp.children?.length) {
        const size = measureComponent(comp, ctx);
        const childOffsetX = comp.name === 'Space' ? offsetX + 16 : 
                            comp.name === 'Card' ? offsetX + 12 : offsetX;
        const childOffsetY = comp.name === 'Space' ? offsetY + 16 : 
                            comp.name === 'Card' ? offsetY + 48 : offsetY;
        const found = findWithOffset(comp.children, childOffsetX, childOffsetY);
        if (found) return found;
      }
    }
    return null;
  }
  
  const result = findWithOffset(components, 0, 0);
  return result ? { x: result.x, y: result.y } : null;
}
```

---

## 五、坐标转换系统

### 5.1 坐标系定义

| 坐标系 | 说明 | 坐标范围 |
|--------|------|---------|
| 屏幕坐标 | 鼠标事件 clientX/clientY | 屏幕像素 |
| 画布坐标 | 相对画布的像素位置 | [0, canvasWidth] x [0, canvasHeight] |
| 世界坐标 | 画布内容的逻辑坐标 | 无限范围 |

### 5.2 屏幕 → 世界坐标转换

**文件**：`src/editor/utils/coords.ts` (第7-19行)

```typescript
export function screenToWorld(
  clientX: number,
  clientY: number,
  canvasRect: { left: number; top: number },
  transform: ViewTransform,
): { x: number; y: number } {
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;
  return {
    x: canvasX / transform.zoom - transform.panX,
    y: canvasY / transform.zoom - transform.panY,
  };
}
```

### 5.3 鼠标位置缩放（保持点不变）

**文件**：`src/editor/utils/coords.ts` (第21-33行)

```typescript
export function zoomAtPoint(
  transform: ViewTransform,
  canvasPoint: { x: number; y: number },
  newZoom: number,
): ViewTransform {
  const worldX = canvasPoint.x / transform.zoom - transform.panX;
  const worldY = canvasPoint.y / transform.zoom - transform.panY;
  return {
    panX: canvasPoint.x / newZoom - worldX,
    panY: canvasPoint.y / newZoom - worldY,
    zoom: newZoom,
  };
}
```

### 5.4 缩放限制

**文件**：`src/editor/utils/coords.ts` (第35-37行)

```typescript
export function clampZoom(zoom: number): number {
  return Math.max(0.1, Math.min(5.0, zoom));
}
```

---

## 六、视口变换 Hook

**文件**：`src/editor/hooks/useCanvasTransform.ts` (第1-52行)

```typescript
export function useCanvasTransform() {
  const transformRef = useRef<ViewTransform>({ panX: 0, panY: 0, zoom: 1 });
  const [transform, setTransformState] = useState<ViewTransform>({ panX: 0, panY: 0, zoom: 1 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const setTransform = useCallback((t: ViewTransform) => {
    transformRef.current = t;
    setTransformState(t);
  }, []);
  
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('wheel', handleWheel);
    }
    containerRef.current = node;
    if (node) {
      node.addEventListener('wheel', handleWheel, { passive: false });
    }
  }, []);
  
  const handleWheelRef = useRef<(e: WheelEvent) => void>();
  handleWheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = clampZoom(transformRef.current.zoom * delta);
    const newTransform = zoomAtPoint(transformRef.current, { x: canvasX, y: canvasY }, newZoom);
    transformRef.current = newTransform;
    setTransformState(newTransform);
  };
  
  function handleWheel(e: WheelEvent) {
    handleWheelRef.current?.(e);
  }
  
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);
  
  return { transform, setTransform, transformRef, setContainerRef };
}
```

---

## 七、完整流程时序图

### 7.1 外部拖拽时序

```
物料区拖拽                  Canvas画布                  Store
  │                          │                        │
  │── useDrag.begin()       │                        │
  │                          │                        │
  │── 鼠标移动──────────────→│ useDrop.hover()       │
  │                          │ screenToWorld()       │
  │                          │ hitTest()             │
  │                          │ findComponentById()   │
  │                          │ getAbsolutePosition() │
  │                          │ measureComponent()    │
  │                          │ 计算插入位置          │
  │                          │ setRenderTick()       │
  │                          │ renderCanvas()        │
  │                          │ 显示插入指示器        │
  │                          │                        │
  │── 鼠标释放──────────────→│ useDrop.drop()        │
  │                          │ 返回位置信息          │
  │←─────────────────────────│                        │
  │                          │                        │
  │── useDrag.end()─────────→│                        │
  │                          │ addComponent()────────→│
  │                          │ selectComponent()────→│
  │                          │                        │ 组件树更新
  │                          │                        │
  │                          │ renderCanvas()←───────│
  │                          │ 显示新组件            │
```

### 7.2 内部拖拽时序

```
鼠标按下                    鼠标移动                   鼠标释放
  │                          │                        │
  │── handleMouseDown()      │                        │
  │   screenToWorld()        │                        │
  │   hitTest()              │                        │
  │   确定拖拽模式            │                        │
  │   dragStateRef.xxx =     │                        │
  │                          │                        │
  │                          │── onMouseMove()       │
  │                          │   计算偏移量          │
  │                          │   dragPreviewRef.update() │
  │                          │   findAlignments()    │
  │                          │   setRenderTick()     │
  │                          │   renderCanvas()      │
  │                          │   实时绘制预览        │
  │                          │                        │
  │                          │                        │── onMouseUp()
  │                          │                        │   计算最终位置
  │                          │                        │   updateComponentPosition()
  │                          │                        │   updateComponentStyles()
  │                          │                        │   dragStateRef.reset()
  │                          │                        │   setRenderTick()
  │                          │                        │   renderCanvas()
  │                          │                        │   显示最终结果
```

---

## 八、依赖关系总览

```
CanvasStage.tsx
  ├─ react-dnd (useDrag, useDrop)
  ├─ useComponents store
  │   ├─ selectComponent()
  │   ├─ toggleSelectComponent()
  │   ├─ selectComponents()
  │   ├─ clearSelection()
  │   ├─ deleteSelectedComponents()
  │   ├─ updateComponentPosition()
  │   ├─ deleteComponent()
  │   └─ updateComponentStyles()
  ├─ useCanvasTransform hook
  └─ canvas-renderer.ts
      ├─ renderCanvas()
      ├─ renderComponent()
      ├─ hitTest()
      ├─ findComponentById()
      └─ getAbsolutePosition()
          └─ canvas-drawers.ts
              ├─ measureComponent()
              ├─ drawButton()
              ├─ drawInput()
              ├─ drawText()
              ├─ drawImage()
              ├─ drawCard()
              ├─ drawSpace()
              ├─ drawSelectionBox()
              ├─ drawResizeHandles()
              ├─ drawInsertionLine()
              ├─ drawAlignmentGuides()
              └─ drawGrid()
                  └─ coords.ts
                      ├─ screenToWorld()
                      ├─ zoomAtPoint()
                      └─ clampZoom()
```

