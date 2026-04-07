import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base = "font-semibold transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "btn-primary",
    ghost: "btn-ghost",
    icon: "w-9 h-9 rounded-full bg-elevated hover:bg-border text-text-secondary hover:text-text-primary flex items-center justify-center",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-5 py-2",
    lg: "text-base px-6 py-3",
  };

  const sizeClass = variant === "icon" ? "" : sizes[size];

  return (
    <button className={`${base} ${variants[variant]} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
