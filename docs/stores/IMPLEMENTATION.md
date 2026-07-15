# 状态管理模块 - 实现文档

## 一、模块概述

状态管理模块使用 **Zustand** 作为状态管理库，包含四个核心 store：

| Store | 文件 | 职责 |
|-------|------|------|
| components | `stores/components.ts` | 组件树、选中状态、编辑/预览模式 |
| variable | `stores/variable.ts` | 变量定义（名称、默认值、备注） |
| page-data | `stores/page-data.ts` | 运行时数据存储 |
| datasource | `stores/datasource.ts` | 数据源配置管理 |

---

## 二、components Store

### 2.1 状态结构

**文件**: `src/editor/stores/components.ts` (第3-18行)

```typescript
export interface Component {
  id: number;
  name: string;
  props: any;
  children?: Component[];
  x?: number;
  y?: number;
}

interface State {
  components: Component[];      // 组件树
  selectedComponentIds: number[]; // 选中的组件ID列表
  mode: 'edit' | 'preview';    // 编辑/预览模式
  history: Component[][];      // 历史记录栈（用于撤销）
  future: Component[][];       // 未来记录栈（用于重做）
}
```

### 2.2 动作定义

**文件**: `src/editor/stores/components.ts` (第20-36行)

| 动作 | 签名 | 说明 |
|------|------|------|
| `addComponent` | `(component, parentId?, index?)` | 添加组件 |
| `selectComponent` | `(id)` | 选择单个组件 |
| `toggleSelectComponent` | `(id)` | 切换组件选中状态 |
| `selectComponents` | `(ids)` | 选择多个组件 |
| `clearSelection` | `()` | 清除选择 |
| `updateComponentProps` | `(componentId, props)` | 更新组件属性 |
| `updateComponentPosition` | `(componentId, x, y)` | 更新组件位置 |
| `updateComponentStyles` | `(componentId, styles)` | 更新组件样式 |
| `deleteComponent` | `(componentId)` | 删除组件 |
| `deleteSelectedComponents` | `()` | 删除选中组件 |
| `copyComponent` | `(componentId)` | 复制组件 |
| `moveComponent` | `(componentId, direction)` | 上下移动组件 |
| `undo` | `()` | 撤销操作 |
| `redo` | `()` | 重做操作 |
| `setMode` | `(mode)` | 设置编辑/预览模式 |

### 2.3 核心实现

#### 2.3.1 添加组件

**文件**: `src/editor/stores/components.ts` (第201-207行)

```typescript
addComponent: (component, parentId, index) =>
  set((state) => {
    const newComponents = addComponentRecursively(state.components, component, parentId, index);
    return recordMutation(state, newComponents);
  }),
```

**辅助函数** `addComponentRecursively`（第48-71行）：
- 支持添加到根级别或指定父组件下
- 支持指定插入位置（index）

#### 2.3.2 更新组件属性

**文件**: `src/editor/stores/components.ts` (第231-236行)

```typescript
updateComponentProps: (componentId, props) =>
  set((state) => {
    const newComponents = updateComponentPropsRecursively(state.components, componentId, props);
    return recordMutation(state, newComponents);
  }),
```

**辅助函数** `updateComponentPropsRecursively`（第100-115行）：
- 递归遍历组件树
- 找到目标组件后合并新属性

#### 2.3.3 删除组件

**文件**: `src/editor/stores/components.ts` (第243-252行)

```typescript
deleteComponent: (componentId) =>
  set((state) => {
    const newComponents = removeComponentRecursively(state.components, componentId);
    return {
      ...recordMutation(state, newComponents),
      selectedComponentIds: state.selectedComponentIds.filter((id) => id !== componentId),
    };
  }),
```

#### 2.3.4 复制组件

**文件**: `src/editor/stores/components.ts` (第257-285行)

```typescript
copyComponent: (componentId) =>
  set((state) => {
    const component = findComponentById(state.components, componentId);
    if (!component) return {};

    const cloned = cloneComponentTree(component);
    // ... 处理插入位置
    return recordMutation(state, newComponents);
  }),
```

**辅助函数** `cloneComponentTree`（第200-215行）：
- 递归克隆组件树
- 生成新的唯一ID

#### 2.3.5 撤销/重做

**文件**: `src/editor/stores/components.ts` (第288-310行)

```typescript
undo: () =>
  set((state) => {
    if (state.history.length === 0) return {};
    const previous = state.history[state.history.length - 1];
    return {
      components: previous,
      history: state.history.slice(0, -1),
      future: [state.components, ...state.future],
    };
  }),

redo: () =>
  set((state) => {
    if (state.future.length === 0) return {};
    const next = state.future[0];
    return {
      components: next,
      history: [...state.history, state.components],
      future: state.future.slice(1),
    };
  }),
```

### 2.4 辅助函数

| 函数 | 位置 | 功能 |
|------|------|------|
| `recordMutation` | 第40-46行 | 记录操作历史 |
| `addComponentRecursively` | 第48-71行 | 递归添加组件 |
| `updateComponentPropsRecursively` | 第100-115行 | 递归更新属性 |
| `removeComponentRecursively` | 第139-150行 | 递归删除组件 |
| `moveComponentRecursively` | 第152-180行 | 递归移动组件 |
| `findComponentById` | 第182-196行 | 递归查找组件 |
| `cloneComponentTree` | 第200-215行 | 递归克隆组件树 |

---

## 三、variable Store

### 3.1 状态结构

**文件**: `src/editor/stores/variable.ts` (第3-51行)

