import React, { useEffect } from 'react';
import { Button, Input } from 'antd';
import { useComponents } from '../../stores/components';
import { useVariablesStore } from '../../stores/variable';
import type { Component } from '../../stores/components';
import Space from '../../components/space';

const ComponentMap: { [key: string]: any } = {
  Button: Button,
  Space: Space,
  Input: Input,
};

const VOID_ELEMENTS = ['Input'];

// 处理组件props
function formatProps(component: Component) {
  const variables = useVariablesStore.getState().variables;

  const props = Object.keys(component.props || {})
    .reduce<any>((prev, cur) => {
      // 如果组件属性是对象，则判断是静态值还是变量
      if (typeof component.props[cur] === 'object') {
        // 如果是静态值，则直接赋值。如果是变量，则取变量中的默认值
        if (component.props[cur]?.type === 'static') {
          prev[cur] = component.props[cur].value;
        } else if (component.props[cur]?.type === 'variable') {
          const variableName = component.props[cur].value;
          const variable = variables.find((item) => item.name === variableName);
          prev[cur] = variable?.defaultValue;
        }
      } else {
        prev[cur] = component.props[cur];
      }
      return prev;
    }, {});

  return props;
}

const Renderer: React.FC = () => {
  const components = useComponents((state) => state.components);

  useEffect(() => {
    console.log('Renderer - components changed:', components);
  }, [components]);

  function renderComponents(items: Component[]): React.ReactNode {
    console.log('renderComponents called with:', items);
    return items.map((component: Component) => {
      const Element = ComponentMap[component.name];

      if (!Element) {
        console.warn('Component not found in ComponentMap:', component.name);
        return null;
      }

      const isVoidElement = VOID_ELEMENTS.includes(component.name);
      const hasNestedChildren = component.children && component.children.length > 0;

      let children: React.ReactNode = null;

      // 对于非空元素，优先使用嵌套子组件，然后使用 props.children
      if (!isVoidElement) {
        if (hasNestedChildren) {
          children = renderComponents(component.children || []);
        } else if (component.props.children !== undefined) {
          // 处理 children 属性
          const childrenValue = component.props.children;
          if (typeof childrenValue === 'object' && childrenValue.type !== undefined) {
            if (childrenValue.type === 'static') {
              children = childrenValue.value;
            } else if (childrenValue.type === 'variable') {
              const variables = useVariablesStore.getState().variables;
              const variable = variables.find((v) => v.name === childrenValue.value);
              children = variable?.defaultValue;
            }
          } else {
            children = childrenValue;
          }
        }
      }

      // 处理组件props
      const props = formatProps(component);
      delete props.children;

      console.log('Creating element:', component.name, props, children);

      return React.createElement(
        Element,
        {
          key: component.id,
          id: component.id,
          'data-component-id': component.id,
          ...props,
        },
        children
      );
    });
  }

  return (
    <div>
      {components.length === 0 ? (
        <div className="text-gray-400 text-center py-10">
          拖拽组件到这里
        </div>
      ) : (
        renderComponents(components)
      )}
    </div>
  );
};

export default Renderer;
