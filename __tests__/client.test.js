import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from '../src/services/client';

beforeEach(async () => {
  await request('/auth/demo', 'POST', {});
});

test('invalid stock, stale edits and incomplete requests do not mutate data', async () => {
  const before = await request('/products');
  await expect(
    request('/products', 'POST', {
      name: 'Negative stock',
      pricePkr: 100,
      quantity: -1,
    }),
  ).rejects.toThrow('stock');
  await expect(
    request('/products/deleted-product', 'PATCH', {
      name: 'Ghost',
      pricePkr: 100,
      quantity: 1,
    }),
  ).rejects.toThrow('not found');
  expect(await request('/products')).toEqual(before);
  await expect(request('/products/deleted-product')).rejects.toThrow(
    'Product not found',
  );
  const tickets = await request('/support/tickets');
  await expect(
    request('/support/tickets', 'POST', { subject: 'Missing body' }),
  ).rejects.toThrow('description');
  expect(await request('/support/tickets')).toEqual(tickets);
  await expect(request('/auth/login', 'POST', {})).rejects.toThrow(
    'Demo credentials',
  );
});

test('same-millisecond demo orders have unique identifiers', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1800000000000);
  try {
    const orders = await Promise.all(
      Array.from({ length: 3 }, () => request('/demo/orders', 'POST', {})),
    );
    expect(new Set(orders.map(order => order.id)).size).toBe(3);
  } finally {
    clock.mockRestore();
  }
});
test('order workflow reserves once, checks packing, verifies OTP and reconciles earnings', async () => {
  const before = await request('/products');
  const earnings = await request('/earnings');
  await request('/orders/ZB10045/accept', 'POST', {});
  let flour = (await request('/products')).find(p => p.id === 'flour');
  expect(flour.quantity).toBe(before.find(p => p.id === 'flour').quantity);
  expect(flour.reserved).toBe(2);
  await expect(request('/orders/ZB10045/accept', 'POST', {})).rejects.toThrow(
    'changed',
  );
  await expect(request('/products/flour', 'DELETE')).rejects.toThrow(
    'active order',
  );
  await request('/orders/ZB10045/start-preparing', 'POST', {});
  await expect(
    request('/orders/ZB10045/confirm-packing', 'POST', { checkedItems: [] }),
  ).rejects.toThrow('every item');
  await request('/orders/ZB10045/confirm-packing', 'POST', {
    checkedItems: ['flour', 'milk'],
  });
  expect(
    (
      await request('/orders/ZB10045/verify-pickup-otp', 'POST', {
        otp: '0000',
      })
    ).error,
  ).toBeTruthy();
  expect((await request('/orders/ZB10045')).status).toBe('Ready for Pickup');
  await request('/orders/ZB10045/verify-pickup-otp', 'POST', { otp: '4587' });
  flour = (await request('/products')).find(p => p.id === 'flour');
  expect(flour.reserved).toBe(0);
  expect(flour.quantity).toBe(43);
  await expect(
    request('/orders/ZB10045/verify-pickup-otp', 'POST', { otp: '4587' }),
  ).rejects.toThrow('changed');
  await request('/orders/ZB10045/deliver', 'POST', {});
  const after = await request('/earnings');
  expect(after.transactions.length).toBe(earnings.transactions.length + 1);
  const t = after.transactions[0];
  expect(t.amount).toBe(t.commission + t.settlementAmount);
  expect((await request('/rewards')).points).toBe(50);
  expect(
    JSON.parse(AsyncStorage.setItem.mock.calls.at(-1)[1]).orders.find(
      o => o.id === 'ZB10045',
    ).status,
  ).toBe('Delivered');
});
test('closed shop blocks new assignments and accepting; reject only current segment', async () => {
  await request('/shop/status', 'PATCH', { status: 'closed' });
  await expect(request('/demo/orders', 'POST', {})).rejects.toThrow('Reopen');
  await expect(request('/orders/ZB10044/accept', 'POST', {})).rejects.toThrow(
    'Reopen',
  );
  await request('/shop/status', 'PATCH', { status: 'active' });
  await expect(request('/orders/ZB10044/reject', 'POST', {})).rejects.toThrow(
    'reason',
  );
  await request('/orders/ZB10044/reject', 'POST', {
    reason: 'Unavailable produce',
  });
  expect((await request('/orders/ZB10044')).customerResolution).toContain(
    'Other shops remain active',
  );
  expect((await request('/orders/ZB10045')).status).toBe('Delivered');
});
test('product CRUD audits changes, validates stock and preserves reservations', async () => {
  await expect(
    request('/products', 'POST', { name: 'Test', pricePkr: -1, quantity: 1 }),
  ).rejects.toThrow('positive price');
  await request('/products', 'POST', {
    name: 'Fresh Apples',
    pricePkr: 200,
    quantity: 10,
    category: 'Fruits',
    unit: 'kg',
    isAvailable: true,
  });
  const p = (await request('/products')).find(x => x.name === 'Fresh Apples');
  await request('/products/' + p.id, 'PATCH', { ...p, quantity: 12 });
  await request('/products/' + p.id, 'DELETE');
  expect((await request('/products')).some(x => x.id === p.id)).toBe(false);
  expect(
    (await request('/inventory/history')).slice(0, 3).map(x => x.actionType),
  ).toEqual(['Removed', 'Updated', 'Added']);
});
test('tickets, replies and notifications persist; logout protects operations', async () => {
  await request('/support/tickets', 'POST', {
    subject: 'Delivery issue',
    description: 'Please review my delivery issue',
  });
  const ticket = (await request('/support/tickets'))[0];
  await request('/support/tickets/' + ticket.id + '/messages', 'POST', {
    body: 'More details',
  });
  expect(
    (await request('/support/tickets/' + ticket.id + '/messages')).at(-1).body,
  ).toBe('More details');
  await request('/notifications/read-all', 'POST', {});
  expect((await request('/notifications')).every(x => x.read)).toBe(true);
  await request('/auth/logout', 'POST');
  expect(await request('/auth/me')).toBeNull();
  await expect(request('/products')).rejects.toThrow('log in');
});
test('failed persistence rolls back mutation and password is never stored', async () => {
  const shop = await request('/shop/me');
  AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'));
  await expect(
    request('/shop/me', 'PATCH', { shopName: 'Should rollback' }),
  ).rejects.toThrow('Storage full');
  expect((await request('/shop/me')).shopName).toBe(shop.shopName);
  await request('/auth/register', 'POST', {
    fullName: 'New Owner',
    phone: '03009999999',
    shopName: 'New Shop',
    address: 'Lahore address',
    password: 'NeverStore123',
  });
  const serialized = AsyncStorage.setItem.mock.calls.at(-1)[1];
  expect(serialized).not.toContain('NeverStore123');
  expect((await request('/auth/me')).shop.verificationStatus).toBe('Pending');
});

test('odd-value delivery reconciles commission and settlement exactly', async () => {
  await request('/products', 'POST', {
    name: 'Rounding fixture',
    pricePkr: 105,
    quantity: 10,
    isAvailable: true,
  });
  const order = await request('/demo/orders', 'POST', {});
  await request(`/orders/${order.id}/accept`, 'POST', {});
  await request(`/orders/${order.id}/start-preparing`, 'POST', {});
  await request(`/orders/${order.id}/confirm-packing`, 'POST', {
    checkedItems: order.items.map(item => item.productId),
  });
  await request(`/orders/${order.id}/verify-pickup-otp`, 'POST', {
    otp: '4587',
  });
  await request(`/orders/${order.id}/deliver`, 'POST', {});
  const transaction = (await request('/earnings')).transactions.find(
    t => t.orderId === order.id,
  );
  expect(transaction).toMatchObject({
    amount: 105,
    commission: 11,
    settlementAmount: 94,
  });
  await expect(
    request(`/orders/${order.id}/deliver`, 'POST', {}),
  ).rejects.toThrow('changed');
});
