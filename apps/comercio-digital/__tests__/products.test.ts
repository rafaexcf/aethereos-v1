import { describe, it, expect, vi } from "vitest";
import type { DrizzleDb } from "@aethereos/drivers-supabase";
import { listProducts, getProduct, createProduct } from "../lib/products";

function makeMockDb(overrides: Partial<DrizzleDb> = {}): DrizzleDb {
  return overrides as unknown as DrizzleDb;
}

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = {
  type: "human" as const,
  user_id: "00000000-0000-0000-0000-000000000099",
};

const PRODUCT = {
  id: "00000000-0000-0000-0000-000000000010",
  companyId: COMPANY_ID,
  name: "Produto A",
  slug: "produto-a",
  description: null,
  priceCents: 1990,
  currency: "BRL",
  status: "draft",
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("listProducts", () => {
  it("returns products from db", async () => {
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([PRODUCT]),
        }),
      }),
    });
    const db = makeMockDb({ select: selectMock });

    const result = await listProducts(db, COMPANY_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.name).toBe("Produto A");
    }
  });

  it("returns error on db failure", async () => {
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockRejectedValue(new Error("DB offline")),
        }),
      }),
    });
    const db = makeMockDb({ select: selectMock });

    const result = await listProducts(db, COMPANY_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("DB offline");
    }
  });
});

describe("getProduct", () => {
  it("returns the product when found", async () => {
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([PRODUCT]),
      }),
    });
    const db = makeMockDb({ select: selectMock });

    const result = await getProduct(db, COMPANY_ID, PRODUCT.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe(PRODUCT.id);
  });

  it("returns error when product not found", async () => {
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const db = makeMockDb({ select: selectMock });

    const result = await getProduct(db, COMPANY_ID, PRODUCT.id);
    expect(result.ok).toBe(false);
  });
});

describe("createProduct", () => {
  it("inserts product and outbox entry in a transaction", async () => {
    const insertedProduct = { ...PRODUCT };
    const txInsertMock = vi.fn().mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([insertedProduct]),
      }),
    }));
    const txOutboxInsertMock = vi.fn().mockImplementation(() => ({
      values: vi.fn().mockResolvedValue([]),
    }));

    let insertCallCount = 0;
    const transactionMock = vi
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          insert: vi.fn().mockImplementation(() => {
            insertCallCount++;
            if (insertCallCount === 1) return txInsertMock();
            return txOutboxInsertMock();
          }),
        };
        return fn(tx);
      });

    const db = makeMockDb({ transaction: transactionMock });

    const result = await createProduct(db, COMPANY_ID, ACTOR, {
      name: "Produto A",
      slug: "produto-a",
      priceCents: 1990,
    });

    expect(result.ok).toBe(true);
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});
