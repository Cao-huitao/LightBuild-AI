import { create } from 'zustand';

export interface Component {
  id: number;
  name: string;
  props: any;
  children?: Component[];
  x?: number;
  y?: number;
}

interface State {
  components: Component[];
  selectedComponentId: number | null;
  mode: 'edit' | 'preview';
  history: Component[][];
  future: Component[][];
}

interface Action {
  addComponent: (component: Component, parentId?: number, index?: number) => void;
  selectComponent: (id: number | null) => void;
  updateComponentProps: (componentId: number, props: any) => void;
  updateComponentPosition: (componentId: number, x: number, y: number) => void;
  updateComponentStyles: (componentId: number, styles: any) => void;
  deleteComponent: (componentId: number) => void;
  copyComponent: (componentId: number) => void;
  moveComponent: (componentId: number, direction: 'up' | 'down') => void;
  undo: () => void;
  redo: () => void;
  setMode: (mode: State['mode']) => void;
}

// ---- helpers ----

function recordMutation(state: State, components: Component[]): Partial<State> {
  return {
    components,
    history: [...state.history, state.components],
    future: [],
  };
}

function addComponentRecursively(
  components: Component[],
  newComponent: Component,
  parentId?: number,
  index?: number,
): Component[] {
  if (parentId === undefined) {
    const i = index ?? components.length;
    const copy = [...components];
    copy.splice(i, 0, newComponent);
    return copy;
  }
  return components.map((component) => {
    if (component.id === parentId) {
      const children = [...(component.children || [])];
      const i = index ?? children.length;
      children.splice(i, 0, newComponent);
      return { ...component, children };
    }
    if (component.children && component.children.length > 0) {
      return {
        ...component,
        children: addComponentRecursively(component.children, newComponent, parentId, index),
      };
    }
    return component;
  });
}

