"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createProductAction } from "../actions";

export default function NovoProdutoPage() {
  const [state, formAction, isPending] = useActionState(
    createProductAction,
    null,
  );

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/app/produtos"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
        >
          ← Produtos
        </Link>
        <h1 className="text-2xl font-bold">Novo produto</h1>
      </div>

      {state?.error && (
        <div className="border border-red-300 bg-red-50 text-red-700 rounded-[var(--radius)] p-3 mb-4 text-sm">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={255}
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="slug">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            pattern="^[a-z0-9][a-z0-9\-]*[a-z0-9]$"
            placeholder="meu-produto"
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Apenas letras minúsculas, números e hífens
          </p>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="description"
          >
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="price_cents"
          >
            Preço (em centavos) <span className="text-red-500">*</span>
          </label>
          <input
            id="price_cents"
            name="price_cents"
            type="number"
            required
            min={0}
            placeholder="1990 = R$19,90"
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Criando..." : "Criar produto"}
          </button>
          <Link
            href="/app/produtos"
            className="px-4 py-2 rounded-[var(--radius)] text-sm border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
