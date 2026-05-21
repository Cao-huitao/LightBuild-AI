import React, { forwardRef } from 'react';

interface Props {
  children?: React.ReactNode;
  id?: number;
  [key: string]: any;
}

const Text = forwardRef<any, Props>(({ children, id, style, ...rest }, ref) => {
  return (
    <span
      ref={ref}
      data-component-id={id}
      className="inline-block"
      style={{
        fontSize: 14,
        color: '#333',
        ...style,
      }}
      {...rest}
    >
      {children || '文本'}
    </span>
  );
});

Text.displayName = 'Text';

export default Text;
