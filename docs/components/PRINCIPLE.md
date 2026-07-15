# 组件模块 - 原理文档

## 一、组件系统设计原理

### 1.1 设计目标

组件系统的核心设计目标是实现**可视化配置**和**运行时渲染**的分离：

1. **配置与实现分离**：组件的配置信息（props、events）与具体实现解耦
2. **动态渲染**：根据配置动态生成 React 元素
3. **数据驱动**：支持变量绑定和响应式更新
4. **可扩展性**：便于添加新组件类型

### 1.2 核心设计模式

#### 1.2.1 工厂模式（Factory Pattern）

组件映射表 `ComponentMap` 作为工厂，根据组件名称动态创建实例：

```typescript
const ComponentMap: { [key: string]: any } = {
  Button: Button,
  Text: Text,
  // ...
};

// 使用
const Element = ComponentMap[component.name];
React.createElement(Element, props, children);
```

**原理**：通过字符串名称映射到实际组件类，实现配置驱动的组件创建。

#### 1.2.2 装饰器模式（Decorator Pattern）

在 `buildElementProps` 中，通过层层包装增强组件功能：

```typescript
function buildElementProps(component) {
  // 1. 格式化属性（解析变量绑定）
  const props = formatProps(component);
  
  // 2. 添加事件处理器
  const eventProps = handleEvent(component);
  
  // 3. 添加引用存储
  const elementProps = {
    ref: (ref) => { componentRefs.current[component.id] = ref; },
    ...props,
    ...eventProps,
    // ...
  };
  
  return elementProps;
}
```

**原理**：通过组合而非继承的方式，在运行时动态增强组件功能。

#### 1.2.3 观察者模式（Observer Pattern）

状态变化触发组件重新渲染：

```typescript
const data = usePageDataStore((state) => state.data);
// 当 data 变化时，组件自动重新渲染
```

**原理**：Zustand store 作为发布者，组件作为订阅者，状态变化时自动通知所有订阅者。

---

## 二、组件注册机制

### 2.1 类型系统

组件类型通过枚举定义，确保类型安全：

```typescript
export const ITEM_TYPE = {
  BUTTON: 'Button',
  TEXT: 'Text',
  // ...
};
```

**原理**：集中管理组件类型，避免魔法字符串，便于维护和扩展。

### 2.2 多重映射

组件系统使用三层映射：

| 映射层 | 作用 | 示例 |
|--------|------|------|
| `ITEM_TYPE` | 类型枚举 → 字符串标识 | `ITEM_TYPE.BUTTON → 'Button'` |
| `ComponentMap` | 字符串标识 → 组件类 | `'Button' → Button` |
| `componentEventMap` | 字符串标识 → 事件列表 | `'Button' → [{ name: 'onClick', ... }]` |

**原理**：通过多层映射实现灵活的组件扩展，新增组件只需添加映射关系。

---

## 三、组件属性解析原理

### 3.1 属性值类型系统

组件属性支持两种值类型：

| 类型 | 数据结构 | 解析方式 |
|------|---------|---------|
| static | `{ type: 'static', value: 'xxx' }` | 直接使用 value |
| variable | `{ type: 'variable', value: 'varName' }` | 从 page-data 读取 |

```typescript
function formatProps(component) {
  if (component.props[cur]?.type === 'static') {
    prev[cur] = component.props[cur].value;
  } else if (component.props[cur]?.type === 'variable') {
    const variableName = component.props[cur].value;
    prev[cur] = data[variableName] || variable?.defaultValue;
  }
}
```

**原理**：通过类型标记区分静态值和动态绑定，实现数据驱动的属性渲染。

### 3.2 响应式更新机制

当 `page-data` 变化时，组件自动重新渲染：

1. `usePageDataStore` 订阅 `data` 状态
2. `formatProps` 在每次渲染时读取最新数据
3. 数据变化 → 组件重新渲染 → 属性重新解析

**原理**：利用 React 的响应式系统，状态变化自动触发重新渲染。

---

## 四、事件系统原理

### 4.1 事件配置结构

事件配置采用两级结构：

```typescript
component.props = {
  onClick: {
    type: 'setVariable',
    config: {
      variable: 'username',
      value: 'hello'
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `type` | 动作类型（showMessage/setVariable/等） |
| `config` | 动作配置参数 |

### 4.2 事件处理流程

```
事件触发 → 读取配置 → 执行对应动作 → 更新状态 → 组件重渲染
```

**代码实现**（`handleEvent` 函数）：

```typescript
eventProps[event.name] = (e?: any) => {
  if (type === 'setVariable') {
    const { variable, value } = config;
    let finalValue = value;
    if (event.name === 'onChange' && e && e.target) {
      finalValue = e.target.value;  // 动态获取输入值
    }
    setData(variable, finalValue);
  }
};
```

**原理**：通过闭包捕获 `config` 和 `setData`，在事件触发时执行对应动作。

### 4.3 动态值获取

对于输入类组件，支持从事件对象获取实时值：

```typescript
if (event.name === 'onChange' && e && e.target) {
  finalValue = e.target.value;
}
```

**原理**：根据事件类型判断是否需要从事件对象中提取值，实现动态数据绑定。

---

## 五、子组件渲染原理

### 5.1 VOID_ELEMENTS 处理

`VOID_ELEMENTS`（Text、Input、Image）不支持嵌套子组件，但 Text 需要特殊处理：

```typescript
const VOID_ELEMENTS = ['Input', 'Text', 'Image'];

