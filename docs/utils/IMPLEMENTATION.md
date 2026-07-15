# 工具模块 - 实现文档

## 一、模块概述

工具模块包含核心的渲染逻辑和数据源执行器：

| 文件 | 职责 |
|------|------|
| `renderer.tsx` | 统一渲染器，负责组件渲染、属性解析、事件处理 |
| `datasource-executor.ts` | 数据源执行器，负责发起 API 请求 |

---

## 二、UnifiedRenderer 组件

### 2.1 组件定义

**文件**: `src/editor/utils/renderer.tsx` (第48-56行)

```typescript
interface UnifiedRendererProps {
  mode: 'edit' | 'preview';
}

const UnifiedRenderer: React.FC<UnifiedRendererProps> = ({ mode }) => {
  const components = useComponents((state) => state.components);
  const data = usePageDataStore((state) => state.data);
  const setData = usePageDataStore((state) => state.setData);
  const componentRefs = useRef<Record<number, any>>({});
  // ...
};
```

**参数说明**：
| 参数 | 类型 | 说明 |
|------|------|------|
| mode | `'edit' \| 'preview'` | 编辑模式或预览模式 |

### 2.2 核心函数

#### 2.2.1 formatProps - 属性格式化

**文件**: `src/editor/utils/renderer.tsx` (第68-85行)

