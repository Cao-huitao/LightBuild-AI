import React, { useRef } from 'react';
import { Input, message } from 'antd';
import { useComponents } from '../../stores/components';
import { useVariablesStore } from '../../stores/variable';
import { usePageDataStore } from '../../stores/page-data';
import type { Component } from '../../stores/components';
import Space from '../../components/space';
import Button from '../../components/Button';
import { ITEM_TYPE } from '../../item-type';

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

// 处理组件props
function formatProps(component: Component) {
  const variables = useVariablesStore.getState().variables;
  const data = usePageDataStore.getState().data;

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
          // 如果data中有值，则取data中的值。否则取变量的默认值
          prev[cur] = data[variableName] || variable?.defaultValue;
        }
      } else {
        prev[cur] = component.props[cur];
      }
      return prev;
    }, {});

  return props;
}

const ProdStage: React.FC = () => {
  const components = useComponents((state) => state.components);
  // 订阅 data 变化，触发组件重新渲染
  const data = usePageDataStore((state) => state.data);
  // 获取 setData 方法
  const setData = usePageDataStore((state) => state.setData);
  // 定义一个map，存放组件id和组件实例的映射
  const componentRefs = useRef<any>({});

  // 获取组件引用
  function getComponentRef(componentId: number) {
    return componentRefs.current[componentId];
  }

  // 执行脚本
  function execScript(script: string) {
    const func = new Function('ctx', script);
    const ctx = { setData, getComponentRef };
    func(ctx);
  }

  // 处理事件
  function handleEvent(component: Component) {
    const props: any = {};
    const variables = useVariablesStore.getState().variables;

    if (componentEventMap[component.name]?.length) {
      componentEventMap[component.name].forEach((event) => {
        const eventConfig = component.props[event.name];

        if (eventConfig) {
          const { type, config } = eventConfig;
          props[event.name] = () => {
            // 如果动作类型是显示消息，下面根据消息类型调用显示消息方法
            if (type === 'showMessage') {
              let text = config.text;
              if (typeof text === 'object' && text.type !== undefined) {
                if (text.type === 'variable') {
                  const variableName = text.value;
                  const variable = variables.find((v: { name: string }) => v.name === variableName);
                  // 如果data中有值，则取data中的值。否则取变量的默认值
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
              // 通过组件id获取到组件实例，然后调用配置的方法
              const targetComponent = componentRefs.current[config.componentId];
              if (targetComponent) {
                targetComponent[config.method]?.();
              }
            } else if (type === 'setVariable') {
              // 设置变量值
              const { variable, value } = config;
              if (variable && value) {
                setData(variable, value);
              }
            } else if (type === 'execScript') {
              // 执行脚本
              execScript(config.script);
            }
          };
        }
      });
    }

    return props;
  }

  function renderComponents(items: Component[]): React.ReactNode {
    return items.map((component: Component) => {
      const Element = ComponentMap[component.name];

      if (!Element) {
        console.warn('Component not found in ComponentMap:', component.name);
        return null;
      }

      const isVoidElement = VOID_ELEMENTS.includes(component.name);
      const hasNestedChildren = component.children && component.children.length > 0;

      let children: React.ReactNode = null;
      const variables = useVariablesStore.getState().variables;

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
              const variableName = childrenValue.value;
              const variable = variables.find((v) => v.name === variableName);
              // 如果data中有值，则取data中的值。否则取变量的默认值
              children = data[variableName] || variable?.defaultValue;
            }
          } else {
            children = childrenValue;
          }
        }
      }

      // 处理事件，生成事件处理函数
      const eventProps = handleEvent(component);

      // 处理组件props
      const props = formatProps(component);
      delete props.children;

      // 合并事件props，事件props覆盖原有props
      Object.assign(props, eventProps);

      return React.createElement(
        Element,
        {
          key: component.id,
          id: component.id,
          ref: (ref: any) => { componentRefs.current[component.id] = ref; },
          ...props,
        },
        children
      );
    });
  }

  return (
    <div className='h-[100%] p-[24px] bg-white'>
      {components.length === 0 ? (
        <div className="text-gray-400 text-center py-10">
          暂无内容
        </div>
      ) : (
        renderComponents(components)
      )}
    </div>
  );
};

export default ProdStage;
