import { generatePDF } from 'react-native-html-to-pdf';
import NativeShare from 'react-native-share';
const escape = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        c
      ]),
  );
export function receiptHTML(order, shop) {
  const money = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
  return `<!doctype html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;color:#27216C;padding:30px;font-size:13px}h1{color:#5708E8;margin-bottom:0}small{color:#7483A7}table{width:100%;border-collapse:collapse;margin:25px 0}td,th{padding:12px 5px;text-align:left;border-bottom:1px solid #E1E5FA}.amount{text-align:right}.total{font-size:18px;font-weight:bold}.demo{padding:14px;background:#F3F1FF;border-radius:8px}</style></head><body><h1>ZestBasket</h1><small>Fresh Groceries, Happier Homes</small><h2>${escape(
    shop.shopName,
  )} · Order #${escape(order.orderNumber)}</h2><p>${escape(
    new Date(order.createdAt).toLocaleString('en-PK'),
  )}<br>${escape(order.customer.name)}<br>${escape(
    order.address,
  )}</p><table><tr><th>Item</th><th>Qty</th><th class="amount">Amount</th></tr>${order.items
    .map(
      i =>
        `<tr><td>${escape(i.name)}</td><td>${
          i.quantity
        }</td><td class="amount">${money(i.price * i.quantity)}</td></tr>`,
    )
    .join('')}</table><p>Subtotal: ${money(
    order.subtotal,
  )}</p><p>Delivery: ${money(
    order.deliveryFee,
  )}</p><p class="total">Total: ${money(order.total)}</p><p>Payment: ${escape(
    order.paymentMethod,
  )} · ${escape(order.paymentStatus)}</p><p>Order: ${escape(
    order.status,
  )}</p><p>${escape(order.instructions)}</p>${
    order.isDemo
      ? '<p class="demo">DEMO RECEIPT · No live payment processed</p>'
      : ''
  }</body></html>`;
}
export async function shareReceiptPDF(order, shop) {
  const result = await generatePDF({
    html: receiptHTML(order, shop),
    fileName: 'ZestBasket-' + order.orderNumber,
    padding: 20,
  });
  if (!result.filePath)
    throw new Error('PDF could not be created. Please try again.');
  return NativeShare.open({
    title: 'ZestBasket Receipt',
    url: result.filePath.startsWith('file://')
      ? result.filePath
      : 'file://' + result.filePath,
    type: 'application/pdf',
    filename: 'ZestBasket-' + order.orderNumber,
    failOnCancel: false,
  });
}
