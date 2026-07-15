# 状态管理模块 - 原理文档

## 一、状态管理架构

### 1.1 整体设计

状态管理模块采用 **Zustand** 作为状态管理库，核心设计理念是：

1. **集中式状态**：将应用状态集中管理，便于调试和追踪
2. **响应式更新**：状态变化自动触发组件重新渲染
3. **不可变更新**：使用不可变数据结构，支持时间旅行
4. **模块化拆分**：按功能划分为多个独立 store

### 1.2 Store 职责划分

| Store | 职责 | 数据类型 |
|-------|------|---------|
| components | 组件树、选中状态、编辑模式 | 结构化数据（嵌套树） |
| variable | 变量定义元数据 | 列表数据 |
| page-data | 运行时状态值 | 键值对 |
| datasource | API 配置信息 | 列表数据 |

### 1.3 数据流向

```
用户操作 → Action → Store 更新 → 组件重渲染
    ↑                              │
    └──────────────────────────────┘
```

---

## 二、Zustand 工作原理

### 2.1 核心机制

Zustand 的核心是基于 **React Context + useSyncExternalStore** 的状态管理：

```typescript
const useStore = create((set, get) => ({
  state: initialState,
  action: (args) => set((state) => ({ ...state, /* updated */ })),
}));
```

**原理**：
1. `create` 函数创建一个 store，包含状态和动作
2. `set` 函数用于更新状态，触发订阅者重新渲染
3. `get` 函数用于获取当前状态

### 2.2 响应式订阅

组件通过选择器订阅特定状态：

```typescript
const components = useComponents((state) => state.components);
```

**原理**：
- 选择器返回的状态变化时，组件才会重新渲染
- 支持深度比较优化，避免不必要的重渲染

---

## 三、components Store 原理

### 3.1 状态结构设计

```typescript
interface State {
  components: Component[];      // 组件树
  selectedComponentIds: number[]; // 选中状态（支持多选）
  mode: 'edit' | 'preview';    // 模式切换
  history: Component[][];      // 撤销栈
  future: Component[][];       // 重做栈
}
```

**设计原理**：
- **组件树**：使用数组存储根级别组件，支持嵌套子组件
- **多选支持**：使用数组存储选中的组件ID，支持批量操作
- **时间旅行**：使用双栈实现撤销/重做功能

### 3.2 不可变更新原理

所有状态更新都采用不可变方式：

```typescript
set((state) => ({
  components: [...state.components, newComponent],
}));
```

**原理**：
- 创建新数组/对象，不修改原状态
- 便于追踪变化（引用比较）
- 支持时间旅行（历史状态不会被污染）

### 3.3 递归操作原理

组件树是嵌套结构，需要递归操作：

```typescript
function updateComponentPropsRecursively(components, componentId, props) {
  return components.map((component) => {
    if (component.id === componentId) {
      return { ...component, props: { ...component.props, ...props } };
    }
    if (component.children && component.children.length > 0) {
      return {
        ...component,
        children: updateComponentPropsRecursively(component.children, componentId, props),
      };
    }
    return component;
  });
}
```

**原理**：
- 使用 map 遍历数组，保持引用不变的元素
- 递归处理子组件，确保深度嵌套的组件也能被更新
- 返回新数组，保持不可变性

### 3.4 历史记录机制

#### 3.4.1 双栈结构

```
撤销操作：
history: [S0, S1, S2]  → 弹出 S2 → 作为当前状态
future: []             → 压入旧状态

重做操作：
history: [S0, S1]      → 压入当前状态
future: [S2]           → 弹出 S2 → 作为当前状态
```

#### 3.4.2 实现原理

```typescript
function recordMutation(state, components) {
  return {
    components,
    history: [...state.history, state.components],  // 保存当前状态到历史
    future: [],  // 清空重做栈（新操作后无法重做之前的操作）
  };
}
```

**原理**：
- 每次操作前保存当前状态到 history 栈
- 执行新操作后清空 future 栈（防止混乱）
- 撤销时从 history 弹出，压入 future
- 重做时从 future 弹出，压入 history

### 3.5 组件查找原理

```typescript
function findComponentById(components, componentId) {
  for (const component of components) {
    if (component.id === componentId) return component;
    if (component.children && component.children.length > 0) {
      const found = findComponentById(component.children, componentId);
      if (found) return found;
    }
  }
  return null;
}
```

**原理**：深度优先搜索（DFS）遍历组件树。

---

## 四、variable Store 原理

### 4.1 双轨数据管理

变量系统采用**双轨设计**：

| 轨道 | Store | 存储内容 | 更新时机 |
|------|-------|---------|---------|
| 定义层 | variable | 变量元数据（name、defaultValue、remark） | 编辑变量时 |
| 值层 | page-data | 运行时变量值 | 事件触发时 |

**设计原理**：
- **定义层**：静态配置，不随用户操作改变
- **值层**：动态状态，响应式更新

### 4.2 变量解析流程

```
属性绑定变量 → formatProps() 解析 → 从 page-data 读取值
                                      ↓
                          如果未设置则使用 defaultValue
```

**代码实现**：

