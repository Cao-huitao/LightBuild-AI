import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { useComponents } from '../stores/components';

interface ComponentItemProps {
  name: string;
  description: string;
}

interface DropResult {
  id?: number;
}

// 一个组件函数 接收name 和description
const ComponentItem: React.FC<ComponentItemProps> = ({ name, description }) => {
  const ref = useRef<HTMLDivElement>(null);//绑定拖拽元素
  const addComponent = useComponents((state) => state.addComponent);
  const selectComponent = useComponents((state) => state.selectComponent);
  
  const getDefaultProps = (componentName: string): any => {
    switch (componentName) {
      case 'Button':
        return { type: 'primary', children: '按钮' };
      case 'Space':
        return { size: 'middle' };
      case 'Input':
        return { placeholder: '请输入...' };
      case 'Text':
        return { children: '文本内容' };
      case 'Image':
        return { src: 'https://placehold.co/200x150/eee/999?text=Image', alt: '图片' };
      case 'Card':
        return { title: '卡片标题' };
      default:
        return {};
    }
  };

  // useDrag ---让组件可以拖拽
  const [{ isDragging }, drag] = useDrag(() => ({
    type: name,//拖拽类型 唯一标识
    item: { type: name },//拖拽时传递的数据
    // 拖拽结束时进行 dnd拖拽的生命周期方法
    // item 拖拽的组件数据  monitor 拖拽的状态工具
    end: (item, monitor) => {
      if (!item) return;
      // 获取传回来的数据 是丢到哪个容器 的信息
      const dropResult = monitor.getDropResult() as DropResult;
      console.log('dropResult:', dropResult);
      
      const newId = Date.now();
      const newComponent = {
        id: newId,
        name: item.type,
        props: getDefaultProps(item.type),
      };

      // 如果 dropResult 存在且有 id，说明放置到了 Space 组件中  ，没有 就是根组件
      const parentId = dropResult && dropResult.id !== undefined ? dropResult.id : undefined;
      console.log('Adding component:', newComponent, 'to parentId:', parentId);
      
      addComponent(newComponent, parentId);
      selectComponent(newId);
    },
    // dnd生命周期 收集拖拽状态 是否正在拖拽
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    // 监听变化 重新生成拖拽
  }), [name, addComponent, selectComponent]);
  // 绑定函数 绑定dom
  drag(ref);

  return (
    <div
      ref={ref}
      className={`px-3 py-3 mb-2 rounded cursor-move text-sm transition-all flex items-center gap-3 ${
        isDragging
          ? 'bg-blue-100 border-blue-300 opacity-50'
          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
      }`}
    >
      <span className="text-gray-600">{description}</span>
    </div>
  );
};

export default ComponentItem;
