import { Collapse, Input, Select, TreeSelect } from 'antd';
import { useState } from 'react';
import { ITEM_TYPE } from '../../item-type';
import { useComponents, useSelectedComponent } from '../../stores/components';
import { useVariablesStore } from '../../stores/variable';
import { useDataSourceStore } from '../../stores/datasource';

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

// 配置组件类型暴露出哪些方法
const componentMethodsMap: Record<string, any[]> = {
  [ITEM_TYPE.BUTTON]: [{
    name: 'startLoading',
    label: '开始loading',
  }, {
    name: 'endLoading',
    label: '结束loading',
  }],
};

const ComponentEvent: React.FC = () => {
  const curComponent = useSelectedComponent();
  const selectedIds = useComponents((state) => state.selectedComponentIds);
  const selectedComponentId = selectedIds[0] ?? null;
  const updateComponentProps = useComponents((state) => state.updateComponentProps);
  const components = useComponents((state) => state.components);
  const variables = useVariablesStore((state) => state.variables);
  const [selectedMethodComponentId, setSelectedMethodComponentId] = useState<number | undefined>();

  function typeChange(eventName: string, value: string) {
    if (!selectedComponentId) return;
    updateComponentProps(selectedComponentId, {
      [eventName]: {
        type: value,
        config: curComponent?.props?.[eventName]?.config || {}
      }
    });
    // 如果切换到其他类型，清空选择的组件
    if (value !== 'componentFunction') {
      setSelectedMethodComponentId(undefined);
    }
  }

  function messageTypeChange(eventName: string, value: string) {
    if (!selectedComponentId) return;
    updateComponentProps(selectedComponentId, {
      [eventName]: {
        ...curComponent?.props?.[eventName],
        config: {
          ...curComponent?.props?.[eventName]?.config,
          type: value,
        },
      },
    });
  }

  function messageTextChange(eventName: string, value: string) {
    if (!selectedComponentId) return;
    updateComponentProps(selectedComponentId, {
      [eventName]: {
        ...curComponent?.props?.[eventName],
        config: {
          ...curComponent?.props?.[eventName]?.config,
          text: value,
        },
      },
    });
  }

  // 组件选择变化
  function componentChange(eventName: string, value: number) {
    if (!selectedComponentId) return;
    setSelectedMethodComponentId(value);
    updateComponentProps(selectedComponentId, {
      [eventName]: {
        ...curComponent?.props?.[eventName],
        config: {
          ...curComponent?.props?.[eventName]?.config,
          componentId: value,
        },
      },
    });
  }

  // 组件方法选择变化
  function componentMethodChange(eventName: string, value: string) {
    if (!selectedComponentId) return;
    updateComponentProps(selectedComponentId, {
      [eventName]: {
        ...curComponent?.props?.[eventName],
        config: {
          ...curComponent?.props?.[eventName]?.config,
          method: value,
        },
      },
    });
  }

  // 设置变量 - 变量选择变化
  function variableChange(eventName: string, value: string) {
    if (!selectedComponentId) return;
    updateComponentProps(selectedComponentId, {
      [eventName]: {
        ...curComponent?.props?.[eventName],
        config: {
          ...curComponent?.props?.[eventName]?.config,
          variable: value,
        },
      },
    });
  }

  // 设置变量 - 值变化
  function variableValueChange(eventName: string, value: string) {
    if (!selectedComponentId) return;
    updateComponentProps(selectedComponentId, {
      [eventName]: {
        ...curComponent?.props?.[eventName],
        config: {
          ...curComponent?.props?.[eventName]?.config,
          value,
        },
      },
    });
  }

  // 脚本变化
  function scriptChange(eventName: string, value: string) {
    if (!selectedComponentId) return;
    updateComponentProps(selectedComponentId, {
      [eventName]: {
        ...curComponent?.props?.[eventName],
        config: {
          ...curComponent?.props?.[eventName]?.config,
          script: value,
        },
      },
    });
  }

  // 根据组件ID查找组件
  function findComponentById(componentsList: any[], id: number): any | null {
    for (const component of componentsList) {
      if (component.id === id) {
        return component;
      }
      if (component.children && component.children.length > 0) {
        const found = findComponentById(component.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const selectedMethodComponent = selectedMethodComponentId
    ? findComponentById(components, selectedMethodComponentId)
    : null;

  if (!curComponent) return null;

  return (
    <div className='px-[12px]'>
      {(componentEventMap[curComponent.name] || []).map((setting) => (
        <Collapse
          key={setting.name}
          defaultActiveKey={setting.name}
          items={[
            {
              key: setting.name,
              label: setting.label,
              children: (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>动作：</div>
                    <div>
                      <Select
                        style={{ width: 160 }}
                        options={[
                          { label: '显示提示', value: 'showMessage' },
                          { label: '组件方法', value: 'componentFunction' },
                          { label: '设置变量', value: 'setVariable' },
                          { label: '执行脚本', value: 'execScript' },
                          { label: '调用数据源', value: 'callDataSource' },
                        ]}
                        onChange={(value) => { typeChange(setting.name, value); }}
                        value={curComponent?.props?.[setting.name]?.type}
                      />
                    </div>
                  </div>
                  {curComponent?.props?.[setting.name]?.type === 'showMessage' && (
                    <div className='flex flex-col gap-[12px] mt-[12px]'>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>类型：</div>
                        <div>
                          <Select
                            className='w-[160px]'
                            options={[
                              { label: '成功', value: 'success' },
                              { label: '失败', value: 'error' },
                            ]}
                            onChange={(value) => { messageTypeChange(setting.name, value); }}
                            value={curComponent?.props?.[setting.name]?.config?.type}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>文本：</div>
                        <div>
                          <Input
                            className='w-[160px]'
                            onChange={(e) => { messageTextChange(setting.name, e.target.value); }}
                            value={curComponent?.props?.[setting.name]?.config?.text}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {curComponent?.props?.[setting.name]?.type === 'componentFunction' && (
                    <div className='flex flex-col gap-[12px] mt-[12px]'>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>组件：</div>
                        <div>
                          <TreeSelect
                            style={{ width: 160 }}
                            treeData={components as any}
                            fieldNames={{
                              label: 'name',
                              value: 'id',
                            }}
                            onChange={(value) => { componentChange(setting.name, value); }}
                            value={curComponent?.props?.[setting.name]?.config?.componentId}
                          />
                        </div>
                      </div>
                      {componentMethodsMap[selectedMethodComponent?.name || ''] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div>方法：</div>
                          <div>
                            <Select
                              style={{ width: 160 }}
                              options={componentMethodsMap[selectedMethodComponent?.name || ''].map(
                                (method) => ({ label: method.label, value: method.name })
                              )}
                              onChange={(value) => { componentMethodChange(setting.name, value); }}
                              value={curComponent?.props?.[setting.name]?.config?.method}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {curComponent?.props?.[setting.name]?.type === 'setVariable' && (
                    <div className='flex flex-col gap-[12px] mt-[12px]'>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>变量：</div>
                        <div>
                          <Select
                            style={{ width: 160 }}
                            options={variables.map((item) => ({ label: item.remark || item.name, value: item.name }))}
                            onChange={(value) => { variableChange(setting.name, value); }}
                            value={curComponent?.props?.[setting.name]?.config?.variable}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>值：</div>
                        <div>
                          <Input
                            className='w-[160px]'
                            onChange={(e) => { variableValueChange(setting.name, e.target.value); }}
                            value={curComponent?.props?.[setting.name]?.config?.value}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {curComponent?.props?.[setting.name]?.type === 'execScript' && (
                    <div className='flex flex-col gap-[12px] mt-[12px]'>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>脚本：</div>
                        <div>
                          <Input.TextArea
                            style={{ width: 260 }}
                            rows={12}
                            defaultValue={`(function(ctx) {\n  ctx.setData('name', 'hello world');\n  const button = ctx.getComponentRef(1620000000000);\n  if (button) button.startLoading();\n})(ctx)`}
                            value={curComponent?.props?.[setting.name]?.config?.script}
                            onChange={(e) => { scriptChange(setting.name, e.target.value); }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {curComponent?.props?.[setting.name]?.type === 'callDataSource' && (
                    <div className='flex flex-col gap-[12px] mt-[12px]'>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>数据源：</div>
                        <div>
                          <Select
                            className='w-[200px]'
                            placeholder="选择数据源"
                            options={useDataSourceStore.getState().dataSources.map((ds) => ({ label: ds.name, value: ds.id }))}
                            value={curComponent?.props?.[setting.name]?.config?.dataSourceId}
                            onChange={(value) => {
                              if (!selectedComponentId) return;
                              updateComponentProps(selectedComponentId, {
                                [setting.name]: {
                                  type: 'callDataSource',
                                  config: { ...curComponent?.props?.[setting.name]?.config, dataSourceId: value },
                                },
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      ))}
    </div>
  );
};

export default ComponentEvent;
