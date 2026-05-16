import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "outline" | "ghost";
}

export function Button({ 
  children, 
  className = "", 
  isLoading = false, 
  variant = "primary",
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = "group relative w-full flex justify-center py-3.5 px-4 text-sm font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transform transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none";
  
  const variants = {
    primary: "border border-transparent text-white bg-gradient-to-r from-blue-700 to-green-500 hover:from-blue-800 hover:to-green-600 focus:ring-blue-500 hover:shadow-lg hover:-translate-y-0.5",
    outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        children
      )}
    </button>
  );
}
