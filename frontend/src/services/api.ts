import { QueryClient, useQuery } from '@tanstack/react-query';
export type Row = Record<string, any>;
export const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false },
  },
});
export async function api(path: string, method = 'GET', body?: any) {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'include',
    headers:
      body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
        ? body
        : JSON.stringify(body),
  });
  const data = await res
    .json()
    .catch(() => ({ message: 'Server unavailable' }));
  if (!res.ok)
    throw Object.assign(new Error(data.message || 'Request failed'), {
      status: res.status,
    });
  return data;
}
export const money = (v: number) =>
  'Rs. ' + Number(v || 0).toLocaleString('en-PK');
export const date = (v: string) =>
  new Date(v).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
export const useData = (path: string) =>
  useQuery<any, Error>({ queryKey: [path], queryFn: () => api(path) });
