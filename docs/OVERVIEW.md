# LightBuild-AI 低代码编辑器 - 项目总览

## 一、项目概述

LightBuild-AI 是一个基于 React + TypeScript 的低代码可视化编辑器，支持组件拖拽、属性配置、事件绑定、数据管理和 AI 辅助编辑。

### 核心特性

| 特性 | 说明 |
|------|------|
| **可视化编辑** | 拖拽组件到画布，所见即所得 |
| **组件库** | 提供 Button、Input、Text、Image、Space、Card 6种组件 |
| **事件系统** | 支持显示提示、组件方法、设置变量、执行脚本、调用数据源 |
| **数据管理** | 全局变量系统 + 运行时状态存储 |
| **AI 辅助** | 集成 DeepSeek AI，自然语言描述样式 |
| **预览模式** | 一键切换编辑/预览 |

### 技术栈

| 模块 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 18+ |
| 语言 | TypeScript | 5+ |
| 状态管理 | Zustand | 4+ |
| UI 组件 | Ant Design | 5+ |
| 拖拽 | react-dnd | 16+ |
| 构建工具 | Vite | 8+ |

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    低代码编辑器架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Header    │    │   Layout    │    │             │    │
│  │ 工具栏      │    │ 三栏布局    │    │             │    │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘    │
│         │                  │                               │
│         ▼                  ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Material                         │   │
│  │  物料区 - Button / Input / Text / Image / Space    │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                             │
│                              ▼                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Canvas                            │   │
│  │  画布区 - 组件渲染、拖拽、选中                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                             │
│                              ▼                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Setting                           │   │
│  │  属性面板 - 属性/样式/事件/AI                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Stores                            │   │
│  │  components / variable / page-data / datasource    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块划分

| 模块 | 目录 | 职责 |
|------|------|------|
| **components** | `src/editor/components/` | UI 组件实现 |
| **stores** | `src/editor/stores/` | 状态管理 |
| **layouts** | `src/editor/layouts/` | 页面布局 |
| **utils** | `src/editor/utils/` | 工具函数 |
| **common** | `src/editor/common/` | 公共组件 |
| **types** | `src/editor/types/` | 类型定义 |

### 2.3 数据流向

```
1. 物料区拖拽 → addComponent() → components store
2. 选择组件 → selectComponent() → selectedComponentIds
3. 配置属性 → updateComponentProps() → 组件 props 更新
4. 预览渲染 → UnifiedRenderer → 读取 components + data
5. 触发事件 → handleEvent() → setData() → page-data store
6. 数据变化 → 组件重渲染 → formatProps() 读取变量值
```

---

## 三、核心功能模块

### 3.1 组件管理

| 功能 | 方法 | 文件位置 |
|------|------|---------|
| 添加组件 | `addComponent()` | `stores/components.ts:201` |
| 删除组件 | `deleteComponent()` | `stores/components.ts:243` |
| 更新属性 | `updateComponentProps()` | `stores/components.ts:231` |
| 复制组件 | `copyComponent()` | `stores/components.ts:257` |
| 撤销/重做 | `undo()` / `redo()` | `stores/components.ts:288/299` |

### 3.2 变量系统

| 功能 | 方法 | 文件位置 |
|------|------|---------|
| 添加变量 | `addVariable()` | `stores/variable.ts:58` |
| 删除变量 | `removeVariable()` | `stores/variable.ts:62` |
| 设置值 | `setData()` | `stores/page-data.ts:24` |
| 读取值 | `formatProps()` | `utils/renderer.ts:68` |

### 3.3 事件系统

| 动作类型 | 处理函数 | 文件位置 |
|----------|---------|---------|
| 显示提示 | `showMessage` | `utils/renderer.ts:100` |
| 组件方法 | `componentFunction` | `utils/renderer.ts:116` |
| 设置变量 | `setVariable` | `utils/renderer.ts:121` |
| 执行脚本 | `execScript` | `utils/renderer.ts:62` |
| 调用数据源 | `callDataSource` | `utils/renderer.ts:131` |

### 3.4 渲染系统

| 函数 | 职责 | 文件位置 |
|------|------|---------|
| `formatProps()` | 格式化组件属性，解析变量绑定 | `utils/renderer.ts:68` |
| `handleEvent()` | 处理组件事件 | `utils/renderer.ts:87` |
| `renderChildren()` | 渲染组件子节点 | `utils/renderer.ts:147` |
| `buildElementProps()` | 构建元素属性 | `utils/renderer.ts:218` |

---

## 四、文件结构

```
src/editor/
├── components/           # UI组件
│   ├── Button.tsx
│   ├── Text.tsx
│   ├── Input.tsx
│   ├── Image.tsx
│   ├── card/
│   ├── space/
│   └── ComponentMap.ts
├── stores/               # 状态管理
│   ├── components.ts     # 组件状态
│   ├── variable.ts       # 变量定义
│   ├── page-data.ts      # 运行时数据
│   └── datasource.ts     # 数据源配置
├── layouts/              # 页面布局
│   ├── header/           # 顶部工具栏
│   ├── material/         # 物料区
│   ├── setting/          # 属性面板
│   └── stage/            # 画布区
├── utils/                # 工具函数
│   ├── renderer.tsx      # 统一渲染器
│   └── datasource-executor.ts
├── common/               # 公共组件
│   ├── setting-form-item/
│   ├── component-item.tsx
│   └── select-variable-modal.tsx
├── types/                # 类型定义
├── item-type.ts          # 组件类型枚举
└── layouts/index.tsx     # 主布局
```

---

## 五、典型使用场景

### 场景1：表单交互
1. 定义变量 `inputValue`
2. 拖入 Input 组件 → 事件 → 值变化 → 设置变量 `inputValue`
3. 拖入 Text 组件 → 属性 → 绑定变量 `inputValue`
4. 预览时输入内容，文本实时显示

### 场景2：按钮控制状态
1. 定义变量 `isLoading`
2. 拖入 Button → 事件 → 点击 → 设置变量 `isLoading = true`
3. Button 属性 → loading 绑定 `isLoading`
4. 点击按钮，按钮显示 loading

### 场景3：数据源调用
1. 配置数据源（GET /api/users）
2. Button 点击 → 调用数据源
3. 显示成功/失败提示

---

## 六、扩展能力

### 6.1 添加新组件

1. 在 `item-type.ts` 中添加组件类型
2. 在 `components/` 目录创建组件实现
3. 在 `ComponentMap.ts` 中注册组件
4. 在 `attr.tsx` 中配置属性面板
5. 在 `componentEventMap` 中配置事件

### 6.2 添加新事件动作

1. 在 `event.tsx` 中添加动作选项
2. 在 `renderer.tsx` 的 `handleEvent()` 中添加处理逻辑

---

## 七、运行方式

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

开发服务器默认运行在 http://localhost:5173/

---

## 八、文档说明

本项目文档分为以下层次：

| 文档 | 路径 | 说明 |
|------|------|------|
| **总览文档** | `docs/OVERVIEW.md` | 项目整体介绍 |
| **组件模块** | `docs/components/` | 各组件实现与原理 |
| **状态管理模块** | `docs/stores/` | 状态管理实现 |
| **渲染模块** | `docs/utils/` | 渲染原理与实现 |
| **布局模块** | `docs/layouts/` | 布局组件说明 |