function renderChildren(component) {
  if (VOID_ELEMENTS.includes(component.name)) {
    if (component.name === 'Text' && component.props.children !== undefined) {
      // 解析 children 作为文本内容
      return resolveChildrenValue(component.props.children);
    }
    return null;
  }
  // ... 处理嵌套子组件
}
```

**原理**：区分"自闭合元素"和"容器元素"，Text 虽然在 VOID_ELEMENTS 中，但需要渲染文本内容。

### 5.2 递归渲染

容器组件（Space、Card）支持嵌套子组件：

```typescript
if (component.children && component.children.length > 0) {
  return renderComponents(component.children);
}
```

**原理**：通过递归调用 `renderComponents`，实现任意深度的组件嵌套。

---

## 六、组件引用管理原理

### 6.1 引用存储

使用 `useRef` 存储组件引用：

```typescript
const componentRefs = useRef<Record<number, any>>({});

// 在 buildElementProps 中
ref: (ref: any) => { componentRefs.current[component.id] = ref; }
```

**原理**：`useRef` 创建持久引用，在组件挂载时存储 DOM 或组件实例。

### 6.2 方法调用

通过引用调用组件方法：

```typescript
// 在 handleEvent 中
if (type === 'componentFunction') {
  const targetComponent = componentRefs.current[config.componentId];
  if (targetComponent) {
    targetComponent[config.method]?.();
  }
}
```

**原理**：利用 React ref 机制获取组件实例，直接调用其方法。

---

## 七、状态管理原理

### 7.1 状态结构

```typescript
interface State {
  components: Component[];      // 组件树
  selectedComponentIds: number[]; // 选中的组件ID
  mode: 'edit' | 'preview';    // 编辑/预览模式
  history: Component[][];      // 历史记录（用于撤销）
  future: Component[][];       // 未来记录（用于重做）
}
```

### 7.2 历史记录机制

每次操作前保存当前状态：

```typescript
function recordMutation(state, components) {
  return {
    components,
    history: [...state.history, state.components],
    future: [],
  };
}
```

**原理**：使用栈结构保存历史状态，支持撤销（弹出栈顶）和重做（推入栈）。

### 7.3 递归更新

组件树支持嵌套，更新操作需要递归遍历：

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

**原理**：通过递归遍历组件树，找到目标组件并更新其属性。

---

## 八、数据流原理

### 8.1 完整数据流

```
用户操作 → Action → Store 更新 → 组件重渲染
    ↑                              │
    └──────────────────────────────┘
```

### 8.2 变量数据流向

```
1. 定义变量 → variable store
         ↓
2. 配置事件 → components store（保存事件配置）
         ↓
3. 触发事件 → handleEvent() → setData() → page-data store
         ↓
4. 状态变化 → 组件重渲染 → formatProps() 读取变量值
         ↓
5. 显示更新 → UI 展示最新数据
```

### 8.3 响应式链路

| 步骤 | 模块 | 动作 |
|------|------|------|
| 1 | `event.tsx` | 用户配置事件 |
| 2 | `components.ts` | 更新组件 props |
| 3 | `renderer.tsx` | 渲染事件处理器 |
| 4 | `page-data.ts` | 存储运行时值 |
| 5 | `renderer.tsx` | 读取变量值渲染 |

**原理**：通过 Zustand 的响应式机制，状态变化自动传播到所有订阅组件。

---

## 九、扩展性设计

### 9.1 添加新组件的步骤

1. **定义类型**：在 `item-type.ts` 中添加组件类型
2. **实现组件**：在 `components/` 目录创建组件文件
3. **注册组件**：在 `ComponentMap` 中添加映射
4. **配置属性**：在 `attr.tsx` 中添加属性配置
5. **配置事件**：在 `componentEventMap` 中添加事件
6. **注册物料**：在 `material/index.tsx` 中添加物料项

### 9.2 设计原则

| 原则 | 说明 |
|------|------|
| **开闭原则** | 对扩展开放，对修改封闭 |
| **单一职责** | 每个组件只负责一个功能 |
| **依赖倒置** | 依赖抽象而非具体实现 |

---

## 十、性能优化策略

### 10.1 避免不必要的重渲染

使用 `useRef` 存储组件引用而非状态，避免触发重渲染：

```typescript
const componentRefs = useRef<Record<number, any>>({});
```

### 10.2 条件渲染优化

根据模式（edit/preview）决定是否添加编辑相关属性：

```typescript
if (mode === 'edit') {
  elementProps['data-component-id'] = component.id;
}
```

### 10.3 批量更新

通过 Zustand 的批量更新机制，减少渲染次数：

```typescript
set((state) => ({
  components: newComponents,
  history: [...state.history, state.components],
  future: [],
}));
```

---

## 十一、安全性考虑

### 11.1 脚本执行安全

执行脚本时使用沙箱环境，限制可访问的 API：

```typescript
function execScript(script) {
  const func = new Function('ctx', script);
  const ctx = { setData, getComponentRef };
  func(ctx);
}
```

**原理**：只暴露必要的 API，防止恶意脚本访问敏感数据。

### 11.2 输入验证

对用户输入进行验证，防止注入攻击：

```typescript
if (!variable) return;  // 空值检查
```

---

## 总结

组件系统的核心原理是：

1. **配置驱动**：通过配置描述组件，而非硬编码
2. **响应式**：状态变化自动触发渲染更新
3. **可扩展**：通过映射机制支持动态添加组件
4. **解耦**：配置、渲染、状态管理分离
