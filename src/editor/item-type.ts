export const ITEM_TYPE = {
  BUTTON: 'Button',
  SPACE: 'Space',
  INPUT: 'Input',
};

export type ItemType = typeof ITEM_TYPE[keyof typeof ITEM_TYPE];
