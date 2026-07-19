"use client";

import type { HTMLAttributes, ReactNode } from "react";

type InlineNotificationTone = "success" | "error" | "info" | "warning";

const toneClasses: Record<InlineNotificationTone, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const iconClasses: Record<InlineNotificationTone, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-amber-500",
};

function NotificationIcon({ tone }: { tone: InlineNotificationTone }) {
  if (tone === "success") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (tone === "warning") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.66 18h16.68a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.74 0z" />
      </svg>
    );
  }

  if (tone === "info") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  );
}

export function InlineNotification({
  tone,
  children,
  className = "",
  centered = false,
  ...props
}: {
  tone: InlineNotificationTone;
  children: ReactNode;
  className?: string;
  centered?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]} ${className}`.trim()}
      role={tone === "error" ? "alert" : "status"}
      {...props}
    >
      <div className={`flex gap-3 ${centered ? "items-center justify-center text-center" : "items-start"}`}>
        <div className={`mt-0.5 flex-shrink-0 ${iconClasses[tone]}`}>
          <NotificationIcon tone={tone} />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