```typescript
function formatProps(component: Component) {
  const variables = useVariablesStore.getState().variables;

  return Object.keys(component.props || {}).reduce<any>((prev, cur) => {
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

**功能**：
- 遍历组件的 props
- 解析 `static` 类型：直接使用 value
- 解析 `variable` 类型：从 page-data 读取值，若无则使用默认值

#### 2.2.2 handleEvent - 事件处理

**文件**: `src/editor/utils/renderer.tsx` (第87-145行)

```typescript
function handleEvent(component: Component) {
  const eventProps: any = {};
  const variables = useVariablesStore.getState().variables;

  if (!componentEventMap[component.name]?.length) return eventProps;

  componentEventMap[component.name].forEach((event) => {
    const eventConfig = component.props[event.name];
    if (!eventConfig) return;

    const { type, config } = eventConfig;

    eventProps[event.name] = (e?: any) => {
      // 根据 type 执行不同动作
    };
  });

  return eventProps;
}
```

**支持的动作类型**：

| 动作类型 | 处理逻辑 | 代码位置 |
|---------|---------|---------|
| showMessage | 弹出消息提示 | 第100-115行 |
| componentFunction | 调用组件方法 | 第116-120行 |
| setVariable | 设置变量值 | 第121-129行 |
| execScript | 执行脚本 | 第130-136行 |
| callDataSource | 调用数据源 | 第137-140行 |

**setVariable 实现**（第121-129行）：

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

#### 2.2.3 execScript - 脚本执行

**文件**: `src/editor/utils/renderer.tsx` (第62-66行)

```typescript
function execScript(script: string) {
  const func = new Function('ctx', script);
  const ctx = { setData, getComponentRef };
  func(ctx);
}
```

**功能**：
- 使用 `new Function` 创建函数
- 提供 `ctx` 对象，包含 `setData` 和 `getComponentRef`
- 执行用户编写的脚本

#### 2.2.4 renderChildren - 子组件渲染

**文件**: `src/editor/utils/renderer.tsx` (第147-171行)

```typescript
function renderChildren(component: Component): React.ReactNode {
  // 处理 VOID_ELEMENTS
  if (VOID_ELEMENTS.includes(component.name)) {
    if (component.name === 'Text' && component.props.children !== undefined) {
      const childrenValue = component.props.children;
      if (typeof childrenValue === 'object' && childrenValue.type !== undefined) {
        if (childrenValue.type === 'static') {
          return childrenValue.value;
        } else if (childrenValue.type === 'variable') {
          const variables = useVariablesStore.getState().variables;
          const variable = variables.find((v) => v.name === childrenValue.value);
          return data[childrenValue.value] || variable?.defaultValue;
        }
      }
      return childrenValue;
    }
    return null;
  }

  // 处理嵌套子组件
  const hasNestedChildren = component.children && component.children.length > 0;
  if (hasNestedChildren) {
    return renderComponents(component.children!);
  }

  // 处理 props.children
  if (component.props.children !== undefined) {
    // ... 类似处理
  }

  return null;
}
```

#### 2.2.5 buildElementProps - 构建元素属性

**文件**: `src/editor/utils/renderer.tsx` (第218-239行)

```typescript
function buildElementProps(component: Component): Record<string, any> {
  const props = formatProps(component);
  delete props.children;
  delete props.style;

  const eventProps = handleEvent(component);
  Object.assign(props, eventProps);

  const elementProps: Record<string, any> = {
    key: component.id,
    id: component.id,
    ref: (ref: any) => { componentRefs.current[component.id] = ref; },
    ...props,
    style: buildStyle(component),
  };

  if (mode === 'edit') {
    elementProps['data-component-id'] = component.id;
  }

  return elementProps;
}
```

**功能**：
- 格式化属性
- 添加事件处理器
- 存储组件引用
- 添加编辑模式标记

#### 2.2.6 buildStyle - 构建样式

**文件**: `src/editor/utils/renderer.tsx` (第180-216行)

```typescript
function buildStyle(component: Component): React.CSSProperties {
  const style: React.CSSProperties = {};
  
  // 1. 用户定义的样式
  const propsStyle = component.props?.style || {};
  // ... 解析各种样式属性

  // 2. 编辑模式：绝对定位
  if (component.x !== undefined && component.y !== undefined) {
    style.position = 'absolute';
    style.left = component.x;
    style.top = component.y;
  }

  return style;
}
```

#### 2.2.7 renderComponents - 渲染组件树

**文件**: `src/editor/utils/renderer.tsx` (第241-255行)

```typescript
function renderComponents(items: Component[]): React.ReactNode {
  return items.map((component: Component) => {
    const Element = ComponentMap[component.name];
    if (!Element) {
      console.warn('Component not found:', component.name);
      return null;
    }

    return React.createElement(
      Element,
      buildElementProps(component),
      renderChildren(component),
    );
  });
}
```

### 2.3 组件映射

**文件**: `src/editor/utils/renderer.tsx` (第14-21行)

```typescript
const ComponentMap: { [key: string]: any } = {
  Button: Button,
  Space: Space,
  Input: Input,
  Text: Text,
  Image: Image,
  Card: Card,
};
```

### 2.4 事件映射

**文件**: `src/editor/utils/renderer.tsx` (第25-46行)

```typescript
const componentEventMap: Record<string, any[]> = {
  [ITEM_TYPE.BUTTON]: [{
    name: 'onClick',
    label: '点击事件',
  }],
  [ITEM_TYPE.TEXT]: [{
    name: 'onClick',
    label: '点击事件',
  }],
  [ITEM_TYPE.IMAGE]: [{
    name: 'onClick',
    label: '点击事件',
  }],
  [ITEM_TYPE.CARD]: [{
    name: 'onClick',
    label: '点击事件',
  }],
  [ITEM_TYPE.INPUT]: [{
    name: 'onChange',
    label: '值变化',
  }],
};
```

### 2.5 VOID_ELEMENTS

**文件**: `src/editor/utils/renderer.tsx` (第23行)

```typescript
const VOID_ELEMENTS = ['Input', 'Text', 'Image'];
```

**说明**：这些组件不支持嵌套子组件，但 Text 需要特殊处理（渲染文本内容）。

---

## 三、数据源执行器

### 3.1 executeDataSource 函数

**文件**: `src/editor/utils/datasource-executor.ts`

```typescript
export async function executeDataSource(dataSourceId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  // 1. 获取数据源配置
  const dataSources = useDataSourceStore.getState().dataSources;
  const dataSource = dataSources.find((ds) => ds.id === dataSourceId);
  
  if (!dataSource) {
    return { success: false, error: '数据源不存在' };
  }

  // 2. 解析配置
  const { method, url, headers, body } = dataSource;
  
  let parsedHeaders: Record<string, string> = {};
  try {
    parsedHeaders = headers ? JSON.parse(headers) : {};
  } catch {
    return { success: false, error: 'Headers 格式错误' };
  }

  // 3. 构建请求
  const options: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      ...parsedHeaders,
    },
  };

  if (method.toUpperCase() !== 'GET' && body) {
    try {
      options.body = body;
    } catch {
      return { success: false, error: 'Body 格式错误' };
    }
  }

  // 4. 发起请求
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    // 5. 响应映射（如果配置了）
    if (dataSource.responseMapping) {
      return { success: true, data: getNestedValue(result, dataSource.responseMapping) };
    }
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current ? current[key] : undefined;
  }, obj);
}
```

**功能**：
- 根据数据源ID获取配置
- 解析请求头和请求体
- 发起 HTTP 请求
- 支持响应映射路径

---

## 四、使用示例

### 4.1 在页面中使用 UnifiedRenderer

```typescript
import UnifiedRenderer from './utils/renderer';

// 编辑模式
<UnifiedRenderer mode="edit" />

// 预览模式
<UnifiedRenderer mode="preview" />
```

### 4.2 在事件处理中调用数据源

```typescript
// 在 handleEvent 中
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

---

## 五、关键设计特点

| 特点 | 说明 |
|------|------|
| **统一渲染** | 编辑模式和预览模式共享同一渲染器 |
| **变量绑定** | 支持属性绑定到全局变量 |
| **事件驱动** | 支持多种事件动作类型 |
| **脚本执行** | 支持自定义 JavaScript 脚本 |
| **数据源集成** | 支持配置和调用 API |
| **组件引用** | 支持获取组件引用调用方法 |
