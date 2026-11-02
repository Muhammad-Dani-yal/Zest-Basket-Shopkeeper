export const stamp = () => new Date().toISOString();
export const uid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
export function seed() {
  const products = [
    ['flour', 'Organic Wheat Flour (5kg)', 'Grocery', 650, 45, 'pack', '🌾'],
    ['milk', 'Fresh Dairy Milk (1L)', 'Dairy', 100, 30, 'L', '🥛'],
    ['bananas', 'Bananas', 'Fruits', 120, 15, 'dozen', '🍌'],
    ['tomatoes', 'Tomatoes', 'Vegetables', 100, 5, 'kg', '🍅'],
  ].map(([id, name, category, pricePkr, quantity, unit, emoji]) => ({
    id,
    name,
    category,
    pricePkr,
    quantity,
    unit,
    emoji,
    reserved: 0,
    isAvailable: true,
    description: 'Fresh quality, selected with care.',
    imageUrl: '',
  }));
  const item = (p, q) => ({
    productId: p.id,
    name: p.name,
    price: p.pricePkr,
    quantity: q,
    emoji: p.emoji,
  });
  const make = (id, name, items, status = 'New', days = 0) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      id,
      orderNumber: id,
      customer: { name, phone: '+923001234567' },
      address: 'House 12, Street 4, Defence Phase 2, Lahore',
      items,
      subtotal,
      deliveryFee: 100,
      total: subtotal + 100,
      status,
      isDemo: true,
      paymentMethod: 'Cash',
      paymentStatus: status === 'Delivered' ? 'Paid' : 'Unpaid',
      instructions: 'Please give fresh items only.',
      createdAt: new Date(Date.now() - days * 86400000).toISOString(),
      rider: {
        name: 'Ali Raza',
        phone: '+923109876543',
        bikeModel: 'Honda CD 70',
        licensePlate: 'LHR-7845',
      },
    };
  };
  const orders = [
    make('ZB10045', 'Ahmed Khan', [item(products[0], 2), item(products[1], 1)]),
    make('ZB10044', 'Sara Ali', [item(products[3], 2), item(products[2], 1)]),
  ];
  for (let i = 0; i < 7; i++)
    orders.push(
      make(
        `ZB0990${i}`,
        'Ayesha Ali',
        [item(products[i % 2], i + 1)],
        'Delivered',
        i,
      ),
    );
  return {
    user: { fullName: 'Ahmed Khan', phone: '03001234567' },
    shop: {
      shopName: 'FreshMart',
      address: 'Defence Phase 2, Lahore',
      status: 'active',
      verificationStatus: 'Verified',
      deliveryRadiusKm: 5,
      holidays: [],
      workingHours: Object.fromEntries(
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => [
          d,
          { open: '08:00', close: '23:00' },
        ]),
      ),
    },
    products,
    orders,
    logs: products.map(p => ({
      id: uid(),
      productName: p.name,
      actionType: 'Added',
      previousQuantity: 0,
      newQuantity: p.quantity,
      timestamp: stamp(),
    })),
    notifications: [
      {
        id: uid(),
        title: 'New order received',
        category: 'Orders',
        orderId: orders[0].id,
        read: false,
        createdAt: stamp(),
      },
      {
        id: uid(),
        title: 'Welcome to ZestBasket',
        category: 'System',
        read: false,
        createdAt: stamp(),
      },
    ],
    tickets: ['Missing Item', 'Wrong Product', 'Operating Hours'].map(
      (subject, i) => ({
        id: `CP100${5 - i}`,
        subject,
        status: i === 1 ? 'Resolved' : 'In Progress',
        createdAt: stamp(),
        messages: [
          { id: uid(), author: 'You', body: subject, createdAt: stamp() },
        ],
      }),
    ),
    points: 48,
    rewards: [],
    transactions: orders
      .filter(o => o.status === 'Delivered')
      .map((o, i) => ({
        id: uid(),
        orderId: o.id,
        amount: o.subtotal,
        commission: Math.round(o.subtotal * 0.1),
        settlementAmount: Math.round(o.subtotal * 0.9),
        settled: i > 1,
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        createdAt: o.createdAt,
        isDemoTransaction: true,
      })),
    session: false,
  };
}
