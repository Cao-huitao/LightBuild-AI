import type { Component } from '../types';

export const defaultComponents: Component[] = [
  {
    id: 1,
    name: 'Text',
    props: { text: '欢迎使用低代码编辑器', fontSize: '24px', color: '#1a1a1a' },
  },
  {
    id: 2,
    name: 'Text',
    props: { text: '拖拽组件到画布上开始创作', fontSize: '16px', color: '#666' },
  },
  {
    id: 3,
    name: 'Input',
    props: { placeholder: '请输入内容...' },
  },
  {
    id: 4,
    name: 'Button',
    props: { text: '点击我' },
  },
];
