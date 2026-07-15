# 工具模块 - 原理文档

## 一、渲染器设计原理

### 1.1 核心设计目标

UnifiedRenderer 的核心目标是实现**配置驱动的组件渲染**：

1. **统一渲染**：编辑模式和预览模式共享同一渲染逻辑
2. **数据驱动**：组件属性支持静态值和变量绑定
3. **事件响应**：支持多种事件动作类型
4. **可扩展**：便于添加新组件和新动作

### 1.2 渲染流程

```
┌─────────────────────────────────────────────────────────────┐
│                    渲染流程                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  components store ──────→ renderComponents()                │
│          │                          │                        │
│          │                          ▼                        │
│          │                 buildElementProps()               │
│          │                          │                        │
│          │           ┌──────────────┴──────────────┐        │
│          │           ▼                             ▼        │
│          │    formatProps()                  handleEvent()  │
│          │           │                             │        │
│          │           ▼                             ▼        │
│          │    解析变量绑定                   创建事件处理器  │
│          │           │                             │        │
│          └───────────┴─────────────────────────────┘        │
│                                        │                    │
│                                        ▼                    │
│                              React.createElement()          │
│                                        │                    │
│                                        ▼                    │
│                              renderChildren()               │
│                                        │                    │
│                                        ▼                    │
│                              递归渲染子组件                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、属性格式化原理

### 2.1 属性值类型系统

组件属性支持两种值类型：

| 类型 | 数据结构 | 解析方式 |
|------|---------|---------|
| static | `{ type: 'static', value: 'xxx' }` | 直接使用 value |
| variable | `{ type: 'variable', value: 'varName' }` | 从 page-data 读取 |

**原理**：
- 通过类型标记区分静态值和动态绑定
- 静态值在配置时确定，动态值在运行时解析
- 支持响应式更新，变量值变化时自动重新渲染

### 2.2 变量解析流程

```typescript
function formatProps(component) {
  const variables = useVariablesStore.getState().variables;

  return Object.keys(component.props || {}).reduce((prev, cur) => {
    if (typeof component.props[cur] === 'object') {
      if (component.props[cur]?.type === 'static') {
        prev[cur] = component.props[cur].value;
      } else if (component.props[cur]?.type === 'variable') {
        const variableName = component.props[cur].value;
        const variable = variables.find((item) => item.name === variableName);
        prev[cur] = data[variableName] || variable?.defaultValue;
      }
    } else {
      prev[cur] = component.props[cur];
    }
    return prev;
  }, {});
}
```

**原理**：
1. 遍历组件的所有 props
2. 判断属性值类型
3. 对于 variable 类型，从 page-data 读取当前值
4. 如果 page-data 中没有，则使用变量的默认值
5. 返回格式化后的属性对象

### 2.3 响应式绑定

当 `page-data` 变化时，组件自动重新渲染：

```typescript
const data = usePageDataStore((state) => state.data);
```

**原理**：
- `usePageDataStore` 订阅 `data` 状态
- 状态变化时触发组件重新渲染
- `formatProps` 在每次渲染时重新解析变量绑定

---

## 三、事件处理原理

### 3.1 事件配置结构

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

**原理**：
- 使用嵌套对象存储事件配置
- `type` 字段标识动作类型
- `config` 字段存储动作参数

### 3.2 事件处理器创建

```typescript
function handleEvent(component) {
  const eventProps = {};

  componentEventMap[component.name].forEach((event) => {
    const eventConfig = component.props[event.name];
    if (!eventConfig) return;

    const { type, config } = eventConfig;

    eventProps[event.name] = (e) => {
      // 根据 type 执行不同动作
    };
  });

  return eventProps;
}
```

**原理**：
1. 遍历组件支持的事件列表
2. 检查组件是否配置了该事件
3. 创建事件处理器函数，闭包捕获 `config` 和 `setData`
4. 返回事件属性对象，用于绑定到组件

### 3.3 动作执行机制

#### 3.3.1 setVariable 动作

```typescript
} else if (type === 'setVariable') {
  const { variable, value } = config;
  if (!variable) return;

  let finalValue = value;
  if (event.name === 'onChange' && e && e.target) {
    finalValue = e.target.value;
  }
  setData(variable, finalValue);
}
```

**原理**：
- 对于输入类事件（如 onChange），从事件对象获取实时值
- 对于其他事件（如 onClick），使用配置中的静态值
- 调用 `setData` 更新 page-data

#### 3.3.2 componentFunction 动作

```typescript
} else if (type === 'componentFunction') {
  const targetComponent = componentRefs.current[config.componentId];
  if (targetComponent) {
    targetComponent[config.method]?.();
  }
}
```

**原理**：
- 通过组件 ID 从 `componentRefs` 获取组件引用
- 调用组件的指定方法
- 支持控制其他组件的行为（如按钮 loading）

#### 3.3.3 execScript 动作

```typescript
function execScript(script) {
  const func = new Function('ctx', script);
  const ctx = { setData, getComponentRef };
  func(ctx);
}
```

**原理**：
- 使用 `new Function` 动态创建函数
- 提供受限的上下文对象 `ctx`
- 允许用户编写自定义逻辑

#### 3.3.4 callDataSource 动作

```typescript
} else if (type === 'callDataSource') {
  executeDataSource(config.dataSourceId).then((result) => {
    if (result.success) {
      message.success('数据源调用成功');
    } else {
      message.error(`数据源调用失败: ${result.error}`);
    }
  });
}
```

**原理**：
- 调用 `executeDataSource` 函数发起 API 请求
- 根据返回结果显示成功或失败提示

---

## 四、组件引用管理原理

### 4.1 引用存储机制

```typescript
const componentRefs = useRef<Record<number, any>>({});

