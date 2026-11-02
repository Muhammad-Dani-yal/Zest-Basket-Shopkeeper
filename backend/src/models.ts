import mongoose from 'mongoose';
const mixed = mongoose.Schema.Types.Mixed;
// Dedicated collections keep shop-owned records explicit. Writes share one Atlas transaction.
const definitions: Record<string, [string, Record<string, any>]> = {
  users: [
    'User',
    {
      fullName: String,
      phone: String,
      cnic: String,
      passwordHash: String,
      role: String,
      phoneVerified: Boolean,
      securitySettings: mixed,
    },
  ],
  shops: [
    'Shop',
    {
      ownerId: String,
      shopName: String,
      address: String,
      coordinates: mixed,
      workingHours: mixed,
      holidays: [String],
      deliveryRadiusKm: Number,
      status: String,
      verificationStatus: String,
      shopAvatar: String,
    },
  ],
  products: [
    'Product',
    {
      shopId: String,
      name: String,
      category: String,
      pricePkr: Number,
      quantity: Number,
      reserved: Number,
      unit: String,
      description: String,
      imageUrl: String,
      isAvailable: Boolean,
      lowStockThreshold: Number,
    },
  ],
  orders: [
    'Order',
    {
      shopId: String,
      parentOrderId: String,
      orderNumber: String,
      customer: mixed,
      address: String,
      items: [mixed],
      subtotal: Number,
      deliveryFee: Number,
      total: Number,
      paymentMethod: String,
      paymentStatus: String,
      status: String,
      timestamps: mixed,
      pickupOtpHash: String,
    },
  ],
  segments: [
    'OrderShopSegment',
    {
      shopId: String,
      orderId: String,
      items: [mixed],
      shopSubtotal: Number,
      status: String,
      riderId: String,
      packingTimestamp: String,
      handoverTimestamp: String,
    },
  ],
  riders: [
    'Rider',
    {
      name: String,
      phone: String,
      profileImage: String,
      bikeModel: String,
      licensePlate: String,
      availability: String,
    },
  ],
  transactions: [
    'Transaction',
    {
      shopId: String,
      orderId: String,
      amount: Number,
      commission: Number,
      settlementAmount: Number,
      paymentMethod: String,
      paymentStatus: String,
      isDemoTransaction: Boolean,
    },
  ],
  logs: [
    'InventoryLog',
    {
      shopId: String,
      productId: String,
      actionType: String,
      previousQuantity: Number,
      newQuantity: Number,
      quantityChange: Number,
      timestamp: String,
    },
  ],
  tickets: [
    'SupportTicket',
    { shopId: String, subject: String, status: String, messages: [mixed] },
  ],
  notifications: [
    'Notification',
    {
      shopId: String,
      title: String,
      detail: String,
      category: String,
      href: String,
      read: Boolean,
    },
  ],
  rewards: [
    'RewardLedger',
    { shopId: String, orderId: String, points: Number, reason: String },
  ],
  sessions: [
    'UserSession',
    { userId: String, device: String, expiresAt: String, revoked: Boolean },
  ],
  verification: [
    'ShopVerificationRequest',
    { shopId: String, shopName: String, document: String, status: String },
  ],
  uploads: ['Upload', { shopId: String, name: String, mimeType: String }],
};
export function models() {
  return Object.fromEntries(
    Object.entries(definitions).map(([key, [name, fields]]) => {
      const schema = new mongoose.Schema(
        {
          _id: String,
          id: String,
          portal: { type: String, default: 'zestbasket' },
          createdAt: String,
          updatedAt: String,
          ...fields,
        },
        { strict: false, versionKey: false },
      );
      if (fields.shopId) schema.index({ portal: 1, shopId: 1 });
      if (key === 'users') schema.index({ phone: 1 }, { unique: true });
      return [key, mongoose.models[name] || mongoose.model(name, schema)];
    }),
  );
}
