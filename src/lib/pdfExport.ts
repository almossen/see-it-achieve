export const generateOrderPDF = (order: any) => {
  const items = order.order_items || [];
  const date = new Date(order.created_at).toLocaleDateString("ar-SA");

  const html = `
    <html dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>طلب #${order.id.slice(0, 8)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #333; direction: rtl; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #16a34a; padding-bottom: 20px; }
        .header h1 { color: #16a34a; font-size: 24px; margin-bottom: 4px; }
        .header p { color: #666; font-size: 14px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f0fdf4; color: #16a34a; padding: 10px 12px; text-align: right; font-size: 14px; border-bottom: 2px solid #16a34a; }
        td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .total { text-align: left; font-size: 18px; font-weight: bold; color: #16a34a; margin-top: 10px; }
        .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🛒 طلباتي</h1>
        <p>تفاصيل الطلب</p>
      </div>
      <div class="meta">
        <span>رقم الطلب: #${order.id.slice(0, 8)}</span>
        <span>التاريخ: ${date}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.quantity}</td>
              <td>${item.price ? item.price + ' ر.س' : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${order.total > 0 ? `<div class="total">الإجمالي: ${order.total} ر.س</div>` : ''}
      ${order.notes ? `<p style="margin-top:16px;color:#666;">ملاحظات: ${order.notes}</p>` : ''}
      <div class="footer">تم التصدير من تطبيق طلباتي</div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
};
