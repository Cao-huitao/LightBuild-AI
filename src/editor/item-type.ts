export const ITEM_TYPE = {
  BUTTON: 'Button',
  SPACE: 'Space',
  INPUT: 'Input',
  TEXT: 'Text',
  IMAGE: 'Image',
  CARD: 'Card',
};

export type ItemType = typeof ITEM_TYPE[keyof typeof ITEM_TYPE];
