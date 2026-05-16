import { ElementType, HTMLAttributes } from "react";

interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant?: "h1" | "h2" | "subtitle" | "body" | "label" | "link" | "error";
  htmlFor?: string;
  href?: string;
}

export function Text({
  children,
  className = "",
  as,
  variant = "body",
  ...props
}: TextProps) {
  const variants = {
    h1: "text-3xl font-bold text-gray-800 tracking-tight",
    h2: "text-xl font-semibold text-gray-900",
    subtitle: "text-sm text-green-600 font-medium tracking-wide uppercase",
    body: "text-gray-500",
    label: "block text-sm font-medium text-gray-700",
    link: "font-medium text-blue-600 hover:text-blue-500 cursor-pointer transition-colors",
    error: "text-sm text-red-500",
  };

  const defaultTags: Record<string, ElementType> = {
    h1: "h1",
    h2: "h2",
    subtitle: "p",
    body: "p",
    label: "label",
    link: "a",
    error: "p",
  };

  const Component = as || defaultTags[variant] || "p";

  return (
    <Component
      className={`${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