```typescript
export interface Variable {
  name: string;         // 变量名（唯一标识）
  defaultValue: string; // 默认值
  remark: string;       // 备注说明
}

interface State {
  variables: Variable[];
}

interface Action {
  setVariables: (variables: Variable[]) => void;
  addVariable: (variable: Variable) => void;
  removeVariable: (name: string) => void;
  updateVariable: (name: string, variable: Partial<Variable>) => void;
}
```

### 3.2 动作实现

**文件**: `src/editor/stores/variable.ts` (第53-71行)

```typescript
export const useVariablesStore = create<State & Action>((set) => ({
  variables: [],
  
  setVariables: (variables) => set({ variables }),
  
  addVariable: (variable) => set((state) => ({
    variables: [...state.variables, variable],
  })),
  
  removeVariable: (name) => set((state) => ({
    variables: state.variables.filter((v) => v.name !== name),
  })),
  
  updateVariable: (name, variable) => set((state) => ({
    variables: state.variables.map((v) =>
      v.name === name ? { ...v, ...variable } : v
    ),
  })),
}));
```

---

## 四、page-data Store

### 4.1 状态结构

**文件**: `src/editor/stores/page-data.ts` (第1-27行)

```typescript
interface State {
  data: any;  // 运行时数据存储（key-value）
}

interface Action {
  setData: (key: string, value: any) => void;  // 设置变量值
  resetData: () => void;                        // 重置数据
}
```

### 4.2 动作实现

```typescript
export const usePageDataStore = create<State & Action>((set) => ({
  data: {},
  setData: (key, value) =>
    set((state) => ({ data: { ...state.data, [key]: value } })),
  resetData: () => set({ data: {} }),
}));
```

---

## 五、datasource Store

### 5.1 状态结构

**文件**: `src/editor/stores/datasource.ts`

```typescript
export interface DataSource {
  id: string;           // 数据源ID
  name: string;         // 数据源名称
  method: string;       // 请求方法（GET/POST/PUT/DELETE）
  url: string;          // API地址
  headers: string;      // 请求头（JSON字符串）
  body: string;         // 请求体（JSON字符串）
  responseMapping: string; // 响应映射路径
}

interface State {
  dataSources: DataSource[];
}

interface Action {
  addDataSource: (dataSource: DataSource) => void;
  removeDataSource: (id: string) => void;
  updateDataSource: (id: string, dataSource: Partial<DataSource>) => void;
}
```

---

## 六、组合 Hook

### 6.1 useSelectedComponent

**文件**: `src/editor/stores/components.ts` (第358-366行)

```typescript
export const useSelectedComponent = () => {
  const components = useComponents((state) => state.components);
  const selectedComponentIds = useComponents((state) => state.selectedComponentIds);

  if (selectedComponentIds.length === 0) return null;
  return findComponentById(components, selectedComponentIds[0]);
};
```

### 6.2 useSelectedComponents

**文件**: `src/editor/stores/components.ts` (第368-372行)

```typescript
export const useSelectedComponents = () => {
  const components = useComponents((state) => state.components);
  const selectedComponentIds = useComponents((state) => state.selectedComponentIds);
  return selectedComponentIds.map((id) => findComponentById(components, id)).filter(Boolean) as Component[];
};
```

---

## 七、使用示例

### 7.1 添加组件

```typescript
import { useComponents } from './stores/components';

const addComponent = useComponents((state) => state.addComponent);

addComponent({
  id: Date.now(),
  name: 'Button',
  props: { children: { type: 'static', value: '点击' } },
  x: 100,
  y: 100,
});
```

### 7.2 更新组件属性

```typescript
const updateComponentProps = useComponents((state) => state.updateComponentProps);

updateComponentProps(componentId, {
  onClick: {
    type: 'setVariable',
    config: { variable: 'username', value: 'hello' },
  },
});
```

### 7.3 设置变量值

```typescript
import { usePageDataStore } from './stores/page-data';

const setData = usePageDataStore((state) => state.setData);

setData('username', 'hello');
```

### 7.4 读取变量值

```typescript
const data = usePageDataStore((state) => state.data);

const username = data['username'] || 'default';
```

---

## 八、与其他模块的交互

### 8.1 与渲染器的交互

```
┌─────────────────────────────────────────────────────────────┐
│                    状态管理与渲染器交互                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  useComponents ──────→ UnifiedRenderer ──────→ 渲染组件树    │
│        │                      │                             │
│        │ 更新组件属性         │ 读取组件配置                  │
│        ↓                      ↓                             │
│  components store ←───── formatProps()                      │
│        │                      │                             │
│        │                      │ 触发事件                     │
│        │                      ↓                             │
│        │              handleEvent() ──────→ setData()       │
│        │                      │                             │
│        │                      ↓                             │
│        │              page-data store ←───── 存储变量值      │
│        │                      │                             │
│        │                      ↓                             │
│        │              formatProps() ←───── 读取变量值        │
│        │                      │                             │
│        └──────────────────────┘                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 与属性面板的交互

```
属性面板修改 → updateComponentProps() → components store 更新 → 组件重渲染
```

---

## 九、关键设计特点

| 特点 | 说明 |
|------|------|
| **集中式状态** | 所有状态集中管理，便于调试和追踪 |
| **不可变更新** | 使用不可变方式更新状态，支持时间旅行 |
| **递归操作** | 组件树操作采用递归方式，支持任意嵌套深度 |
| **历史记录** | 支持撤销/重做操作，提升用户体验 |
| **类型安全** | 使用 TypeScript 接口定义，提供类型检查 |
