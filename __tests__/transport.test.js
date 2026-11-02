import { request } from '../src/services/client';
import { config } from '../src/services/config';
const originalFetch = global.fetch;
beforeEach(() => {
  config.mode = 'api';
  global.fetch = jest.fn();
});
afterEach(() => {
  config.mode = 'mock';
  global.fetch = originalFetch;
});
const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
test('API client sends JSON and cookies, normalizes auth, and exposes retryable errors', async () => {
  fetch.mockResolvedValueOnce(response({ message: 'Login required' }, 401));
  expect(await request('/auth/me')).toBeNull();
  fetch.mockResolvedValueOnce(response({ id: 'a' }));
  await request('/products', 'POST', { name: 'Milk' });
  expect(fetch.mock.calls.at(-1)[1]).toMatchObject({
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ name: 'Milk' }),
  });
  fetch.mockResolvedValueOnce(response({ message: 'Insufficient stock' }, 409));
  await expect(request('/orders/a/accept', 'POST', {})).rejects.toMatchObject({
    message: 'Insufficient stock',
    status: 409,
  });
  fetch.mockRejectedValueOnce(new Error('Network unavailable'));
  await expect(request('/products')).rejects.toThrow('Network unavailable');
  fetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('Bad JSON');
    },
  });
  await expect(request('/products')).rejects.toThrow('invalid response');
  fetch.mockRejectedValueOnce(
    Object.assign(new Error('aborted'), { name: 'AbortError' }),
  );
  await expect(request('/products')).rejects.toThrow('timed out');
});
test('API adapter maps working hours, holiday arrays, earnings and reward ledger', async () => {
  fetch.mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({}));
  await request('/shop/hours', 'PATCH', {
    workingHours: { Mon: { open: '08:00', close: '23:00' } },
    holidays: ['2026-12-25'],
  });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    Mon: { open: '08:00', close: '23:00' },
  });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
    holidays: ['2026-12-25'],
  });
  fetch
    .mockResolvedValueOnce(response({ transactions: [] }))
    .mockResolvedValueOnce(response([{ id: 'order' }]));
  expect((await request('/earnings')).orders).toEqual([{ id: 'order' }]);
  fetch.mockResolvedValueOnce(
    response({ points: 48, ledger: [{ id: 'reward' }] }),
  );
  expect((await request('/rewards')).history).toEqual([{ id: 'reward' }]);
});
