"use server";

import { redirect } from "next/navigation";
import { SupabaseDatabaseDriver } from "@aethereos/drivers-supabase";
import { getServerSession } from "../../../lib/auth";
import {
  listProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  type ProductRow,
} from "../../../lib/products";
import type { Result } from "@aethereos/drivers";

function getDriver(): SupabaseDatabaseDriver {
  const connectionString = process.env["DATABASE_URL"] ?? "";
  return new SupabaseDatabaseDriver({ connectionString });
}

export async function getProductsAction(): Promise<
  Result<ProductRow[], Error>
> {
  const session = await getServerSession();
  if (!session?.companyId) {
    return { ok: false, error: new Error("Sem contexto de empresa") };
  }
  const driver = getDriver();
  return listProducts(driver.db, session.companyId);
}

export async function createProductAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await getServerSession();
  if (!session?.companyId) return { error: "Sem contexto de empresa" };

  const name = formData.get("name");
  const slug = formData.get("slug");
  const description = formData.get("description");
  const priceStr = formData.get("price_cents");

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof slug !== "string" ||
    !slug.trim() ||
    typeof priceStr !== "string"
  ) {
    return { error: "Campos obrigatórios ausentes" };
  }

  const priceCents = parseInt(priceStr, 10);
  if (isNaN(priceCents) || priceCents < 0) {
    return { error: "Preço inválido" };
  }

  const input: Parameters<typeof createProduct>[3] = {
    name: name.trim(),
    slug: slug.trim(),
    priceCents,
  };
  if (typeof description === "string" && description.trim()) {
    input.description = description.trim();
  }

  const driver = getDriver();
  const result = await createProduct(
    driver.db,
    session.companyId,
    { type: "human", user_id: session.userId },
    input,
  );

  if (!result.ok) {
    return { error: result.error.message };
  }

  redirect("/app/produtos");
}

export async function updateProductAction(
  productId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await getServerSession();
  if (!session?.companyId) return { error: "Sem contexto de empresa" };

  const name = formData.get("name");
  const slug = formData.get("slug");
  const description = formData.get("description");
  const priceStr = formData.get("price_cents");
  const status = formData.get("status");

  const changes: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) changes["name"] = name.trim();
  if (typeof slug === "string" && slug.trim()) changes["slug"] = slug.trim();
  if (typeof description === "string")
    changes["description"] = description.trim() || undefined;
  if (typeof priceStr === "string") {
    const priceCents = parseInt(priceStr, 10);
    if (!isNaN(priceCents) && priceCents >= 0)
      changes["priceCents"] = priceCents;
  }
  if (
    typeof status === "string" &&
    ["draft", "active", "archived"].includes(status)
  ) {
    changes["status"] = status;
  }

  const driver = getDriver();
  const result = await updateProduct(
    driver.db,
    session.companyId,
    productId,
    { type: "human", user_id: session.userId },
    changes,
  );

  if (!result.ok) {
    return { error: result.error.message };
  }

  redirect("/app/produtos");
}

export async function archiveProductAction(
  productId: string,
): Promise<{ error?: string }> {
  const session = await getServerSession();
  if (!session?.companyId) return { error: "Sem contexto de empresa" };

  const driver = getDriver();
  const result = await archiveProduct(driver.db, session.companyId, productId, {
    type: "human",
    user_id: session.userId,
  });

  if (!result.ok) {
    return { error: result.error.message };
  }

  return {};
}
