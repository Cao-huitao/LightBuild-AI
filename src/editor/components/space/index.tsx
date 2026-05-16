import { Space as AntdSpace } from 'antd';
import React, { useRef } from "react";
import { useDrop } from 'react-dnd';
import { ITEM_TYPE } from '../../item-type';

interface Props {
  children?: React.ReactNode;
  id: number;
  [key: string]: any;
}

const Space: React.FC<Props> = ({ children, id, ref: rendererRef, ...rest }) => {
  const dropRef = useRef<HTMLDivElement>(null);

  const [{ canDrop }, drop] = useDrop(() => ({
    accept: [ITEM_TYPE.SPACE, ITEM_TYPE.BUTTON, ITEM_TYPE.INPUT],
    drop: (_, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) return;
      return { id };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  drop(dropRef);

  // Merge refs: react-dnd's dropRef + renderer's componentRefs callback
  function setRef(node: any) {
    dropRef.current = node;
    if (typeof rendererRef === 'function') {
      rendererRef(node);
    }
  }

  const childrenArray = React.Children.toArray(children);
  const isEmpty = !childrenArray.length;

  return (
    <AntdSpace
      ref={setRef}
      className='p-[16px]'
      style={{
        border: canDrop ? '1px dashed #1677ff' : isEmpty ? '1px dashed #d9d9d9' : 'none',
        minWidth: isEmpty ? 320 : undefined,
        minHeight: isEmpty ? 200 : undefined,
        width: isEmpty ? undefined : 'fit-content',
        height: isEmpty ? undefined : 'fit-content',
        boxSizing: 'border-box',
        ...rest.style,
      }}
      data-component-id={id}
      {...rest}
    >
      {isEmpty ? '拖入组件到此处' : children}
    </AntdSpace>
  );
};

export default Space;
