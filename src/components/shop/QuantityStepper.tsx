export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
}: {
  value: number;
  onChange(v: number): void;
  label: string;
  min?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        aria-label={`Remove one ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-9 w-9 text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-40"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums text-gray-900">{value}</span>
      <button
        type="button"
        aria-label={`Add one ${label}`}
        onClick={() => onChange(value + 1)}
        className="h-9 w-9 text-gray-600 transition-colors hover:text-gray-900"
      >
        +
      </button>
    </div>
  );
}
