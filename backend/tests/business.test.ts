import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  multiShopFee,
  pickupBatches,
  resolveRejectedSegment,
} from '../src/services/business.js';
test('three shops have no extra fee and fourth shop adds PKR 30', () => {
  assert.equal(multiShopFee(['a', 'b', 'c']), 0);
  assert.equal(multiShopFee(['a', 'b', 'c', 'd']), 30);
  assert.equal(multiShopFee(['a', 'a', 'b', 'c']), 0);
});
test('pickup batches hold at most five shops and enforce radius, independently of travel route', () => {
  const shops = Array.from({ length: 7 }, (_, i) => ({
    id: String(i),
    latitude: 31.5 + i * 0.001,
    longitude: 74.3,
  }));
  const batches = pickupBatches(shops, { latitude: 31.5, longitude: 74.3 });
  assert.deepEqual(
    batches.map(b => b.length),
    [5, 2],
  );
  assert.throws(() =>
    pickupBatches([{ id: 'far', latitude: 32, longitude: 74.3 }], {
      latitude: 31.5,
      longitude: 74.3,
    }),
  );
});
test('switch and drop require customer approval and leave unrelated shop segments intact', () => {
  const other = { shopId: 'other', status: 'Accepted', items: [1] },
    segments = [{ shopId: 'affected', status: 'Rejected', items: [2] }, other];
  assert.throws(() =>
    resolveRejectedSegment(segments, 'affected', 'drop', false),
  );
  const dropped = resolveRejectedSegment(segments, 'affected', 'drop', true);
  assert.equal(dropped[0].status, 'Removed');
  assert.equal(dropped[1], other);
  const switched = resolveRejectedSegment(
    segments,
    'affected',
    'switch',
    true,
    'nearby',
  );
  assert.equal(switched[0].shopId, 'nearby');
  assert.equal(switched[1], other);
});
