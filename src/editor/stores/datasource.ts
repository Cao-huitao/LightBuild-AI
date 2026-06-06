import { create } from 'zustand';

export interface DataSourceConfig {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: string;
  body?: string;
  responseMapping: string;
}

interface DataSourceState {
  dataSources: DataSourceConfig[];
  addDataSource: (ds: DataSourceConfig) => void;
  updateDataSource: (id: string, ds: Partial<DataSourceConfig>) => void;
  deleteDataSource: (id: string) => void;
}

export const useDataSourceStore = create<DataSourceState>((set) => ({
  dataSources: [],
  addDataSource: (ds) =>
    set((state) => ({ dataSources: [...state.dataSources, ds] })),
  updateDataSource: (id, partial) =>
    set((state) => ({
      dataSources: state.dataSources.map((ds) =>
        ds.id === id ? { ...ds, ...partial } : ds,
      ),
    })),
  deleteDataSource: (id) =>
    set((state) => ({
      dataSources: state.dataSources.filter((ds) => ds.id !== id),
    })),
}));
