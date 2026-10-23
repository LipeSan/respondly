import { COLOR_LABELS, type ProductColor } from "@/lib/shop";

const SWATCH: Record<ProductColor, string> = {
  black: "bg-gray-900",
  white: "bg-white",
};

export function ColorPicker({
  colors,
  value,
  onChange,
  label,
  showLabel = true,
}: {
  colors: ProductColor[];
  value: ProductColor;
  onChange(color: ProductColor): void;
  label: string;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label={`${label} colour`} className="flex gap-2">
        {colors.map((color) => {
          const selected = color === value;
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={COLOR_LABELS[color]}
              title={COLOR_LABELS[color]}
              onClick={() => onChange(color)}
              className={`h-7 w-7 rounded-full border border-gray-300 ring-offset-2 transition ${SWATCH[color]} ${
                selected ? "ring-2 ring-green-500" : "hover:ring-2 hover:ring-gray-300"
              }`}
            />
          );
        })}
      </div>
      {showLabel ? <span className="text-sm text-gray-600">{COLOR_LABELS[value]}</span> : null}
    </div>
  );
}
