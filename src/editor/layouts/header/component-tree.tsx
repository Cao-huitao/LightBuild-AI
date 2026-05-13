import { Modal, Tree } from 'antd';
import { useComponents } from '../../stores/components';

interface ComponentTreeProps {
  open: boolean;
  onCancel: () => void;
}

const ComponentTree = ({ open, onCancel }: ComponentTreeProps) => {
  const { components, selectComponent } = useComponents();

  function componentSelect([selectedKey]: any[]) {
    selectComponent(selectedKey);
    onCancel && onCancel();
  }

  return (
    <Modal
      open={open}
      title="组件树"
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={400}
    >
      <Tree
        fieldNames={{ title: 'name', key: 'id' }}
        treeData={components as any}
        showLine
        defaultExpandAll
        onSelect={componentSelect}
      />
    </Modal>
  );
};

export default ComponentTree;
