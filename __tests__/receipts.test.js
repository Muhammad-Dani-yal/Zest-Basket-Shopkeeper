import { receiptHTML, shareReceiptPDF } from '../src/services/receipts';
import { generatePDF } from 'react-native-html-to-pdf';
import NativeShare from 'react-native-share';
import { seed } from '../src/services/seed';
test('receipt escapes user content and exports a real PDF file through native sharing', async () => {
  const data = seed(),
    o = { ...data.orders[0], instructions: '<script>alert(1)</script>' };
  const html = receiptHTML(o, data.shop);
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
  expect(html).toContain('DEMO RECEIPT');
  await shareReceiptPDF(o, data.shop);
  expect(generatePDF).toHaveBeenCalledWith(
    expect.objectContaining({ fileName: 'ZestBasket-ZB10045' }),
  );
  expect(NativeShare.open).toHaveBeenCalledWith(
    expect.objectContaining({
      url: 'file:///cache/receipt.pdf',
      type: 'application/pdf',
    }),
  );
});
