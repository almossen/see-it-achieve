import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const ALL_UNITS: Record<string, { emoji: string; label: string }> = {
  "حبة": { emoji: "1️⃣", label: "حبة" },
  "كرتون": { emoji: "📦", label: "كرتون" },
  "صحن": { emoji: "🍽️", label: "صحن" },
  "كيلو": { emoji: "⚖️", label: "كيلو" },
  "كيس": { emoji: "🛍️", label: "كيس" },
  "حزمة": { emoji: "🌿", label: "حزمة" },
  "درزن": { emoji: "🥚", label: "درزن" },
  "علبة": { emoji: "🥫", label: "علبة" },
  "ربطة": { emoji: "🧻", label: "ربطة" },
};

const DEFAULT_UNITS = ["حبة", "كرتون", "كيلو"];

const QUICK_QUANTITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
  unitOptions?: string[] | null;
  onAdd: (unit: string, qty: number) => void;
  onUpdateQty: (qty: number) => void;
}

const ProductQuantityDrawer = ({
  open,
  onClose,
  product,
  currentQty,
  currentUnit,
  unitOptions,
  onAdd,
  onUpdateQty,
}: ProductQuantityDrawerProps) => {
  const [step, setStep] = useState<"unit" | "quantity">("unit");
  const [selectedUnit, setSelectedUnit] = useState(currentUnit);
  const [selectedQty, setSelectedQty] = useState(currentQty || 1);

  const units = (unitOptions && unitOptions.length > 0 ? unitOptions : DEFAULT_UNITS)
    .map((u) => ({ value: u, ...(ALL_UNITS[u] || { emoji: "📦", label: u }) }));

  // Reset state when product changes
  useEffect(() => {
    if (open && product) {
      const defaultUnit = currentUnit || product.unit || "حبة";
      setSelectedUnit(defaultUnit);
      setSelectedQty(currentQty || 1);
      // If only one unit option, skip to quantity step
      if (units.length === 1) {
        setSelectedUnit(units[0].value);
        setStep("quantity");
      } else {
        setStep("unit");
      }
    }
  }, [open, product?.id]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  if (!product) return null;

  const handleUnitSelect = (unit: string) => {
    setSelectedUnit(unit);
    setSelectedQty(1);
    setStep("quantity");
  };

  const handleQtySelect = (qty: number) => {
    setSelectedQty(qty);
  };

  const handleConfirm = () => {
    if (selectedQty === 0) return;
    if (currentQty > 0) {
      onUpdateQty(selectedQty);
    } else {
      onAdd(selectedUnit, selectedQty);
    }
    onClose();
  };

  const handleBack = () => {
    setStep("unit");
  };

  const unitInfo = ALL_UNITS[selectedUnit] || { emoji: "📦", label: selectedUnit };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="text-center pb-2 flex-shrink-0">
          <div className="flex flex-col items-center gap-2 mb-1">
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
            <DrawerDescription className="text-lg">
              {step === "unit" ? "اختر الوحدة" : `كم ${unitInfo.label}؟`}
            </DrawerDescription>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <AnimatePresence mode="wait">
            {step === "unit" ? (
              <motion.div
                key="unit-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-3"
              >
                {units.map((u) => (
                  <motion.button
                    key={u.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUnitSelect(u.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-3 transition-all",
                      "bg-muted/50 border-transparent hover:border-primary hover:bg-primary/10",
                      "min-h-[100px]"
                    )}
                  >
                    <span className="text-[40px]">{u.emoji}</span>
                    <span className="text-xl font-bold">{u.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="qty-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Back button to change unit */}
                {units.length > 1 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-base"
                  >
                    <ArrowRight className="h-5 w-5" />
                    <span>تغيير الوحدة ({unitInfo.emoji} {unitInfo.label})</span>
                  </button>
                )}

                {/* Quantity grid - large buttons */}
                <div className="grid grid-cols-5 gap-3">
                  {QUICK_QUANTITIES.map((q) => (
                    <motion.button
                      key={q}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleQtySelect(q)}
                      className={cn(
                        "aspect-square rounded-2xl flex items-center justify-center text-3xl font-bold transition-all border-3",
                        selectedQty === q
                          ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                          : "bg-muted/50 border-transparent hover:border-primary/50"
                      )}
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>

                {/* Selected summary */}
                <div className="text-center py-2">
                  <span className="text-2xl font-bold text-primary">
                    {selectedQty} {unitInfo.label} {unitInfo.emoji}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === "quantity" && (
          <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-border">
            <Button
              onClick={handleConfirm}
              disabled={selectedQty === 0}
              className="w-full h-16 text-xl rounded-2xl gap-3"
            >
              <ShoppingCart className="h-7 w-7" />
              {currentQty > 0
                ? `تحديث → ${selectedQty} ${unitInfo.label}`
                : `أضف ${selectedQty} ${unitInfo.label} للسلة ✅`}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default ProductQuantityDrawer;
