import React, { useState } from 'react';
import { Button, Space } from 'antd';
import { useComponents } from '../../stores/components';
import ComponentTree from './component-tree';
import DefineVariable from './define-variable';

const Header: React.FC = () => {
  const [treeOpen, setTreeOpen] = useState(false);
  const [variableOpen, setVariableOpen] = useState(false);
  const { mode, setMode, selectComponent } = useComponents();

  return (
    <div className='flex justify-end w-[100%] px-[24px]'>
      <Space>
        {mode === 'edit' && (
          <>
            <Button
              onClick={() => {
                setVariableOpen(true);
              }}
              type='primary'
            >
              定义变量
            </Button>
            <Button
              onClick={() => {
                setTreeOpen(true);
              }}
            >
              组件树
            </Button>
            <Button
              onClick={() => {
                setMode('preview');
                selectComponent(null);
              }}
              type='primary'
            >
              预览
            </Button>
          </>
        )}
        {mode === 'preview' && (
          <Button
            onClick={() => { setMode('edit'); }}
            type='primary'
          >
            退出预览
          </Button>
        )}
      </Space>
      <ComponentTree
        open={treeOpen}
        onCancel={() => { setTreeOpen(false); }}
      />
      <DefineVariable
        open={variableOpen}
        onCancel={() => { setVariableOpen(false); }}
      />
    </div>
  );
};

export default Header;
