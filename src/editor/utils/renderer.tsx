import React, { useRef } from 'react';
import { Button, Input, message } from 'antd';
import { useComponents } from '../stores/components';
import { useVariablesStore } from '../stores/variable';
import { usePageDataStore } from '../stores/page-data';
import type { Component } from '../stores/components';
import Space from '../components/space';
import { ITEM_TYPE } from '../item-type';

const ComponentMap: { [key: string]: any } = {
  Button: Button,
  Space: Space,
  Input: Input,
};

const VOID_ELEMENTS = ['Input'];

const componentEventMap: Record<string, any[]> = {
  [ITEM_TYPE.BUTTON]: [{
    name: 'onClick',
    label: '点击事件',
  }],
};

interface UnifiedRendererProps {
  mode: 'edit' | 'preview';
}

const UnifiedRenderer: React.FC<UnifiedRendererProps> = ({ mode }) => {
  const components = useComponents((state) => state.components);
  const data = usePageDataStore((state) => state.data);
  const setData = usePageDataStore((state) => state.setData);
  const componentRefs = useRef<Record<number, any>>({});

  function getComponentRef(componentId: number) {
    return componentRefs.current[componentId];
  }

  function execScript(script: string) {
    const func = new Function('ctx', script);
    const ctx = { setData, getComponentRef };
    func(ctx);
  }

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

  function handleEvent(component: Component) {
    const eventProps: any = {};
    const variables = useVariablesStore.getState().variables;

    if (!componentEventMap[component.name]?.length) return eventProps;

    componentEventMap[component.name].forEach((event) => {
      const eventConfig = component.props[event.name];
      if (!eventConfig) return;

      const { type, config } = eventConfig;
      eventProps[event.name] = () => {
        if (type === 'showMessage') {
          let text = config.text;
          if (typeof text === 'object' && text.type !== undefined) {
            if (text.type === 'variable') {
              const variableName = text.value;
              const variable = variables.find((v) => v.name === variableName);
              text = data[variableName] || variable?.defaultValue || '';
            } else {
              text = text.value;
            }
          }
          if (config.type === 'success') {
            message.success(text);
          } else if (config.type === 'error') {
            message.error(text);
          }
        } else if (type === 'componentFunction') {
          const targetComponent = componentRefs.current[config.componentId];
          if (targetComponent) {
            targetComponent[config.method]?.();
          }
        } else if (type === 'setVariable') {
          const { variable, value } = config;
          if (variable && value) {
            setData(variable, value);
          }
        } else if (type === 'execScript') {
          execScript(config.script);
        }
      };
    });

    return eventProps;
  }

  function renderChildren(component: Component): React.ReactNode {
    if (VOID_ELEMENTS.includes(component.name)) return null;

    const hasNestedChildren = component.children && component.children.length > 0;
    if (hasNestedChildren) {
      return renderComponents(component.children!);
    }

    if (component.props.children !== undefined) {
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

  function buildElementProps(component: Component): Record<string, any> {
    const props = formatProps(component);
    delete props.children;

    const eventProps = handleEvent(component);
    Object.assign(props, eventProps);

    const elementProps: Record<string, any> = {
      key: component.id,
      id: component.id,
      ref: (ref: any) => { componentRefs.current[component.id] = ref; },
      ...props,
    };

    if (mode === 'edit') {
      elementProps['data-component-id'] = component.id;
      if (component.x !== undefined && component.y !== undefined) {
        elementProps.style = {
          ...elementProps.style,
          position: 'absolute',
          left: component.x,
          top: component.y,
        };
      }
    }

    return elementProps;
  }

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

  const isEdit = mode === 'edit';
  const isEmpty = components.length === 0;

  return (
    <div className={isEdit ? 'relative w-full h-full min-h-[400px]' : 'h-[100%] p-[24px] bg-white'}>
      {isEmpty ? (
        <div className="text-gray-400 text-center py-10">
          {isEdit ? '拖拽组件到这里' : '暂无内容'}
        </div>
      ) : (
        renderComponents(components)
      )}
    </div>
  );
};

export default UnifiedRenderer;
export { ComponentMap, VOID_ELEMENTS, componentEventMap };
