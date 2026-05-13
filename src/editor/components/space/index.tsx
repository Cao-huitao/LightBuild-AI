import { Space as AntdSpace } from 'antd';
import React, { useRef } from "react";
import { useDrop } from 'react-dnd';
import { ITEM_TYPE } from '../../item-type';

interface Props {
  children?: React.ReactNode;
  id: number;
}

const Space: React.FC<Props> = ({ children, id }) => {
  const dropRef = useRef<HTMLDivElement>(null);

  const [{ canDrop }, drop] = useDrop(() => ({
    accept: [ITEM_TYPE.SPACE, ITEM_TYPE.BUTTON, ITEM_TYPE.INPUT],
    drop: (_, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) {
        return;
      }

      return {
        id,
      };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  drop(dropRef);

  const childrenArray = React.Children.toArray(children);

  if (!childrenArray.length) {
    return (
      <AntdSpace ref={dropRef} className='p-[16px]' style={{ border: canDrop ? '1px solid #ccc' : 'none', minWidth: '200px', minHeight: '100px' }} data-component-id={id}>
        暂无内容
      </AntdSpace>
    );
  }

  return (
    <AntdSpace ref={dropRef} className='p-[16px]' style={{ border: canDrop ? '1px solid #ccc' : 'none' }} data-component-id={id}>
      {children}
    </AntdSpace>
  );
};

export default Space;
