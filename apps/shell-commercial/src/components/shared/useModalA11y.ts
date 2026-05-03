import { useEffect, useRef } from "react";

/**
 * A11y helpers para modais:
 * - Foca o primeiro elemento focável ao abrir
 * - Trap de Tab dentro do modal
 * - Esc fecha
 * - Restaura foco ao elemento anterior ao fechar
 *
 * Uso:
 *   const ref = useModalA11y({ open, onClose });
 *   return <div ref={ref}>...</div>;
 */
export function useModalA11y<T extends HTMLElement>(params: {
  open: boolean;
  onClose: () => void;
}): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!params.open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus first focusable inside the modal
    const root = ref.current;
    if (root !== null) {
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length > 0) {
        focusables[0]?.focus();
      } else {
        root.setAttribute("tabindex", "-1");
        root.focus();
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        params.onClose();
        return;
      }
      if (e.key === "Tab" && root !== null) {
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (first === undefined || last === undefined) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey, true);

    return () => {
      document.removeEventListener("keydown", handleKey, true);
      previouslyFocused.current?.focus();
    };
  }, [params, params.open, params.onClose]);

  return ref;
}
