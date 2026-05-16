import { TextareaHTMLAttributes, forwardRef, ReactNode } from "react";
import { Text } from "./Text";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <Text variant="label" htmlFor={id} className="mb-1">
            {label}
          </Text>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`block w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
            error
              ? "border-red-500 focus:ring-red-500 focus:border-transparent"
              : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
          } ${className}`}
          {...props}
        />
        {error && (
          <Text variant="error" className="mt-1">
            {error}
          </Text>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
