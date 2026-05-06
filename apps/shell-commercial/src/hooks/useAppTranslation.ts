/**
 * Super Sprint C / MX215 — useAppTranslation hook.
 *
 * Wrapper sobre useTranslation do react-i18next que adiciona formatadores
 * Intl com locale dinâmico baseado em i18n.language.
 *
 * Uso:
 *   const { t, formatDate, formatNumber, formatCurrency } = useAppTranslation('drive');
 *   <h1>{t('files_title')}</h1>
 *   <span>{formatDate(file.created_at)}</span>
 */

import { useTranslation } from "react-i18next";

type DateStyle = "short" | "long" | "relative";

export function useAppTranslation(namespace: string) {
  const { t, i18n } = useTranslation(namespace);

  /**
   * formatDate — formata Date|string ISO via Intl.
   * style='short' (default): apenas data curta.
   * style='long': data + hora.
   * style='relative': "há 3 dias" / "in 3 days".
   */
  const formatDate = (
    date: Date | string,
    style: DateStyle = "short",
  ): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return "—";
    if (style === "relative") {
      const rtf = new Intl.RelativeTimeFormat(i18n.language, {
        numeric: "auto",
      });
      const diffMs = d.getTime() - Date.now();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      // Janela de 1 ano: usa dias. Acima: data absoluta.
      if (Math.abs(diffDays) > 365) {
        return new Intl.DateTimeFormat(i18n.language, {
          dateStyle: "short",
        }).format(d);
      }
      return rtf.format(diffDays, "day");
    }
    const opts: Intl.DateTimeFormatOptions =
      style === "long"
        ? { dateStyle: "long", timeStyle: "medium" }
        : { dateStyle: "short" };
    return new Intl.DateTimeFormat(i18n.language, opts).format(d);
  };

  /** formatNumber — número com separadores do locale (1.234,56 PT-BR; 1,234.56 EN). */
  const formatNumber = (num: number, fractionDigits?: number): string => {
    const opts: Intl.NumberFormatOptions = {};
    if (fractionDigits !== undefined) {
      opts.minimumFractionDigits = fractionDigits;
      opts.maximumFractionDigits = fractionDigits;
    }
    return new Intl.NumberFormat(i18n.language, opts).format(num);
  };

  /**
   * formatCurrency — moeda com símbolo do locale.
   * default BRL para PT-BR, USD para EN.
   */
  const formatCurrency = (amount: number, currency?: string): string => {
    const cur = currency ?? (i18n.language.startsWith("pt") ? "BRL" : "USD");
    return new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: cur,
    }).format(amount);
  };

  /** formatPercent — 0.42 → "42%" (EN) ou "42 %" (PT-BR). */
  const formatPercent = (value: number, fractionDigits = 0): string =>
    new Intl.NumberFormat(i18n.language, {
      style: "percent",
      maximumFractionDigits: fractionDigits,
    }).format(value);

  return { t, i18n, formatDate, formatNumber, formatCurrency, formatPercent };
}
