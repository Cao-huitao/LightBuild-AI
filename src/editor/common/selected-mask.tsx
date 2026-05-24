import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';

interface Props {
  // 组件id
  componentId: number;
  // 容器class
  containerClassName: string;
  // 相对容器class
  offsetContainerClassName: string;
  // 拖拽开始回调
  onDragStart?: (e: React.MouseEvent) => void;
  // 拖拽移动回调
  onDragMove?: (deltaX: number, deltaY: number) => void;
  // 拖拽结束回调
  onDragEnd?: () => void;
}

function SelectedMask({ 
  componentId, 
  containerClassName, 
  offsetContainerClassName,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props, ref: any) {
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 对外暴露更新位置方法
  useImperativeHandle(ref, () => ({
    updatePosition,
  }));

  useEffect(() => {
    updatePosition();
  }, [componentId]);

  function updatePosition() {
    if (!componentId) return;

    const container = document.querySelector(`.${offsetContainerClassName}`);
    if (!container) return;

    const node = document.querySelector(`[data-component-id="${componentId}"]`);

    if (!node) return;

    // 获取节点位置
    const { top, left, width, height } = node.getBoundingClientRect();
    // 获取容器位置
    const { top: containerTop, left: containerLeft } = container.getBoundingClientRect();

    // 计算位置
    setPosition({
      top: top - containerTop + container.scrollTop,
      left: left - containerLeft,
      width,
      height,
    });
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.left, y: e.clientY - position.top });
    onDragStart?.(e);
  }, [position.left, position.top, onDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x - position.left;
    const deltaY = e.clientY - dragStart.y - position.top;
    onDragMove?.(deltaX, deltaY);
  }, [isDragging, dragStart, position.left, position.top, onDragMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd?.();
    }
  }, [isDragging, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return createPortal((
    <div
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        border: '1px solid rgb(66, 133, 244)',
        cursor: 'move',
        width: position.width,
        height: position.height,
        zIndex: 1003,
        borderRadius: 4,
        boxSizing: 'border-box',
      }}
      onMouseDown={handleMouseDown}
    />
  ), document.querySelector(`.${containerClassName}`)!);
}

export default forwardRef(SelectedMask);
