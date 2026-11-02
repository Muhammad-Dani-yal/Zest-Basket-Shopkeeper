// Pure calculations shared by the dashboard and inventory; no extra API needed.
export function restockPlan(products, target = 15) {
  return products
    .map(product => ({
      ...product,
      available: Math.max(0, product.quantity - (product.reserved || 0)),
      suggestedQuantity: Math.max(
        0,
        target + (product.reserved || 0) - product.quantity,
      ),
    }))
    .filter(product => product.available <= 5)
    .sort((a, b) => a.available - b.available || a.name.localeCompare(b.name));
}

export function preparationQueue(orders, now = Date.now()) {
  return orders
    .filter(order => order.status === 'Preparing')
    .map(order => ({
      ...order,
      elapsedMinutes:
        Math.max(
          0,
          Math.floor(
            (now - Date.parse(order.preparationStartedAt || order.createdAt)) /
              60000,
          ),
        ) || 0,
    }))
    .sort((a, b) => b.elapsedMinutes - a.elapsedMinutes);
}

export function localDay(value = new Date()) {
  const day = new Date(value);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(day.getDate()).padStart(2, '0')}`;
}
