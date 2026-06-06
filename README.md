# LightBuild-AI

基于 React + TypeScript 的低代码可视化编辑器平台

## 功能特性

- **拖拽式构建**：通过拖拽组件到画布快速构建界面
- **多组件支持**：按钮、输入框、文本、图片、间距、卡片等多种基础组件
- **Canvas 渲染**：基于 Canvas 的高性能画布渲染引擎
- **智能布局**：
  - 组件自动对齐辅助线
  - 容器组件（Space/Card）智能插入指示器
  - 缩放和平移画布
- **多选操作**：支持框选和 Shift 多选组件
- **样式配置**：灵活的属性和样式编辑面板
- **事件绑定**：组件事件配置系统
- **数据源管理**：数据源定义和数据绑定执行器
- **撤销/重做**：完整的操作历史记录

## 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **状态管理**：Zustand
- **拖拽库**：react-dnd
- **样式**：Tailwind CSS
- **画布**：Canvas 2D API

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
vite-project/
├── src/
│   └── editor/
│       ├── common/           # 公共组件
│       │   ├── component-item.tsx    # 物料区组件项
│       │   ├── selected-mask.tsx     # 选中遮罩
│       │   └── select-variable-modal.tsx
│       ├── components/      # 内置组件定义
│       │   ├── Button.tsx
│       │   ├── Input.tsx
│       │   ├── Text.tsx
│       │   ├── Image.tsx
│       │   └── space/
│       ├── layouts/         # 编辑器布局
│       │   ├── header/      # 头部（组件树、数据源面板等）
│       │   ├── material/    # 物料区
│       │   ├── stage/       # 画布舞台
│       │   └── setting/     # 属性设置面板
│       ├── stores/          # Zustand 状态管理
│       ├── hooks/           # 自定义 Hooks
│       ├── utils/           # 工具函数
│       └── types/           # TypeScript 类型定义
```

## 使用说明

1. **添加组件**：从左侧物料区拖拽组件到画布
2. **选择组件**：点击画布上的组件进行选中
3. **移动组件**：拖拽选中组件移动位置
4. **调整大小**：拖拽组件边缘的调整手柄改变大小
5. **多选**：按住 Shift 点击或框选多个组件
6. **删除**：选中组件后按 Delete 删除
7. **缩放画布**：使用鼠标滚轮缩放，Space+拖拽平移
8. **配置属性**：在右侧面板编辑选中组件的属性和样式

## License

MIT
