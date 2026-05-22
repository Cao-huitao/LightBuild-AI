import { SettingOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import React, { useState } from 'react';
import SelectVariableModal from '../select-variable-modal';

interface Value {
  type: 'static' | 'variable';
  value: any;
}

interface Props {
  value?: Value;
  onChange?: (value: Value) => void;
}

function resolveDisplayValue(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && value.type === 'static') return value.value ?? '';
  if (value && typeof value === 'object' && value.type === 'variable') return '';
  return '';
}

const SettingFormItemInput: React.FC<Props> = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);

  function valueChange(e: any) {
    onChange && onChange({
      type: 'static',
      value: e?.target?.value,
    });
  }

  function select(record: any) {
    onChange && onChange({
      type: 'variable',
      value: record.name,
    });

    setVisible(false);
  }

  return (
    <div className='flex gap-[8px]'>
      <Input
        disabled={value?.type === 'variable'}
        value={resolveDisplayValue(value)}
        onChange={valueChange}
      />
      <SettingOutlined
        onClick={() => { setVisible(true); }}
        className='cursor-pointer'
        style={{ color: value?.type === 'variable' ? 'blue' : '' }}
      />
      <SelectVariableModal
        open={visible}
        onCancel={() => { setVisible(false); }}
        onSelect={select}
      />
    </div>
  );
};

export default SettingFormItemInput;
