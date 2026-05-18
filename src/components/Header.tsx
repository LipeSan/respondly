"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Text } from "./Text";

interface HeaderProps {
  businessName?: string;
}

function NavIcon({ name, className }: { name: string; className: string }) {
  if (name === "Dashboard") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-8.5Z" />
      </svg>
    );
  }
  if (name === "Reviews") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
      </svg>
    );
  }
  if (name === "Rules") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6a1 1 0 1 0 2 0 1 1 0 0 0-2 0ZM15 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0ZM9 18a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" />
      </svg>
    );
  }
  if (name === "Templates") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3v5h5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6M9 17h6" />
      </svg>
    );
  }
  if (name === "Google") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12h20" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a15 15 0 0 1 0 20" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a15 15 0 0 0 0 20" />
      </svg>
    );
  }
  if (name === "Subscription") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16h4" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
    </svg>
  );
}

export function Header({ businessName }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Reviews", href: "/reviews" },
    { name: "Rules", href: "/rules" },
    { name: "Templates", href: "/templates" },
    { name: "Google", href: "/google" },
    { name: "Subscription", href: "/subscription" },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <div className="relative h-14 w-auto aspect-[3/1]">
                <Image
                  src="/logo-header.png"
                  alt="Respondly"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {businessName && (
            <div className="relative flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen((v) => !v);
                  setIsUserMenuOpen(false);
                }}
                className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                aria-label="Open menu"
              >
                <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen((v) => !v);
                  setIsMobileNavOpen(false);
                }}
                className="flex items-center gap-4 focus:outline-none"
                aria-label="Open user menu"
              >
                <Text variant="body" className="hidden sm:block text-sm">
                  Hello, {businessName}
                </Text>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-white font-bold text-sm hover:opacity-90 transition-opacity">
                  {businessName.substring(0, 2).toUpperCase()}
                </div>
              </button>

              {(isMobileNavOpen || isUserMenuOpen) && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    setIsUserMenuOpen(false);
                  }}
                />
              )}

              {isMobileNavOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 md:hidden">
                  <div className="px-4 py-2">
                    <Text variant="body" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Menu
                    </Text>
                  </div>
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileNavOpen(false)}
                      className="block px-4 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <NavIcon
                          name={item.name}
                          className={`h-4 w-4 ${pathname === item.href ? "text-gray-900" : "text-gray-500"}`}
                        />
                        <Text
                          variant="body"
                          className={`text-sm ${
                            pathname === item.href
                              ? "text-gray-900 font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {item.name}
                        </Text>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2">
                    <Text variant="body" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Account
                    </Text>
                  </div>
                  <div className="my-2 h-px bg-gray-100" />
                  <Link
                    href="/account"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Text variant="body" className="text-sm text-gray-700">
                      Account settings
                    </Text>
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Text variant="body" className="text-sm text-gray-700">
                      Logout
                    </Text>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