// 在 buildElementProps 中
ref: (ref) => { componentRefs.current[component.id] = ref; }
```

**原理**：
- 使用 `useRef` 创建持久引用对象
- 在组件挂载时存储引用
- 通过组件 ID 作为键，便于查找

### 4.2 引用获取

```typescript
function getComponentRef(componentId: number) {
  return componentRefs.current[componentId];
}
```

**原理**：
- 根据组件 ID 从 `componentRefs` 获取引用
- 返回组件实例，可调用其方法

---

## 五、子组件渲染原理

### 5.1 VOID_ELEMENTS 处理

```typescript
const VOID_ELEMENTS = ['Input', 'Text', 'Image'];

function renderChildren(component) {
  if (VOID_ELEMENTS.includes(component.name)) {
    if (component.name === 'Text' && component.props.children !== undefined) {
      // 解析 Text 组件的文本内容
      return resolveChildrenValue(component.props.children);
    }
    return null;
  }
  // ...
}
```

**原理**：
- VOID_ELEMENTS 不支持嵌套子组件
- Text 组件特殊处理：其 children 是文本内容而非嵌套组件
- 其他 VOID_ELEMENTS 返回 null

### 5.2 嵌套组件渲染

```typescript
const hasNestedChildren = component.children && component.children.length > 0;
if (hasNestedChildren) {
  return renderComponents(component.children!);
}
```

**原理**：
- 递归调用 `renderComponents` 渲染子组件树
- 支持任意深度的组件嵌套

### 5.3 props.children 处理

```typescript
if (component.props.children !== undefined) {
  const childrenValue = component.props.children;
  if (typeof childrenValue === 'object' && childrenValue.type !== undefined) {
    if (childrenValue.type === 'static') {
      return childrenValue.value;
    } else if (childrenValue.type === 'variable') {
      const variable = variables.find((v) => v.name === childrenValue.value);
      return data[childrenValue.value] || variable?.defaultValue;
    }
  }
  return childrenValue;
}
```

**原理**：
- 优先处理组件树中的嵌套子组件
- 如果没有嵌套子组件，则使用 props.children
- props.children 同样支持 static 和 variable 类型

---

## 六、样式构建原理

### 6.1 样式合并策略

```typescript
function buildStyle(component) {
  const style = {};
  
  // 1. 用户定义的样式
  const propsStyle = component.props?.style || {};
  
  // 2. 编辑模式：绝对定位
  if (component.x !== undefined && component.y !== undefined) {
    style.position = 'absolute';
    style.left = component.x;
    style.top = component.y;
  }

  return style;
}
```

**原理**：
- 用户定义的样式作为基础
- 编辑模式下添加绝对定位样式
- 定位样式优先级高于用户样式（后添加）

---

## 七、数据源执行器原理

### 7.1 请求构建流程

```typescript
export async function executeDataSource(dataSourceId) {
  // 1. 获取数据源配置
  const dataSource = dataSources.find((ds) => ds.id === dataSourceId);
  
  // 2. 解析配置
  const { method, url, headers, body } = dataSource;
  
  // 3. 构建请求
  const options = {
    method: method.toUpperCase(),
    headers: { 'Content-Type': 'application/json', ...parsedHeaders },
  };

  // 4. 发起请求
  const response = await fetch(url, options);
  
  // 5. 响应映射
  if (dataSource.responseMapping) {
    return getNestedValue(result, dataSource.responseMapping);
  }
  
  return result;
}
```

**原理**：
1. 根据 ID 获取数据源配置
2. 解析请求头（JSON 格式）
3. 构建 fetch 请求选项
4. 发起 HTTP 请求
5. 支持响应映射路径，提取特定字段

### 7.2 响应映射原理

```typescript
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current ? current[key] : undefined;
  }, obj);
}
```

**原理**：
- 将路径字符串按 `.` 分割
- 使用 reduce 逐层访问对象属性
- 支持嵌套路径如 `data.list[0].name`

---

## 八、编辑模式 vs 预览模式

### 8.1 模式区分

```typescript
if (mode === 'edit') {
  elementProps['data-component-id'] = component.id;
}
```

**原理**：
- 编辑模式：添加 `data-component-id` 属性，用于点击选中
- 预览模式：不添加编辑相关属性，更接近生产环境

### 8.2 功能差异

| 功能 | 编辑模式 | 预览模式 |
|------|---------|---------|
| 组件选中 | 支持 | 不支持 |
| 拖拽移动 | 支持 | 不支持 |
| 右键菜单 | 支持 | 不支持 |
| 事件触发 | 支持 | 支持 |
| 变量绑定 | 支持 | 支持 |

---

## 九、性能优化原理

### 9.1 避免不必要的重渲染

```typescript
const componentRefs = useRef<Record<number, any>>({});
```

**原理**：使用 `useRef` 而非状态存储组件引用，避免触发重渲染。

### 9.2 条件渲染优化

```typescript
if (mode === 'edit') {
  elementProps['data-component-id'] = component.id;
}
```

**原理**：根据模式条件添加属性，避免在预览模式下添加不必要的属性。

### 9.3 缓存优化

```typescript
const variables = useVariablesStore.getState().variables;
```

**原理**：在函数内部获取变量列表，避免每次渲染都重新获取。

---

## 十、安全性考虑

### 10.1 脚本执行安全

```typescript
function execScript(script) {
  const ctx = { setData, getComponentRef };
  func(ctx);
}
```

**原理**：
- 只暴露必要的 API（setData、getComponentRef）
- 限制脚本访问范围，防止恶意操作

### 10.2 输入验证

```typescript
if (!variable) return;  // 空值检查
```

**原理**：对关键参数进行验证，防止空值导致的错误。

---

## 总结

工具模块的核心原理：

1. **配置驱动渲染**：根据组件配置动态生成 React 元素
2. **变量绑定**：支持属性绑定到全局变量，实现数据驱动
3. **事件响应**：支持多种动作类型，实现交互逻辑
4. **组件引用**：支持跨组件通信和方法调用
5. **统一渲染**：编辑和预览模式共享渲染逻辑