function updateComponentPropsRecursively(
  components: Component[],
  componentId: number,
  props: any
): Component[] {
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

function updateComponentPositionRecursively(
  components: Component[],
  componentId: number,
  x: number,
  y: number
): Component[] {
  return components.map((component) => {
    if (component.id === componentId) {
      return { ...component, x, y };
    }
    if (component.children && component.children.length > 0) {
      return {
        ...component,
        children: updateComponentPositionRecursively(component.children, componentId, x, y),
      };
    }
    return component;
  });
}

function updateComponentStylesRecursively(
  components: Component[],
  componentId: number,
  styles: any
): Component[] {
  return components.map((component) => {
    if (component.id === componentId) {
      return {
        ...component,
        props: {
          ...component.props,
          style: { ...component.props?.style, ...styles },
        },
      };
    }
    if (component.children && component.children.length > 0) {
      return {
        ...component,
        children: updateComponentStylesRecursively(component.children, componentId, styles),
      };
    }
    return component;
  });
}

function removeComponentRecursively(
  components: Component[],
  targetId: number
): Component[] {
  return components
    .filter((c) => c.id !== targetId)
    .map((c) =>
      c.children
        ? { ...c, children: removeComponentRecursively(c.children, targetId) }
        : c
    );
}

function moveComponentRecursively(
  components: Component[],
  targetId: number,
  direction: 'up' | 'down'
): Component[] {
  const delta = direction === 'up' ? -1 : 1;

  for (let i = 0; i < components.length; i++) {
    if (components[i].id === targetId) {
      const newIndex = i + delta;
      if (newIndex < 0 || newIndex >= components.length) return components;
      const swapped = [...components];
      [swapped[i], swapped[newIndex]] = [swapped[newIndex], swapped[i]];
      return swapped;
    }
    if (components[i].children?.length) {
      const newChildren = moveComponentRecursively(
        components[i].children!,
        targetId,
        direction
      );
      if (newChildren !== components[i].children) {
        return components.map((c, idx) =>
          idx === i ? { ...c, children: newChildren } : c
        );
      }
    }
  }
  return components;
}

function findComponentById(
  components: Component[],
  componentId: number
): Component | null {
  for (const component of components) {
    if (component.id === componentId) return component;
    if (component.children && component.children.length > 0) {
      const found = findComponentById(component.children, componentId);
      if (found) return found;
    }
  }
  return null;
}

function findParentAndIndex(
  components: Component[],
  targetId: number,
  parent?: Component
): { parent: Component | null; index: number } | null {
  for (let i = 0; i < components.length; i++) {
    if (components[i].id === targetId) {
      return { parent: parent || null, index: i };
    }
    if (components[i].children?.length) {
      const found = findParentAndIndex(
        components[i].children!,
        targetId,
        components[i]
      );
      if (found) return found;
    }
  }
  return null;
}

function replaceChildrenInParent(
  components: Component[],
  parentId: number,
  newChildren: Component[]
): Component[] {
  return components.map((c) => {
    if (c.id === parentId) return { ...c, children: newChildren };
    if (c.children?.length) {
      return {
        ...c,
        children: replaceChildrenInParent(c.children, parentId, newChildren),
      };
    }
    return c;
  });
}

function cloneComponentTree(component: Component): Component {
  function clone(c: Component): Component {
    const newId = Date.now() + Math.floor(Math.random() * 1000000);
    return {
      ...c,
      id: newId,
      props: { ...c.props },
      children: c.children?.map(clone),
    };
  }
  return clone(component);
}

export const useComponents = create<State & Action>((set) => ({
  components: [],
  selectedComponentId: null,
  mode: 'edit',
  history: [],
  future: [],

  addComponent: (component, parentId, index) =>
    set((state) => {
      const newComponents = addComponentRecursively(state.components, component, parentId, index);
      return recordMutation(state, newComponents);
    }),

  selectComponent: (id) => set({ selectedComponentId: id }),

  updateComponentProps: (componentId, props) =>
    set((state) => {
      const newComponents = updateComponentPropsRecursively(state.components, componentId, props);
      return recordMutation(state, newComponents);
    }),

  updateComponentPosition: (componentId, x, y) =>
    set((state) => {
      const newComponents = updateComponentPositionRecursively(state.components, componentId, x, y);
      return recordMutation(state, newComponents);
    }),

  deleteComponent: (componentId) =>
    set((state) => {
      const newComponents = removeComponentRecursively(state.components, componentId);
      return {
        ...recordMutation(state, newComponents),
        selectedComponentId:
          state.selectedComponentId === componentId ? null : state.selectedComponentId,
      };
    }),

  copyComponent: (componentId) =>
    set((state) => {
      const component = findComponentById(state.components, componentId);
      if (!component) return {};

      const cloned = cloneComponentTree(component);
      const result = findParentAndIndex(state.components, componentId);
      let newComponents: Component[];

      if (!result) {
        newComponents = [...state.components, cloned];
      } else if (result.parent) {
        const siblings = [...result.parent.children!];
        siblings.splice(result.index + 1, 0, cloned);
        newComponents = replaceChildrenInParent(state.components, result.parent.id, siblings);
      } else {
        newComponents = [...state.components];
        newComponents.splice(result.index + 1, 0, cloned);
      }

      return recordMutation(state, newComponents);
    }),

  moveComponent: (componentId, direction) =>
    set((state) => {
      const newComponents = moveComponentRecursively(state.components, componentId, direction);
      return recordMutation(state, newComponents);
    }),

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

  updateComponentStyles: (componentId, styles) =>
    set((state) => {
      const newComponents = updateComponentStylesRecursively(state.components, componentId, styles);
      return recordMutation(state, newComponents);
    }),

  setMode: (mode) => set({ mode }),
}));

export const useSelectedComponent = () => {
  const components = useComponents((state) => state.components);
  const selectedComponentId = useComponents((state) => state.selectedComponentId);

  if (!selectedComponentId) return null;
  return findComponentById(components, selectedComponentId);
};
