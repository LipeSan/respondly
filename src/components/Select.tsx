"use client";

import {
  Children,
  SelectHTMLAttributes,
  forwardRef,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Text } from "./Text";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, id, children, value, defaultValue, onChange, disabled, ...props }, ref) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue !== undefined ? String(defaultValue) : ""
    );

    const currentValue = isControlled ? String(value ?? "") : internalValue;

    const options = useMemo(() => {
      const nodes = Children.toArray(children);
      const out: Array<{ value: string; label: string; disabled: boolean }> = [];

      for (const node of nodes) {
        if (!node) continue;
        if (typeof node !== "object") continue;
        const el = node as ReactElement<unknown>;

        if (el.type === "option") {
          const p = (el.props ?? {}) as Record<string, unknown>;
          const v = p.value !== undefined ? String(p.value) : "";
          const c = p.children;
          const lbl =
            typeof c === "string"
              ? c
              : Array.isArray(c)
                ? c.filter((x) => typeof x === "string").join("")
                : String(c ?? "");

          out.push({
            value: v,
            label: lbl || v,
            disabled: Boolean(p.disabled),
          });
        }
      }

      return out;
    }, [children]);

    const selectedLabel = useMemo(() => {
      const found = options.find((o) => o.value === currentValue);
      if (found) return found.label;
      return options[0]?.label ?? "";
    }, [options, currentValue]);

    useEffect(() => {
      function onDocMouseDown(e: MouseEvent) {
        const target = e.target as Node | null;
        if (!target) return;
        if (!rootRef.current) return;
        if (!rootRef.current.contains(target)) setOpen(false);
      }

      function onDocKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
      }

      document.addEventListener("mousedown", onDocMouseDown);
      document.addEventListener("keydown", onDocKeyDown);
      return () => {
        document.removeEventListener("mousedown", onDocMouseDown);
        document.removeEventListener("keydown", onDocKeyDown);
      };
    }, []);

    function selectValue(next: string) {
      if (!isControlled) setInternalValue(next);
      setOpen(false);

      const evt = {
        target: { value: next },
        currentTarget: { value: next },
      } as unknown as React.ChangeEvent<HTMLSelectElement>;

      onChange?.(evt);
    }

    return (
      <div className="w-full" ref={rootRef}>
        {label && (
          <Text variant="label" htmlFor={id} className="mb-1">
            {label}
          </Text>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            value={currentValue}
            onChange={(e) => selectValue(e.target.value)}
            disabled={disabled}
            className="sr-only"
            {...props}
          >
            {children}
          </select>

          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={`relative block w-full text-left px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
              error
                ? "border-red-500 focus:ring-red-500 focus:border-transparent"
                : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
            onClick={() => {
              if (disabled) return;
              setOpen((v) => !v);
            }}
          >
            <span className="block truncate pr-8">{selectedLabel || "Select..."}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg
                className={`h-4 w-4 fill-current transition-transform ${open ? "rotate-180" : ""}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </span>
          </button>

          {open && !disabled && (
            <div
              role="listbox"
              className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
            >
              <div className="max-h-64 overflow-auto py-1">
                {options.map((o) => {
                  const isSelected = o.value === currentValue;
                  const isDisabled = Boolean(o.disabled);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isDisabled}
                      className={`block w-full px-4 py-2 text-left text-sm ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "text-gray-900 hover:bg-gray-50"
                      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => {
                        if (isDisabled) return;
                        selectValue(o.value);
                      }}
                    >
                      <span className="block truncate">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {error && (
          <Text variant="error" className="mt-1">
            {error}
          </Text>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
