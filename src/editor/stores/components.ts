import { create } from 'zustand';


// interface 类型声明
// 定义一个可嵌套的组件结构  就是一个树节点
export interface Component {
  id: number;
  name: string;
  props: any;//组件属性
  children?: Component[];//子组件 可选
}

interface State {
  components: Component[];//整个组件树数组
  selectedComponentId: number | null;//选中组件的id
  mode: 'edit' | 'preview';//当前模式：编辑模式或预览模式
}

// 定义修改状态的方法
interface Action {//新添加的组件         父组件id 可选  没有就加到根节点
  addComponent: (component: Component, parentId?: number) => void;
  selectComponent: (id: number | null) => void;//选中组件
  updateComponentProps: (componentId: number, props: any) => void;//更新组件属性
  setMode: (mode: State['mode']) => void;//设置模式
}

// 遍历组件树 找到parentId对应的组件 把新组件加到他的children
const addComponentRecursively = (
  components: Component[],//当前层组件列表
  newComponent: Component,
  parentId?: number
): Component[] => {
  if (parentId === undefined) {
    return [...components, newComponent];//没有id 就加到根组件
  }

  // 遍历当前层所有组件
  return components.map((component) => {
    // 当前层可以找到，加入
    if (component.id === parentId) {
      return {
        ...component,
        children: [...(component.children || []), newComponent],
      };
    }
    // 当前层没有，且还要children，递归
    if (component.children && component.children.length > 0) {
      return {
        ...component,
        children: addComponentRecursively(component.children, newComponent, parentId),
      };
    }
    return component;
  });
};

// 遍历组件树 更新指定组件的属性
const updateComponentPropsRecursively = (
  components: Component[],
  componentId: number,
  props: any
): Component[] => {
  return components.map((component) => {
    if (component.id === componentId) {
      return {
        ...component,
        props: { ...component.props, ...props },
      };
    }
    if (component.children && component.children.length > 0) {
      return {
        ...component,
        children: updateComponentPropsRecursively(component.children, componentId, props),
      };
    }
    return component;
  });
};

// 根据id查找组件
const findComponentById = (
  components: Component[],
  componentId: number
): Component | null => {
  for (const component of components) {
    if (component.id === componentId) {
      return component;
    }
    if (component.children && component.children.length > 0) {
      const found = findComponentById(component.children, componentId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

// 创建store
export const useComponents = create<State & Action>((set) => ({
  components: [],//初始状态
  selectedComponentId: null,
  mode: 'edit',//初始为编辑模式
  // 添加全局组件方法
  addComponent: (component, parentId) =>
    set((state) => {
      const newComponents = addComponentRecursively(state.components, component, parentId);
      console.log('Store updated:', newComponents);
      return { components: newComponents };
    }),
  // 选中组件方法
  selectComponent: (id) =>
    set({
      selectedComponentId: id,
    }),
  // 更新组件属性方法
  updateComponentProps: (componentId, props) =>
    set((state) => {
      const newComponents = updateComponentPropsRecursively(state.components, componentId, props);
      console.log('Component props updated:', componentId, props);
      return { components: newComponents };
    }),
  // 设置模式方法
  setMode: (mode) =>
    set({
      mode,
    }),
}));

// 获取当前选中的组件
export const useSelectedComponent = () => {
  const components = useComponents((state) => state.components);
  const selectedComponentId = useComponents((state) => state.selectedComponentId);

  if (!selectedComponentId) {
    return null;
  }

  return findComponentById(components, selectedComponentId);
};
