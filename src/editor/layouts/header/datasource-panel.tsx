import React, { useState } from 'react';
import { Modal, Button, Table, Form, Input, Select, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDataSourceStore, type DataSourceConfig } from '../../stores/datasource';

const { TextArea } = Input;

const DataSourcePanel: React.FC<{ open: boolean; onCancel: () => void }> = ({ open, onCancel }) => {
  const { dataSources, addDataSource, updateDataSource, deleteDataSource } = useDataSourceStore();
  const [editing, setEditing] = useState<DataSourceConfig | null>(null);
  const [form] = Form.useForm();

  function handleSave() {
    const values = form.getFieldsValue();
    const ds: DataSourceConfig = { ...values, id: editing?.id || Date.now().toString() };
    if (editing?.id) {
      updateDataSource(editing.id, ds);
    } else {
      addDataSource(ds);
    }
    setEditing(null);
    form.resetFields();
  }

  function handleEdit(record: DataSourceConfig) {
    setEditing(record);
    form.setFieldsValue(record);
  }

  function handleDelete(id: string) {
    deleteDataSource(id);
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
    { title: '方法', dataIndex: 'method', key: 'method', width: 70 },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
    { title: '映射路径', dataIndex: 'responseMapping', key: 'responseMapping', width: 120, render: (v: string) => v || '-' },
    {
      title: '操作', key: 'actions', width: 120,
      render: (_: any, record: DataSourceConfig) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="数据源管理"
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <div className="mb-4">
        {editing ? (
          <div className="p-3 bg-gray-50 rounded mb-3">
            <div className="text-xs font-bold mb-2">{editing.id ? '编辑数据源' : '新增数据源'}</div>
            <Form form={form} layout="vertical" size="small">
              <div className="flex gap-2">
                <Form.Item name="name" label="名称" rules={[{ required: true }]} className="flex-1">
                  <Input placeholder="getUserList" />
                </Form.Item>
                <Form.Item name="method" label="方法" initialValue="GET" className="w-24">
                  <Select options={['GET','POST','PUT','DELETE'].map(m=>({label:m,value:m}))} />
                </Form.Item>
              </div>
              <Form.Item name="url" label="URL" rules={[{ required: true }]}>
                <Input placeholder="https://api.example.com/users" />
              </Form.Item>
              <Form.Item name="headers" label="Headers (JSON)">
                <Input placeholder='{"Authorization":"Bearer xxx"}' />
              </Form.Item>
              {form.getFieldValue('method') !== 'GET' && (
                <Form.Item name="body" label="Body (JSON)">
                  <TextArea rows={2} placeholder='{"key":"value"}' />
                </Form.Item>
              )}
              <Form.Item name="responseMapping" label="响应映射路径" tooltip="如 data.list 表示取 response.data.list">
                <Input placeholder="data.list" />
              </Form.Item>
            </Form>
            <div className="flex gap-2 mt-2">
              <Button type="primary" size="small" onClick={handleSave}>保存</Button>
              <Button size="small" onClick={() => { setEditing(null); form.resetFields(); }}>取消</Button>
            </div>
          </div>
        ) : (
          <Button icon={<PlusOutlined />} onClick={() => setEditing({ id: '', name: '', method: 'GET', url: '', responseMapping: '' })}>
            新增数据源
          </Button>
        )}
      </div>
      <Table
        dataSource={dataSources}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: '暂无数据源' }}
      />
    </Modal>
  );
};

export default DataSourcePanel;
