import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "icon";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-[var(--ae-primary)] text-[var(--ae-primary-fg)] hover:opacity-90",
  secondary:
    "bg-[var(--ae-secondary)] text-[var(--ae-secondary-fg)] hover:opacity-90",
  destructive: "bg-[var(--ae-destructive)] text-white hover:opacity-90",
  ghost: "hover:bg-[var(--ae-accent)] hover:text-[var(--ae-accent-fg)]",
  link: "text-[var(--ae-primary)] underline-offset-4 hover:underline p-0",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-6 text-base",
  icon: "h-9 w-9",
};

/**
 * Button — primitivo base de botão usando design tokens do shell.
 * CSS transitions apenas (sem framer-motion — ADR-0014 #5).
 */
export function Button({
  variant = "default",
  size = "md",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ae-ring)]",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
