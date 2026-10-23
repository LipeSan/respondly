"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/shop-orders", label: "Shop orders" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/trial-invites", label: "Trial invites" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (item: (typeof items)[number]) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href ||
        pathname.startsWith(`${item.href}/`) ||
        // Customer detail pages live under /admin/businesses.
        (item.href === "/admin/customers" && pathname.startsWith("/admin/businesses/"));

  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
