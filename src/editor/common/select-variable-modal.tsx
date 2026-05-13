import { Modal, Table } from 'antd';
import React from 'react';
import { useVariablesStore } from '../stores/variable';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSelect: (record: any) => void;
}

const SelectVariableModal: React.FC<Props> = ({ open, onCancel, onSelect }) => {
  const variables = useVariablesStore((state) => state.variables);

  const columns = [
    {
      title: '变量名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
    },
  ];

  function handleSelect(record: any) {
    onSelect(record);
  }

  return (
    <Modal
      open={open}
      title="选择变量"
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={600}
    >
      <Table
        dataSource={variables}
        columns={columns}
        rowKey="name"
        onRow={(record) => ({
          onClick: () => handleSelect(record),
          style: { cursor: 'pointer' },
        })}
        pagination={false}
      />
    </Modal>
  );
};

export default SelectVariableModal;
