"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/insights", label: "Latest report" },
  { href: "/insights/history", label: "History" },
];

export function InsightTabs() {
  const pathname = usePathname();
  // A past report (/insights/<id>) is reached from History, so keep that tab lit.
  const active = pathname === "/insights" ? "/insights" : "/insights/history";

  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Insights">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active === tab.href ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active === tab.href ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
