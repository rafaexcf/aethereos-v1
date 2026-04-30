import { forwardRef, useCallback, type InputHTMLAttributes } from "react";

export interface CEPAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface CEPInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  onAddressFound?: (address: CEPAddress) => void;
}

function applyCEPMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

async function lookupCEP(cep: string): Promise<CEPAddress | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, string>;
    return {
      cep: digits,
      street: data["street"] ?? "",
      neighborhood: data["neighborhood"] ?? "",
      city: data["city"] ?? "",
      state: data["state"] ?? "",
    };
  } catch {
    return null;
  }
}

export const CEPInput = forwardRef<HTMLInputElement, CEPInputProps>(
  ({ value, onChange, onAddressFound, className = "", ...rest }, ref) => {
    const handleChange = useCallback(
      async (raw: string) => {
        const masked = applyCEPMask(raw);
        onChange(masked);
        const digits = masked.replace(/\D/g, "");
        if (digits.length === 8 && onAddressFound !== undefined) {
          const addr = await lookupCEP(digits);
          if (addr !== null) onAddressFound(addr);
        }
      },
      [onChange, onAddressFound],
    );

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => void handleChange(e.target.value)}
        placeholder="01310-100"
        maxLength={9}
        className={className}
        {...rest}
      />
    );
  },
);

CEPInput.displayName = "CEPInput";
