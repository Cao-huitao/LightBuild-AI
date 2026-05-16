import React, { useState, useEffect } from 'react';
import { Button, Space, Tooltip } from 'antd';
import { UndoOutlined, RedoOutlined } from '@ant-design/icons';
import { useComponents } from '../../stores/components';
import ComponentTree from './component-tree';
import DefineVariable from './define-variable';

const Header: React.FC = () => {
  const [treeOpen, setTreeOpen] = useState(false);
  const [variableOpen, setVariableOpen] = useState(false);
  const { mode, setMode, selectComponent, undo, redo, history, future } = useComponents();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  return (
    <div className='flex justify-end w-[100%] px-[24px]'>
      <Space>
        {mode === 'edit' && (
          <>
            <Tooltip title="撤销 (Ctrl+Z)">
              <Button
                disabled={history.length === 0}
                onClick={undo}
                icon={<UndoOutlined />}
              />
            </Tooltip>
            <Tooltip title="重做 (Ctrl+Y)">
              <Button
                disabled={future.length === 0}
                onClick={redo}
                icon={<RedoOutlined />}
              />
            </Tooltip>
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
