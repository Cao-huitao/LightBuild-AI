import { useDataSourceStore, type DataSourceConfig } from '../stores/datasource';
import { usePageDataStore } from '../stores/page-data';

function getByPath(obj: any, path: string): any {
  if (!path) return obj;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}

function parseHeaders(headersStr?: string): Record<string, string> {
  if (!headersStr) return {};
  try {
    return JSON.parse(headersStr);
  } catch {
    return {};
  }
}

export interface ExecuteResult {
  success: boolean;
  data: any;
  error?: string;
}

export async function executeDataSource(dsId: string): Promise<ExecuteResult> {
  const ds = useDataSourceStore.getState().dataSources.find((d) => d.id === dsId);
  if (!ds) return { success: false, data: null, error: '数据源未找到' };

  try {
    const fetchOptions: RequestInit = {
      method: ds.method,
      headers: {
        'Content-Type': 'application/json',
        ...parseHeaders(ds.headers),
      },
    };

    if (ds.method !== 'GET' && ds.body) {
      try {
        fetchOptions.body = JSON.stringify(JSON.parse(ds.body));
      } catch {
        fetchOptions.body = ds.body;
      }
    }

    const res = await fetch(ds.url, fetchOptions);
    if (!res.ok) {
      return { success: false, data: null, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const json = await res.json();
    const data = getByPath(json, ds.responseMapping);

    // 存储到 pageDataStore，以 $ 前缀变量名
    const varName = `$${ds.name}`;
    usePageDataStore.getState().setData(varName, data);

    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || '请求失败' };
  }
}
