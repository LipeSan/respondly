"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Text } from "@/components/Text";

const mainNavItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Configuration", href: "/configuration" },
  { name: "Reviews", href: "/reviews" },
  { name: "Rules", href: "/rules" },
  { name: "Templates", href: "/templates" },
];

function NavIcon({ name, className }: { name: string; className: string }) {
  if (name === "Dashboard") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-8.5Z" />
      </svg>
    );
  }
  if (name === "Configuration") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.03.03a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.64l-.03-.03a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.08 1.62V21a2.2 2.2 0 0 1-4.4 0v-.04a1.8 1.8 0 0 0-1.08-1.62 1.8 1.8 0 0 0-1.98.36l-.03.03a2.2 2.2 0 0 1-3.12 0 2.2 2.2 0 0 1 0-3.12l.03-.03A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.62-1.08H2.94a2.2 2.2 0 0 1 0-4.4h.04A1.8 1.8 0 0 0 4.6 7.9a1.8 1.8 0 0 0-.36-1.98l-.03-.03a2.2 2.2 0 1 1 3.12-3.12l.03.03A1.8 1.8 0 0 0 9.34 3.16 1.8 1.8 0 0 0 10.42 1.54V1.5a2.2 2.2 0 0 1 4.4 0v.04a1.8 1.8 0 0 0 1.08 1.62 1.8 1.8 0 0 0 1.98-.36l.03-.03a2.2 2.2 0 1 1 3.12 3.12l-.03.03a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.62 1.08h.04a2.2 2.2 0 0 1 0 4.4h-.04A1.8 1.8 0 0 0 19.4 15Z" />
      </svg>
    );
  }
  if (name === "Reviews") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h8M8 14h6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
      </svg>
    );
  }
  if (name === "Rules") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6v0M16 12v0M10 18v0" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6a1 1 0 1 0 2 0 1 1 0 0 0-2 0ZM15 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0ZM9 18a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" />
      </svg>
    );
  }
  if (name === "Templates") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 3v5h5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6M9 17h6" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div className="sticky top-16 h-[calc(100vh-4rem)] px-4 py-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
          <Text
            variant="body"
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pb-3"
          >
            Menu
          </Text>

          <nav className="flex flex-col gap-1">
            {mainNavItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <NavIcon
                      name={item.name}
                      className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-500"}`}
                    />
                    <Text
                      variant="body"
                      className={`text-sm font-medium ${
                        isActive ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {item.name}
                    </Text>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