```typescript
if (component.props[cur]?.type === 'variable') {
  const variableName = component.props[cur].value;
  const variable = variables.find((item) => item.name === variableName);
  prev[cur] = data[variableName] || variable?.defaultValue;
}
```

---

## 五、page-data Store 原理

### 5.1 运行时数据存储

```typescript
interface State {
  data: any;  // { [variableName]: value }
}
```

**原理**：
- 使用键值对存储运行时状态
- 支持任意类型的值（字符串、数字、对象等）
- 响应式更新，变化时触发组件重渲染

### 5.2 更新机制

```typescript
setData: (key, value) =>
  set((state) => ({ data: { ...state.data, [key]: value } })),
```

**原理**：
- 展开原 data 对象，添加/覆盖指定 key
- 保持其他 key 不变
- 返回新对象，触发响应式更新

---

## 六、数据流原理

### 6.1 完整数据流向

```
┌─────────────────────────────────────────────────────────────┐
│                      数据流向图                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 定义变量                                                 │
│     define-variable.tsx → addVariable() → variable store    │
│                                                             │
│  2. 配置事件                                                 │
│     event.tsx → updateComponentProps() → components store   │
│                                                             │
│  3. 触发事件                                                 │
│     renderer.tsx → handleEvent() → setData()                │
│                                      ↓                      │
│                               page-data store 更新          │
│                                      ↓                      │
│                               触发组件重渲染                 │
│                                      ↓                      │
│                    formatProps() 读取变量值                  │
│                                      ↓                      │
│                               UI 显示更新后的值              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 响应式链路

| 步骤 | 模块 | 机制 |
|------|------|------|
| 1 | `usePageDataStore` | 订阅 data 状态 |
| 2 | `setData()` | 更新状态 |
| 3 | Zustand | 通知所有订阅者 |
| 4 | `UnifiedRenderer` | 重新执行渲染函数 |
| 5 | `formatProps()` | 读取最新数据 |
| 6 | React | 更新 DOM |

---

## 七、性能优化原理

### 7.1 选择器优化

使用选择器只订阅需要的状态：

```typescript
// 只订阅 components，不订阅 selectedComponentIds
const components = useComponents((state) => state.components);
```

**原理**：
- 选择器返回的值变化时才触发重渲染
- 避免因无关状态变化导致的不必要渲染

### 7.2 批量更新

将多个状态更新合并为一次：

```typescript
set((state) => ({
  components: newComponents,
  history: [...state.history, state.components],
  future: [],
}));
```

**原理**：
- 一次 set 调用更新多个状态
- 只触发一次重渲染

### 7.3 不可变数据

使用不可变更新避免不必要的引用比较：

```typescript
const newComponents = [...state.components];  // 新数组引用
```

**原理**：
- React 可以通过引用比较快速判断是否需要更新
- 避免深度比较的性能开销

---

## 八、状态同步原理

### 8.1 编辑模式 vs 预览模式

```typescript
const mode = useComponents((state) => state.mode);

if (mode === 'edit') {
  elementProps['data-component-id'] = component.id;  // 添加编辑标记
}
```

**原理**：
- 编辑模式：添加 `data-component-id` 属性用于选中检测
- 预览模式：移除编辑相关属性，更接近生产环境

### 8.2 选中状态管理

```typescript
selectComponent: (id) => set({ selectedComponentIds: id != null ? [id] : [] }),
toggleSelectComponent: (id) =>
  set((state) => {
    const ids = state.selectedComponentIds.includes(id)
      ? state.selectedComponentIds.filter((i) => i !== id)
      : [...state.selectedComponentIds, id];
    return { selectedComponentIds: ids };
  }),
```

**原理**：
- 支持单选（selectComponent）和多选（toggleSelectComponent）
- 使用数组存储选中状态，便于批量操作

---

## 九、扩展性设计

### 9.1 添加新动作

```typescript
export const useComponents = create<State & Action>((set) => ({
  // ... 现有动作
  newAction: (args) => set((state) => ({ /* 更新逻辑 */ })),
}));
```

### 9.2 添加新 Store

```typescript
import { create } from 'zustand';

interface NewState { /* ... */ }
interface NewAction { /* ... */ }

export const useNewStore = create<NewState & NewAction>((set) => ({
  // ...
}));
```

---

## 十、与 React 的集成原理

### 10.1 Hook 模式

Zustand 使用 Hook 模式集成到 React：

```typescript
const components = useComponents((state) => state.components);
```

**原理**：
- Hook 在组件挂载时订阅状态
- 状态变化时触发组件重渲染
- 组件卸载时自动取消订阅

### 10.2 全局访问

通过 `getState()` 全局访问状态：

```typescript
const variables = useVariablesStore.getState().variables;
```

**原理**：
- 在非组件环境（如工具函数）中访问状态
- 不会触发响应式更新

---

## 总结

状态管理模块的核心原理：

1. **集中式状态**：所有状态集中管理，便于追踪和调试
2. **响应式更新**：基于 Zustand 的订阅机制，状态变化自动触发渲染
3. **不可变更新**：使用不可变数据结构，支持时间旅行
4. **递归操作**：组件树操作采用递归方式，支持任意嵌套深度
5. **双轨数据**：变量定义和变量值分离，静态配置与动态状态解耦
