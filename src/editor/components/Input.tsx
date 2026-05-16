import React from 'react';

interface InputProps {
  placeholder?: string;
  value?: string;
  [key: string]: any;
}

const Input: React.FC<InputProps> = ({ placeholder = '请输入...', value, style, ...rest }) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
      style={style}
      {...rest}
    />
  );
};

export default Input;
