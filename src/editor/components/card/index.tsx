import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { ITEM_TYPE } from '../../item-type';

interface Props {
  children?: React.ReactNode;
  id: number;
  [key: string]: any;
}

const Card: React.FC<Props> = ({ children, id, ref: rendererRef, title, style, ...rest }) => {
  const dropRef = useRef<HTMLDivElement>(null);

  const [{ canDrop }, drop] = useDrop(() => ({
    accept: [ITEM_TYPE.SPACE, ITEM_TYPE.BUTTON, ITEM_TYPE.INPUT, ITEM_TYPE.TEXT, ITEM_TYPE.IMAGE, ITEM_TYPE.CARD],
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

  function setRef(node: any) {
    dropRef.current = node;
    if (typeof rendererRef === 'function') {
      rendererRef(node);
    }
  }

  const childrenArray = React.Children.toArray(children);
  const isEmpty = !childrenArray.length;

  return (
    <div
      ref={setRef}
      data-component-id={id}
      className="rounded-lg overflow-hidden"
      style={{
        border: canDrop ? '2px dashed #1677ff' : '1px solid #e8e8e8',
        minWidth: isEmpty ? 260 : 'fit-content',
        minHeight: isEmpty ? 160 : 'fit-content',
        boxSizing: 'border-box',
        background: '#fff',
        ...style,
      }}
      {...rest}
    >
      <div
        className="px-3 py-2 font-medium text-sm"
        style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}
      >
        {title || '卡片标题'}
      </div>
      <div className="p-3 flex flex-col gap-2">
        {isEmpty ? (
          <span className="text-gray-400 text-xs">拖入组件到此处</span>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default Card;
