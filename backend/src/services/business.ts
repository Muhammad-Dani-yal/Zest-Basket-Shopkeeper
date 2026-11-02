export type Coordinates = { latitude: number; longitude: number };
export function distanceKm(a: Coordinates, b: Coordinates) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const lat = rad(b.latitude - a.latitude),
    lon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function multiShopFee(shopIds: string[], extraFeePkr = 30) {
  return Math.max(0, new Set(shopIds).size - 3) * extraFeePkr;
}
export function pickupBatches(
  shops: ({ id: string } & Coordinates)[],
  center: Coordinates,
  radiusKm = 5,
) {
  const unique = [...new Map(shops.map(s => [s.id, s])).values()];
  if (unique.some(s => distanceKm(s, center) > radiusKm))
    throw Object.assign(
      new Error('A shop is outside the service/pickup radius'),
      { status: 400 },
    );
  const batches = [];
  for (let i = 0; i < unique.length; i += 5)
    batches.push(unique.slice(i, i + 5));
  return batches;
}
export function resolveRejectedSegment(
  segments: Record<string, any>[],
  shopId: string,
  choice: 'switch' | 'drop',
  approved: boolean,
  targetShopId?: string,
) {
  if (!approved)
    throw Object.assign(new Error('Customer approval is required'), {
      status: 400,
    });
  const affected = segments.find(
    s => s.shopId === shopId && s.status === 'Rejected',
  );
  if (!affected)
    throw Object.assign(new Error('Rejected shop segment not found'), {
      status: 404,
    });
  if (choice === 'switch' && (!targetShopId || targetShopId === shopId))
    throw Object.assign(new Error('Choose another nearby shop'), {
      status: 400,
    });
  return segments.map(s =>
    s !== affected
      ? s
      : choice === 'drop'
      ? { ...s, resolution: 'Dropped by customer', status: 'Removed' }
      : {
          ...s,
          originalShopId: s.shopId,
          shopId: targetShopId,
          resolution: 'Switch approved by customer',
          status: 'New',
        },
  );
}
