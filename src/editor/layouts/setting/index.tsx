import { Segmented } from 'antd';
import type { SegmentedValue } from 'antd/es/segmented';
import { useState } from 'react';
import { useComponents, useSelectedComponent } from '../../stores/components';
import ComponentAttr from './attr';
import ComponentEvent from './event';

const Setting: React.FC = () => {
  const selectedComponentId = useComponents((state) => state.selectedComponentId);
  const curComponent = useSelectedComponent();

  const [key, setKey] = useState<SegmentedValue>('属性');

  if (!selectedComponentId || !curComponent) {
    return (
      <div className='pt-[20px] text-center text-gray-400'>
        请选择组件
      </div>
    );
  }

  return (
    <div>
      <Segmented value={key} onChange={setKey} block options={['属性', '事件']} />
      <div className='pt-[20px]'>
        {key === '属性' && <ComponentAttr />}
        {key === '事件' && <ComponentEvent />}
      </div>
    </div>
  );
};

export default Setting;
