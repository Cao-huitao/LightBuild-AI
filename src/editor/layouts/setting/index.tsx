import { Segmented } from 'antd';
import type { SegmentedValue } from 'antd/es/segmented';
import { useState } from 'react';
import { useComponents, useSelectedComponent, useSelectedComponents } from '../../stores/components';
import ComponentAttr from './attr';
import ComponentStyle from './style';
import ComponentEvent from './event';
import ComponentAI from './ai';

const Setting: React.FC = () => {
  const selectedComponentIds = useComponents((state) => state.selectedComponentIds);
  const curComponent = useSelectedComponent();
  const selectedComponents = useSelectedComponents();

  const [key, setKey] = useState<SegmentedValue>('属性');
  const count = selectedComponentIds.length;

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

  if (count === 0) {
    return (
      <div>
        <Segmented value={key} onChange={setKey} block options={['属性', '样式', '事件', 'AI']} />
        <div className='pt-[20px] text-center text-gray-400'>
          请选择组件
        </div>
      </div>
    );
  }

  if (count > 1) {
    return (
      <div>
        <Segmented value={key} onChange={setKey} block options={['属性', '样式', '事件', 'AI']} />
        <div className='pt-[20px]'>
          <div className='text-center text-xs text-gray-400 mb-4'>已选中 {count} 个组件</div>
          {key === '样式' && <ComponentStyle />}
          {key === '属性' && (
            <div className='text-center text-gray-400 text-xs'>多选时不支持属性编辑</div>
          )}
          {key === '事件' && (
            <div className='text-center text-gray-400 text-xs'>多选时不支持事件编辑</div>
          )}
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
