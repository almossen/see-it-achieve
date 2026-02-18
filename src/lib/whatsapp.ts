export const sendWhatsAppOrder = (order: any, phoneNumber?: string) => {
  const items = order.order_items || [];
  const date = new Date(order.created_at).toLocaleDateString("ar-SA");

  let message = `🛒 *طلب جديد #${order.id.slice(0, 8)}*\n`;
  message += `📅 التاريخ: ${date}\n\n`;
  message += `📝 *المنتجات:*\n`;

  items.forEach((item: any, idx: number) => {
    message += `${idx + 1}. ${item.product_name} × ${item.quantity}`;
    if (item.price) message += ` — ${item.price} ر.س`;
    message += `\n`;
  });

  if (order.total > 0) {
    message += `\n💰 *الإجمالي: ${order.total} ر.س*`;
  }

  if (order.notes) {
    message += `\n\n📌 ملاحظات: ${order.notes}`;
  }

  const encoded = encodeURIComponent(message);
  const url = phoneNumber
    ? `https://wa.me/${phoneNumber}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, "_blank");
};

export const sendWhatsAppMessage = (phone: string, message: string) => {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
};
