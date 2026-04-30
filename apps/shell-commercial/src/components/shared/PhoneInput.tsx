import { forwardRef, type InputHTMLAttributes } from "react";

interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onChange: (value: string) => void;
}

function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, className = "", ...rest }, ref) => {
    return (
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(applyPhoneMask(e.target.value))}
        placeholder="(11) 98765-4321"
        maxLength={15}
        className={className}
        {...rest}
      />
    );
  },
);

PhoneInput.displayName = "PhoneInput";
