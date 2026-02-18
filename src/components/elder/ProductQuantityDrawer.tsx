import { useState, useEffect } from "react";
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
  const [unitQuantities, setUnitQuantities] = useState<Record<string, number>>({});

  // Reset state when product changes
  useEffect(() => {
    if (open && product) {
      const defaultUnit = currentUnit || product.unit || "حبة";
      setSelectedUnit(defaultUnit);
      setQty(currentQty || 1);
      setUnitQuantities(currentQty > 0 ? { [defaultUnit]: currentQty } : {});
    }
  }, [open, product?.id]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  if (!product) return null;

  const handleUnitQtyChange = (unit: string, delta: number) => {
    setUnitQuantities((prev) => {
      const current = prev[unit] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[unit];
      } else {
        updated[unit] = next;
      }
      // Update selected unit to the last changed one
      if (next > 0) setSelectedUnit(unit);
      // Update total qty
      const total = Object.values(updated).reduce((s, v) => s + v, 0);
      setQty(total || 1);
      return updated;
    });
  };

  const handleConfirm = () => {
    const totalQty = Object.values(unitQuantities).reduce((s, v) => s + v, 0);
    if (totalQty === 0) return;
    if (currentQty > 0) {
      onUpdateQty(totalQty);
    } else {
      onAdd(selectedUnit, totalQty);
    }
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="text-center pb-2 flex-shrink-0">
          {/* Product display */}
          <div className="flex flex-col items-center gap-2 mb-2">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name_ar}
                className="w-20 h-20 object-contain rounded-2xl"
              />
            ) : (
              <span className="text-[52px] block">{product.emoji || "📦"}</span>
            )}
            <DrawerTitle className="text-2xl font-bold">
              {product.name_ar}
            </DrawerTitle>
            <DrawerDescription>
              {product.price ? `${product.price} ر.س` : "اختر الوحدة والكمية"}
            </DrawerDescription>
          </div>
        </DrawerHeader>

        {/* Scrollable unit list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="space-y-2">
            {UNIT_OPTIONS.map((u) => {
              const unitQty = unitQuantities[u.value] || 0;
              const isActive = unitQty > 0;
              return (
                <div
                  key={u.value}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl transition-all border-2",
                    isActive
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/50 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[32px]">{u.emoji}</span>
                    <span className="text-lg font-bold">{u.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isActive && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-xl"
                        onClick={() => handleUnitQtyChange(u.value, -1)}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                    )}
                    {isActive && (
                      <span className="text-2xl font-bold min-w-[32px] text-center">
                        {unitQty}
                      </span>
                    )}
                    <Button
                      size="icon"
                      className={cn(
                        "h-11 w-11 rounded-xl",
                        !isActive && "bg-muted text-foreground hover:bg-primary hover:text-primary-foreground"
                      )}
                      onClick={() => handleUnitQtyChange(u.value, 1)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fixed confirm button at bottom */}
        <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-border">
          <Button
            onClick={handleConfirm}
            disabled={Object.values(unitQuantities).reduce((s, v) => s + v, 0) === 0}
            className="w-full h-16 text-xl rounded-2xl gap-3"
          >
            <ShoppingCart className="h-7 w-7" />
            {currentQty > 0 ? "تحديث الكمية" : "أضف للسلة ✅"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ProductQuantityDrawer;
