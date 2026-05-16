import React from 'react';
import { Form, Input, InputNumber, Select, ColorPicker } from 'antd';
import { useEffect } from 'react';
import { useComponents, useSelectedComponent } from '../../stores/components';

const borderStyleOptions = [
  { label: '实线', value: 'solid' },
  { label: '虚线', value: 'dashed' },
  { label: '点线', value: 'dotted' },
];

const ComponentStyle: React.FC = () => {
  const selectedComponentId = useComponents((state) => state.selectedComponentId);
  const updateComponentStyles = useComponents((state) => state.updateComponentStyles);
  const curComponent = useSelectedComponent();
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(curComponent?.props?.style || {});
  }, [curComponent, form]);

  function valueChange(_changed: any, allValues: any) {
    if (!selectedComponentId) return;
    // Clean empty/undefined values
    const cleaned: Record<string, any> = {};
    Object.keys(allValues).forEach((k) => {
      const v = allValues[k];
      if (v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && isNaN(v))) {
        cleaned[k] = v;
      }
    });
    updateComponentStyles(selectedComponentId, cleaned);
  }

  if (!selectedComponentId || !curComponent) return null;

  return (
    <div className='pt-[20px] px-4'>
      <Form
        form={form}
        onValuesChange={valueChange}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        size='small'
      >
        {/* Layout */}
        <div className='text-xs text-gray-400 mb-2 font-bold'>布局</div>
        <Form.Item name='width' label='宽度'>
          <Input placeholder='如 200px / 100%' />
        </Form.Item>
        <Form.Item name='height' label='高度'>
          <Input placeholder='如 100px / auto' />
        </Form.Item>

        {/* Margin */}
        <div className='text-xs text-gray-400 mb-2 mt-4 font-bold'>外边距</div>
        <div className='flex gap-2'>
          <Form.Item name='marginTop' label='上' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
          <Form.Item name='marginRight' label='右' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
        </div>
        <div className='flex gap-2'>
          <Form.Item name='marginBottom' label='下' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
          <Form.Item name='marginLeft' label='左' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
        </div>

        {/* Border */}
        <div className='text-xs text-gray-400 mb-2 mt-4 font-bold'>边框</div>
        <div className='flex gap-2'>
          <Form.Item name='borderWidth' label='宽度' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
          <Form.Item name='borderStyle' label='样式' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <Select options={borderStyleOptions} placeholder='solid' allowClear />
          </Form.Item>
        </div>
        <Form.Item name='borderColor' label='颜色'>
          <ColorPicker showText format='hex' style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name='borderRadius' label='圆角'>
          <InputNumber min={0} style={{ width: '100%' }} placeholder='0' />
        </Form.Item>

        {/* Shadow */}
        <div className='text-xs text-gray-400 mb-2 mt-4 font-bold'>阴影</div>
        <div className='flex gap-2'>
          <Form.Item name='shadowX' label='X' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
          <Form.Item name='shadowY' label='Y' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
        </div>
        <div className='flex gap-2'>
          <Form.Item name='shadowBlur' label='模糊' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
          <Form.Item name='shadowSpread' label='扩散' labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
            <InputNumber style={{ width: '100%' }} placeholder='0' />
          </Form.Item>
        </div>
        <Form.Item name='shadowColor' label='阴影色'>
          <ColorPicker showText format='hex' style={{ width: '100%' }} />
        </Form.Item>

        {/* Colors & Font */}
        <div className='text-xs text-gray-400 mb-2 mt-4 font-bold'>颜色与文字</div>
        <Form.Item name='backgroundColor' label='背景色'>
          <ColorPicker showText format='hex' style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name='color' label='文字色'>
          <ColorPicker showText format='hex' style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name='fontSize' label='字号'>
          <InputNumber min={8} max={200} style={{ width: '100%' }} placeholder='14' />
        </Form.Item>
      </Form>
    </div>
  );
};

export default ComponentStyle;
