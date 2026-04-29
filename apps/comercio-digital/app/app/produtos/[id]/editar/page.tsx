"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useActionState, useTransition } from "react";
import { updateProductAction, archiveProductAction } from "../../actions";

export default function EditarProdutoPage() {
  const params = useParams();
  const productId = typeof params["id"] === "string" ? params["id"] : "";

  const boundUpdate = updateProductAction.bind(null, productId);
  const [state, formAction, isPending] = useActionState(boundUpdate, null);

  const [isArchiving, startArchive] = useTransition();

  function handleArchive() {
    startArchive(async () => {
      await archiveProductAction(productId);
    });
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/app/produtos"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
        >
          ← Produtos
        </Link>
        <h1 className="text-2xl font-bold">Editar produto</h1>
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
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            pattern="^[a-z0-9][a-z0-9\-]*[a-z0-9]$"
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
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
            Preço (em centavos)
          </label>
          <input
            id="price_cents"
            name="price_cents"
            type="number"
            min={0}
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
          <Link
            href="/app/produtos"
            className="px-4 py-2 rounded-[var(--radius)] text-sm border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            className="ml-auto px-4 py-2 rounded-[var(--radius)] text-sm border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isArchiving ? "Arquivando..." : "Arquivar"}
          </button>
        </div>
      </form>
    </div>
  );
}
