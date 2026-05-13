import React from 'react';
import ComponentItem from '../../common/component-item';
import { ITEM_TYPE } from '../../item-type';

const Material: React.FC = () => {
  return (
    <div className="w-full h-full p-4">
      <span className="font-bold text-gray-700 mb-4 block">物料区</span>
      <div className="mt-4">
        <ComponentItem description="按钮" name={ITEM_TYPE.BUTTON} />
        <ComponentItem description="间距" name={ITEM_TYPE.SPACE} />
        <ComponentItem description="输入框" name={ITEM_TYPE.INPUT} />
      </div>
    </div>
  );
};

export default Material;
