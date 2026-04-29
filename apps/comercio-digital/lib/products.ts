import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { DrizzleDb } from "@aethereos/drivers-supabase";
import { products, scpOutbox } from "@aethereos/drivers-supabase";
import {
  register,
  buildEnvelope,
  COMMERCE_EVENT_SCHEMAS,
} from "@aethereos/scp-registry";
import type { Actor } from "@aethereos/scp-registry";
import { ok, err } from "@aethereos/drivers";
import type { Result } from "@aethereos/drivers";

// Register commerce event schemas once at module load
for (const [type, schema] of Object.entries(COMMERCE_EVENT_SCHEMAS)) {
  if (!Object.prototype.hasOwnProperty.call(COMMERCE_EVENT_SCHEMAS, type))
    continue;
  try {
    register(type, schema);
  } catch {
    // Already registered (hot reload in dev)
  }
}

export type ProductInput = {
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  currency?: "BRL" | "USD" | "EUR";
  status?: "draft" | "active" | "archived";
};

export type ProductRow = typeof products.$inferSelect;

export async function listProducts(
  db: DrizzleDb,
  companyId: string,
): Promise<Result<ProductRow[], Error>> {
  try {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId))
      .orderBy(products.createdAt);
    return ok(rows);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function getProduct(
  db: DrizzleDb,
  companyId: string,
  productId: string,
): Promise<Result<ProductRow, Error>> {
  try {
    const [row] = await db
      .select()
      .from(products)
      .where(
        and(eq(products.companyId, companyId), eq(products.id, productId)),
      );
    if (!row) return err(new Error("Produto não encontrado"));
    return ok(row);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function createProduct(
  db: DrizzleDb,
  companyId: string,
  actor: Actor,
  input: ProductInput,
): Promise<Result<ProductRow, Error>> {
  try {
    const result = await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          companyId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          priceCents: input.priceCents,
          currency: input.currency ?? "BRL",
          status: input.status ?? "draft",
          metadata: {},
        })
        .returning();

      if (!product) throw new Error("Insert retornou vazio");

      const envelope = buildEnvelope({
        type: "commerce.product.created",
        tenant_id: companyId,
        actor,
        correlation_id: randomUUID(),
        payload: {
          product_id: product.id,
          company_id: companyId,
          name: product.name,
          slug: product.slug,
          price_cents: product.priceCents,
          currency: product.currency,
          status: product.status,
        },
      });

      if (envelope.ok) {
        await tx.insert(scpOutbox).values({
          companyId,
          eventType: "commerce.product.created",
          eventId: envelope.value.id,
          payload: envelope.value.payload,
          envelope: envelope.value as unknown as Record<string, unknown>,
        });
      }

      return product;
    });

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function updateProduct(
  db: DrizzleDb,
  companyId: string,
  productId: string,
  actor: Actor,
  changes: Partial<ProductInput>,
): Promise<Result<ProductRow, Error>> {
  try {
    const result = await db.transaction(async (tx) => {
      const updateData: Partial<typeof products.$inferInsert> = {};
      if (changes.name !== undefined) updateData.name = changes.name;
      if (changes.slug !== undefined) updateData.slug = changes.slug;
      if (changes.description !== undefined)
        updateData.description = changes.description;
      if (changes.priceCents !== undefined)
        updateData.priceCents = changes.priceCents;
      if (changes.currency !== undefined)
        updateData.currency = changes.currency;
      if (changes.status !== undefined) updateData.status = changes.status;

      const [product] = await tx
        .update(products)
        .set(updateData)
        .where(
          and(eq(products.companyId, companyId), eq(products.id, productId)),
        )
        .returning();

      if (!product) throw new Error("Produto não encontrado");

      const envelope = buildEnvelope({
        type: "commerce.product.updated",
        tenant_id: companyId,
        actor,
        correlation_id: randomUUID(),
        payload: {
          product_id: productId,
          company_id: companyId,
          changes: changes as Record<string, unknown>,
        },
      });

      if (envelope.ok) {
        await tx.insert(scpOutbox).values({
          companyId,
          eventType: "commerce.product.updated",
          eventId: envelope.value.id,
          payload: envelope.value.payload,
          envelope: envelope.value as unknown as Record<string, unknown>,
        });
      }

      return product;
    });

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function archiveProduct(
  db: DrizzleDb,
  companyId: string,
  productId: string,
  actor: Actor,
): Promise<Result<ProductRow, Error>> {
  return updateProduct(db, companyId, productId, actor, { status: "archived" });
}
