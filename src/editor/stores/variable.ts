import { create } from 'zustand';

export interface Variable {
  /**
   * 变量名
   */
  name: string;
  /**
   * 默认值
   */
  defaultValue: string;
  /**
   * 备注
   */
  remark: string;
}

interface State {
  variables: Variable[];
}

interface Action {
  /**
   * 设置变量列表
   * @param variables 变量列表
   * @returns
   */
  setVariables: (variables: Variable[]) => void;
  
  /**
   * 添加变量
   * @param variable 变量
   * @returns
   */
  addVariable: (variable: Variable) => void;
  
  /**
   * 删除变量
   * @param name 变量名
   * @returns
   */
  removeVariable: (name: string) => void;
  
  /**
   * 更新变量
   * @param name 变量名
   * @param variable 新变量
   * @returns
   */
  updateVariable: (name: string, variable: Partial<Variable>) => void;
}

export const useVariablesStore = create<State & Action>((set) => ({
  variables: [],
  
  setVariables: (variables) => set({ variables }),
  
  addVariable: (variable) => set((state) => ({
    variables: [...state.variables, variable],
  })),
  
  removeVariable: (name) => set((state) => ({
    variables: state.variables.filter((v) => v.name !== name),
  })),
  
  updateVariable: (name, variable) => set((state) => ({
    variables: state.variables.map((v) =>
      v.name === name ? { ...v, ...variable } : v
    ),
  })),
}));
