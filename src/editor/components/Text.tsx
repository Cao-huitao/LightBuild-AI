import React from 'react';

interface TextProps {
  text?: string;
  fontSize?: string;
  color?: string;
}

const Text: React.FC<TextProps> = ({ text = 'Hello World', fontSize = '16px', color = '#333' }) => {
  return (
    <span style={{ fontSize, color }}>
      {text}
    </span>
  );
};

export default Text;
