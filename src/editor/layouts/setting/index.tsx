import { Segmented } from 'antd';
import type { SegmentedValue } from 'antd/es/segmented';
import { useState } from 'react';
import { useComponents, useSelectedComponent } from '../../stores/components';
import ComponentAttr from './attr';
import ComponentStyle from './style';
import ComponentEvent from './event';
import ComponentAI from './ai';

const Setting: React.FC = () => {
  const selectedComponentId = useComponents((state) => state.selectedComponentId);
  const curComponent = useSelectedComponent();

  const [key, setKey] = useState<SegmentedValue>('属性');

  if (key === 'AI') {
    return (
      <div>
        <Segmented value={key} onChange={setKey} block options={['属性', '样式', '事件', 'AI']} />
        <div className='pt-[20px]'>
          <ComponentAI />
        </div>
      </div>
    );
  }

  if (!selectedComponentId || !curComponent) {
    return (
      <div>
        <Segmented value={key} onChange={setKey} block options={['属性', '样式', '事件', 'AI']} />
        <div className='pt-[20px] text-center text-gray-400'>
          请选择组件
        </div>
      </div>
    );
  }

  return (
    <div>
      <Segmented value={key} onChange={setKey} block options={['属性', '样式', '事件', 'AI']} />
      <div className='pt-[20px]'>
        {key === '属性' && <ComponentAttr />}
        {key === '样式' && <ComponentStyle />}
        {key === '事件' && <ComponentEvent />}
      </div>
    </div>
  );
};

export default Setting;
