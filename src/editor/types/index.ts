export interface Component {
  /**
   * 组件唯一标识
   */
  id: number;
  /**
   * 组件名称
   */
  name: string;
  /**
   * 组件属性
   */
  props: any;
  /**
   * 子组件
   */
  children?: Component[];
  /**
   * x坐标位置
   */
  x?: number;
  /**
   * y坐标位置
   */
  y?: number;
}
