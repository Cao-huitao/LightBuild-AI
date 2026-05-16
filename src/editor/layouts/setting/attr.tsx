import React from 'react';
import { Form, Select, Input, Tooltip, Button, Space } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { ITEM_TYPE } from '../../item-type';
import { useComponents, useSelectedComponent } from '../../stores/components';
import SettingFormItemInput from '../../common/setting-form-item/input';

const componentSettingMap: Record<string, any[]> = {
  [ITEM_TYPE.BUTTON]: [{
    name: 'type',
    label: '按钮类型',
    type: 'select',
    options: [{ label: '主按钮', value: 'primary' }, { label: '次按钮', value: 'default' }],
  }, {
    name: 'children',
    label: '文本',
    type: 'input',
  }],
  [ITEM_TYPE.SPACE]: [
    {
      name: 'size',
      label: '间距大小',
      type: 'select',
      options: [
        { label: '大', value: 'large' },
        { label: '中', value: 'middle' },
        { label: '小', value: 'small' },
      ],
    },
  ],
  [ITEM_TYPE.INPUT]: [
    {
      name: 'placeholder',
      label: '占位文本',
      type: 'input',
    },
  ],
};

const ComponentAttr: React.FC = () => {
  const selectedComponentId = useComponents((state) => state.selectedComponentId);
  const updateComponentProps = useComponents((state) => state.updateComponentProps);
  const deleteComponent = useComponents((state) => state.deleteComponent);
  const copyComponent = useComponents((state) => state.copyComponent);
  const moveComponent = useComponents((state) => state.moveComponent);
  const curComponent = useSelectedComponent();
  const [copied, setCopied] = useState(false);

  const [form] = Form.useForm();

  // 复制组件ID
  const copyComponentId = async () => {
    if (selectedComponentId) {
      await navigator.clipboard.writeText(selectedComponentId.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    form.setFieldsValue(curComponent?.props);
  }, [curComponent, form]);

  function renderFormElement(setting: any) {
    const { type, options } = setting;

    if (type === 'select') {
      return <Select options={options} />;
    } else if (type === 'input') {
      return <SettingFormItemInput />;
    }
    return null;
  }

  function valueChange(changeValues: any) {
    if (selectedComponentId) {
      updateComponentProps(selectedComponentId, changeValues);
    }
  }

  if (!selectedComponentId || !curComponent) {
    return null;
  }

  return (
    <div className='pt-[20px] px-4'>
      <div className='mb-4'>
        <Space size='small'>
          <Tooltip title="上移">
            <Button
              size='small'
              icon={<ArrowUpOutlined />}
              onClick={() => moveComponent(selectedComponentId!, 'up')}
            />
          </Tooltip>
          <Tooltip title="下移">
            <Button
              size='small'
              icon={<ArrowDownOutlined />}
              onClick={() => moveComponent(selectedComponentId!, 'down')}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              size='small'
              icon={<CopyOutlined />}
              onClick={() => copyComponent(selectedComponentId!)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              size='small'
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteComponent(selectedComponentId!)}
            />
          </Tooltip>
        </Space>
      </div>
      <Form
        form={form}
        onValuesChange={valueChange}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 14 }}
      >
        <Form.Item label="组件ID">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input disabled value={selectedComponentId} />
            <Tooltip title={copied ? '已复制' : '复制ID'}>
              <button
                onClick={copyComponentId}
                style={{
                  border: 'none',
                  background: '#f5f5f5',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {copied ? (
                  <CheckOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CopyOutlined />
                )}
              </button>
            </Tooltip>
          </div>
        </Form.Item>
        {(componentSettingMap[curComponent.name] || []).map((setting) => (
          <Form.Item key={setting.name} name={setting.name} label={setting.label}>
            {renderFormElement(setting)}
          </Form.Item>
        ))}
      </Form>
    </div>
  );
};

export default ComponentAttr;
