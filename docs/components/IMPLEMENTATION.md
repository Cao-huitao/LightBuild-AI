# 组件模块 - 实现文档

## 一、组件注册与映射

### 1.1 组件类型定义

**文件**: `src/editor/item-type.ts`

```typescript
export const ITEM_TYPE = {
  BUTTON: 'Button',
  SPACE: 'Space',
  INPUT: 'Input',
  TEXT: 'Text',
  IMAGE: 'Image',
  CARD: 'Card',
};
```

| 类型 | 值 | 说明 |
|------|------|------|
| BUTTON | `'Button'` | 按钮组件 |
| SPACE | `'Space'` | 间距组件 |
| INPUT | `'Input'` | 输入框组件 |
| TEXT | `'Text'` | 文本组件 |
| IMAGE | `'Image'` | 图片组件 |
| CARD | `'Card'` | 卡片组件 |

### 1.2 组件映射表

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

### 1.3 物料区注册

**文件**: `src/editor/layouts/material/index.tsx` (第10-17行)

```typescript
<ComponentItem description="按钮" name={ITEM_TYPE.BUTTON} />
<ComponentItem description="输入框" name={ITEM_TYPE.INPUT} />
<ComponentItem description="文本" name={ITEM_TYPE.TEXT} />
<ComponentItem description="图片" name={ITEM_TYPE.IMAGE} />
<ComponentItem description="间距" name={ITEM_TYPE.SPACE} />
<ComponentItem description="卡片" name={ITEM_TYPE.CARD} />
```

---

## 二、组件实现

### 2.1 Button 组件

**文件**: `src/editor/components/Button.tsx`

```typescript
const Button = forwardRef<any, Props>(({ children, id, style, ...rest }, ref) => {
  return (
    <AntButton
      ref={ref}
      data-component-id={id}
      style={{ ...defaultStyle, ...style }}
      {...rest}
    >
      {children || '按钮'}
    </AntButton>
  );
});
```

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| children | ReactNode | `'按钮'` | 按钮文本 |
| id | number | - | 组件ID |
| style | object | - | 自定义样式 |

### 2.2 Text 组件

**文件**: `src/editor/components/Text.tsx` (第1-29行)

```typescript
const Text = forwardRef<any, Props>(({ children, id, style, ...rest }, ref) => {
  return (
    <span
      ref={ref}
      data-component-id={id}
      className="inline-block"
      style={{
        fontSize: 14,
        color: '#333',
        ...style,
      }}
      {...rest}
    >
      {children || '文本'}
    </span>
  );
});
```

### 2.3 Input 组件

**文件**: `src/editor/components/Input.tsx`

```typescript
const Input = forwardRef<any, Props>(({ id, style, ...rest }, ref) => {
  return (
    <AntInput
      ref={ref}
      data-component-id={id}
      style={{ ...defaultStyle, ...style }}
      {...rest}
    />
  );
});
```

### 2.4 Image 组件

**文件**: `src/editor/components/Image.tsx`

```typescript
const Image = forwardRef<any, Props>(({ id, style, ...rest }, ref) => {
  return (
    <img
      ref={ref}
      data-component-id={id}
      style={{ ...defaultStyle, ...style }}
      {...rest}
    />
  );
});
```

### 2.5 Space 组件

**文件**: `src/editor/components/space/index.tsx`

Space 组件支持嵌套子组件，使用 antd 的 Space 组件实现。

### 2.6 Card 组件

**文件**: `src/editor/components/card/index.tsx`

Card 组件支持嵌套子组件，使用 antd 的 Card 组件实现。

---

## 三、组件属性配置

### 3.1 属性配置映射

**文件**: `src/editor/layouts/setting/attr.tsx` (第15-67行)

| 组件类型 | 可配置属性 |
|---------|-----------|
| BUTTON | type（按钮类型）、children（文本） |
| SPACE | size（间距大小） |
| INPUT | placeholder（占位文本） |
| TEXT | children（文本内容） |
| IMAGE | src（图片地址）、alt（替代文本） |
| CARD | title（卡片标题） |

### 3.2 属性配置示例

**Button 组件配置**:
```typescript
[ITEM_TYPE.BUTTON]: [{
  name: 'type',
  label: '按钮类型',
  type: 'select',
  options: [
    { label: '主按钮', value: 'primary' },
    { label: '次按钮', value: 'default' }
  ],
}, {
  name: 'children',
  label: '文本',
  type: 'input',
}]
```

---

## 四、组件事件配置

### 4.1 事件映射表

**文件**: `src/editor/utils/renderer.tsx` (第25-46行)

| 组件类型 | 支持事件 |
|---------|---------|
| BUTTON | onClick（点击事件） |
| TEXT | onClick（点击事件） |
| IMAGE | onClick（点击事件） |
| CARD | onClick（点击事件） |
| INPUT | onChange（值变化） |

### 4.2 事件配置界面

**文件**: `src/editor/layouts/setting/event.tsx` (第8-29行)

```typescript
const componentEventMap: Record<string, any[]> = {
  [ITEM_TYPE.BUTTON]: [{
    name: 'onClick',
    label: '点击事件',
  }],
  // ...其他组件
};
```

---

## 五、组件渲染流程

### 5.1 渲染入口

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

### 5.2 属性构建

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

### 5.3 属性格式化

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

### 5.4 子组件渲染

**文件**: `src/editor/utils/renderer.tsx` (第147-171行)

```typescript
function renderChildren(component: Component): React.ReactNode {
  // 处理 VOID_ELEMENTS（Text、Input、Image）
  if (VOID_ELEMENTS.includes(component.name)) {
    if (component.name === 'Text' && component.props.children !== undefined) {
      const childrenValue = component.props.children;
      // 解析静态值或变量绑定
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

---

## 六、组件事件处理

### 6.1 事件处理入口

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
      // 根据 type 执行不同的动作
    };
  });

  return eventProps;
}
```

### 6.2 动作类型处理

| 动作类型 | 处理逻辑 | 代码位置 |
|---------|---------|---------|
| showMessage | 弹出消息提示 | 第100-115行 |
| componentFunction | 调用组件方法 | 第116-120行 |
| setVariable | 设置变量值 | 第121-129行 |
| execScript | 执行脚本 | 第130-136行 |
| callDataSource | 调用数据源 | 第137-140行 |

---

## 七、组件引用管理

**文件**: `src/editor/utils/renderer.tsx` (第56-60行)

```typescript
const componentRefs = useRef<Record<number, any>>({});

function getComponentRef(componentId: number) {
  return componentRefs.current[componentId];
}
```

组件通过 `ref` 存储引用，用于调用组件方法：

```typescript
// 在 buildElementProps 中
ref: (ref: any) => { componentRefs.current[component.id] = ref; }
```

---

## 八、组件状态管理

组件状态由 `useComponents` store 管理，关键方法：

| 方法 | 功能 | 文件位置 |
|------|------|---------|
| `addComponent()` | 添加组件 | `stores/components.ts:201` |
| `updateComponentProps()` | 更新属性 | `stores/components.ts:231` |
| `deleteComponent()` | 删除组件 | `stores/components.ts:243` |
| `copyComponent()` | 复制组件 | `stores/components.ts:257` |
| `moveComponent()` | 移动组件 | `stores/components.ts:279` |
