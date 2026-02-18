import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const UNIT_OPTIONS = [
  { value: "حبة", emoji: "1️⃣", label: "حبة" },
  { value: "كرتون", emoji: "📦", label: "كرتون" },
  { value: "درزن", emoji: "🥚", label: "درزن (12)" },
  { value: "كيلو", emoji: "⚖️", label: "كيلو" },
  { value: "نص كيلو", emoji: "🔸", label: "نص كيلو" },
  { value: "ربع كيلو", emoji: "🔹", label: "ربع كيلو" },
  { value: "لتر", emoji: "🥛", label: "لتر" },
  { value: "حزمة", emoji: "🌿", label: "حزمة" },
];

interface UnitPickerProps {
  productName: string;
  onSelect: (unit: string) => void;
  onClose: () => void;
}

const UnitPicker = ({ productName, onSelect, onClose }: UnitPickerProps) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">اختر الكمية - {productName}</h3>
            <button onClick={onClose} className="p-2 rounded-full bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {UNIT_OPTIONS.map((unit) => (
              <motion.button
                key={unit.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(unit.value)}
                className="bg-muted hover:bg-primary/10 border-2 border-transparent hover:border-primary rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors"
              >
                <span className="text-3xl">{unit.emoji}</span>
                <span className="text-base font-bold">{unit.label}</span>
              </motion.button>
            ))}
          </div>

          <Button variant="outline" onClick={onClose} className="w-full h-12 rounded-xl text-base">
            إلغاء
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UnitPicker;
