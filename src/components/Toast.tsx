"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ShowToastOptions = {
  type?: ToastType;
  message: string;
  duration?: number;
};

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "info", message, duration = 4000 }: ShowToastOptions) => {
      const id = Date.now() + Math.random();
      const toast: Toast = { id, type, message };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        window.setTimeout(() => {
          remove(id);
        }, duration);
      }
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="flex flex-col gap-3 w-full max-w-md">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const base =
    "pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl flex items-start gap-3 bg-white backdrop-blur-sm";

  const variants: Record<ToastType, string> = {
    success: "border-green-200 bg-green-50/80 text-green-800",
    error: "border-red-200 bg-red-50/80 text-red-800",
    info: "border-blue-200 bg-blue-50/80 text-blue-800",
  };

  const icons: Record<ToastType, ReactNode> = {
    success: (
      <svg className="w-5 h-5 flex-shrink-0 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 flex-shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    ),
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-95"
      }`}
    >
      <div className={`${base} ${variants[toast.type]}`}>
        <div className="mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 text-sm font-medium pr-6">{toast.message}</div>
        <button
          aria-label="Fechar"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
