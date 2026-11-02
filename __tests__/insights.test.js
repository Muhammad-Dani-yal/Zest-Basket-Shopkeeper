import {
  restockPlan,
  preparationQueue,
  localDay,
} from '../src/services/insights';

test('restock recommendations include reservations and prioritize empty shelves', () => {
  const products = [
    { id: 'a', name: 'Milk', quantity: 10, reserved: 8 },
    { id: 'b', name: 'Flour', quantity: 0 },
    { id: 'c', name: 'Rice', quantity: 20, reserved: 0 },
  ];
  const result = restockPlan(products);
  expect(result.map(p => p.id)).toEqual(['b', 'a']);
  expect(result[1]).toMatchObject({ available: 2, suggestedQuantity: 13 });
  expect(products[0].quantity).toBe(10);
  expect(restockPlan([])).toEqual([]);
});

test('preparation priority excludes completed orders and handles target boundary', () => {
  const now = Date.parse('2026-11-02T10:00:00Z');
  const orders = [
    {
      id: 'recent',
      status: 'Preparing',
      preparationStartedAt: '2026-11-02T09:57:00Z',
    },
    {
      id: 'late',
      status: 'Preparing',
      preparationStartedAt: '2026-11-02T09:50:00Z',
    },
    { id: 'done', status: 'Delivered', createdAt: '2026-11-02T09:00:00Z' },
  ];
  expect(
    preparationQueue(orders, now).map(o => [o.id, o.elapsedMinutes]),
  ).toEqual([
    ['late', 10],
    ['recent', 3],
  ]);
  expect(localDay(new Date(2026, 10, 2, 0, 1))).toBe('2026-11-02');
});
