import React, { useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { ITEM_TYPE } from '../../item-type';
import { useComponents } from '../../stores/components';
import Renderer from './Renderer';
import SelectedMask from '../../common/selected-mask';

const EditStage: React.FC = () => {
  const dropRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<any>(null);
  const selectComponent = useComponents((state) => state.selectComponent);
  const selectedComponentId = useComponents((state) => state.selectedComponentId);
  const components = useComponents((state) => state.components);

  const [{ canDrop }, connectDropTarget] = useDrop(() => ({
    accept: [
      ITEM_TYPE.SPACE,
      ITEM_TYPE.BUTTON,
      ITEM_TYPE.INPUT,
    ],
    drop: () => {
      return undefined;
    },
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
    }),
  }), []);

  const setRef = (node: HTMLDivElement | null) => {
    dropRef.current = node;
    (connectDropTarget as any)(node);
  };

  useEffect(() => {
    function createMask(e: any) {
      const path = e.composedPath();
      for (let i = 0; i < path.length; i++) {
        const ele = path[i];
        if (ele.getAttribute) {
          if (ele.getAttribute('data-component-id')) {
            const componentId = ele.getAttribute('data-component-id');
            selectComponent(parseInt(componentId));
            return;
          }
        }
      }
      selectComponent(null);
    }

    const container = document.querySelector('.stage');
    if (container) {
      container.addEventListener('click', createMask, true);
    }

    return () => {
      const container = document.querySelector('.stage');
      if (container) {
        container.removeEventListener('click', createMask, true);
      }
    };
  }, [selectComponent]);

  useEffect(() => {
    if (selectedComponentId && maskRef.current && maskRef.current.updatePosition) {
      maskRef.current.updatePosition();
    }
  }, [selectedComponentId, components]);

  return (
    <div
      ref={setRef}
      style={{ border: canDrop ? '1px solid #ccc' : 'none' }}
      className='stage-container stage p-[24px] h-[100%] relative'
    >
      <Renderer />
      {selectedComponentId && (
        <SelectedMask
          ref={maskRef}
          componentId={selectedComponentId}
          containerClassName='stage-container'
          offsetContainerClassName='stage-container'
        />
      )}
    </div>
  );
};

export default EditStage;
