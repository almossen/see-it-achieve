import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS = [
  { value: "حبة", emoji: "1️⃣", label: "حبة" },
  { value: "كرتون", emoji: "📦", label: "كرتون" },
  { value: "درزن", emoji: "🥚", label: "درزن" },
  { value: "كيلو", emoji: "⚖️", label: "كيلو" },
  { value: "كيس", emoji: "🛍️", label: "كيس" },
  { value: "حزمة", emoji: "🌿", label: "حزمة" },
];

interface ProductQuantityDrawerProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name_ar: string;
    emoji?: string;
    image_url?: string;
    price?: number;
    unit?: string;
  } | null;
  currentQty: number;
  currentUnit: string;
  onAdd: (unit: string, qty: number) => void;
  onUpdateQty: (qty: number) => void;
}

const ProductQuantityDrawer = ({
  open,
  onClose,
  product,
  currentQty,
  currentUnit,
  onAdd,
  onUpdateQty,
}: ProductQuantityDrawerProps) => {
  const [selectedUnit, setSelectedUnit] = useState(currentUnit);
  const [qty, setQty] = useState(currentQty || 1);

  // Reset when product changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && product) {
      setSelectedUnit(currentUnit || product.unit || "حبة");
      setQty(currentQty || 1);
    }
    if (!isOpen) onClose();
  };

  if (!product) return null;

  const handleConfirm = () => {
    if (currentQty > 0) {
      onUpdateQty(qty);
    } else {
      onAdd(selectedUnit, qty);
    }
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center pb-2">
          {/* Product display */}
          <div className="flex flex-col items-center gap-2 mb-2">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name_ar}
                className="w-24 h-24 object-contain rounded-2xl"
              />
            ) : (
              <span className="text-[64px] block">{product.emoji || "📦"}</span>
            )}
            <DrawerTitle className="text-2xl font-bold">
              {product.name_ar}
            </DrawerTitle>
            <DrawerDescription>
              {product.price ? `${product.price} ر.س` : "اختر الوحدة والكمية"}
            </DrawerDescription>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-6">
          {/* Unit selection - large emoji grid */}
          <div>
            <p className="text-center text-sm text-muted-foreground font-bold mb-3">
              اختر الوحدة
            </p>
            <div className="grid grid-cols-3 gap-3">
              {UNIT_OPTIONS.map((u) => (
                <button
                  key={u.value}
                  onClick={() => setSelectedUnit(u.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-3",
                    selectedUnit === u.value
                      ? "bg-primary/15 border-primary shadow-md scale-105"
                      : "bg-muted/50 border-transparent"
                  )}
                >
                  <span className="text-[40px]">{u.emoji}</span>
                  <span className="text-base font-bold">{u.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity selector - very large */}
          <div>
            <p className="text-center text-sm text-muted-foreground font-bold mb-3">
              الكمية
            </p>
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="icon"
                className="h-16 w-16 rounded-2xl text-2xl"
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={qty <= 1}
              >
                <Minus className="h-8 w-8" />
              </Button>
              <span className="text-5xl font-bold min-w-[80px] text-center">
                {qty}
              </span>
              <Button
                size="icon"
                className="h-16 w-16 rounded-2xl text-2xl"
                onClick={() => setQty(qty + 1)}
              >
                <Plus className="h-8 w-8" />
              </Button>
            </div>
            <p className="text-center text-lg text-muted-foreground mt-2">
              {qty} {selectedUnit}
            </p>
          </div>

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            className="w-full h-16 text-xl rounded-2xl gap-3"
          >
            <ShoppingCart className="h-7 w-7" />
            {currentQty > 0 ? "تحديث الكمية" : `أضف ${qty} ${selectedUnit}`}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ProductQuantityDrawer;
