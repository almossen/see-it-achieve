import { createContext, useContext, useState, useEffect } from "react";

interface CartItem {
  product_id: string;
  name: string;
  emoji?: string;
  price?: number;
  unit?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  notes: string;
  setNotes: (notes: string) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
  notes: "",
  setNotes: () => {},
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("talabati_cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    localStorage.setItem("talabati_cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === item.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setNotes("");
  };

  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, notes, setNotes }}
    >
      {children}
    </CartContext.Provider>
  );
};
