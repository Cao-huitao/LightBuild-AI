import React, { forwardRef } from 'react';

interface Props {
  children?: React.ReactNode;
  id?: number;
  [key: string]: any;
}

const Image = forwardRef<any, Props>(({ id, style, src, alt, ...rest }, ref) => {
  return (
    <img
      ref={ref}
      data-component-id={id}
      src={src || 'https://placehold.co/200x150/eee/999?text=Image'}
      alt={alt || '图片'}
      style={{
        display: 'block',
        maxWidth: '100%',
        width: 200,
        height: 150,
        objectFit: 'cover',
        ...style,
      }}
      {...rest}
    />
  );
});

Image.displayName = 'Image';

export default Image;
