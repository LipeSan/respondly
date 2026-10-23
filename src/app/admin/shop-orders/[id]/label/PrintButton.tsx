"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="whitespace-nowrap rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
    >
      Print label
    </button>
  );
}
