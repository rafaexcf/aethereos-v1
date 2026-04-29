import { describe, it, expect, vi } from "vitest";
import type { DrizzleDb } from "@aethereos/drivers-supabase";
import {
  createPendingOrder,
  markOrderPaid,
  markOrderFailed,
} from "../lib/orders";

function makeMockDb(overrides: Partial<DrizzleDb> = {}): DrizzleDb {
  return overrides as unknown as DrizzleDb;
}

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = {
  type: "human" as const,
  user_id: "00000000-0000-0000-0000-000000000099",
};

const ORDER = {
  id: "00000000-0000-0000-0000-000000000020",
  companyId: COMPANY_ID,
  customerEmail: "comprador@exemplo.com",
  customerName: null,
  amountCents: 1990,
  currency: "BRL",
  status: "pending",
  stripeSessionId: "cs_test_abc123",
  stripePaymentIntentId: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createPendingOrder", () => {
  it("inserts order, order_item and outbox in transaction", async () => {
    let insertCallCount = 0;
    const insertMocks = [
      // orders.insert().values().returning()
      {
        values: vi
          .fn()
          .mockReturnValue({ returning: vi.fn().mockResolvedValue([ORDER]) }),
      },
      // orderItems.insert().values()
      { values: vi.fn().mockResolvedValue([]) },
      // scpOutbox.insert().values()
      { values: vi.fn().mockResolvedValue([]) },
    ];

    const transactionMock = vi
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          insert: vi.fn().mockImplementation(() => {
            return (
              insertMocks[insertCallCount++] ?? {
                values: vi.fn().mockResolvedValue([]),
              }
            );
          }),
        };
        return fn(tx);
      });

    const db = makeMockDb({ transaction: transactionMock });

    const result = await createPendingOrder(db, COMPANY_ID, ACTOR, {
      productId: "00000000-0000-0000-0000-000000000010",
      productName: "Produto A",
      amountCents: 1990,
      currency: "BRL",
      customerEmail: "comprador@exemplo.com",
      stripeSessionId: "cs_test_abc123",
    });

    expect(result.ok).toBe(true);
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});

describe("markOrderPaid", () => {
  it("updates order status to paid and inserts outbox event", async () => {
    const paidOrder = {
      ...ORDER,
      status: "paid",
      stripePaymentIntentId: "pi_test_abc",
    };
    let insertCallCount = 0;

    const transactionMock = vi
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockReturnValue({
                  returning: vi.fn().mockResolvedValue([paidOrder]),
                }),
            }),
          }),
          insert: vi.fn().mockImplementation(() => {
            insertCallCount++;
            return { values: vi.fn().mockResolvedValue([]) };
          }),
        };
        return fn(tx);
      });

    const db = makeMockDb({ transaction: transactionMock });
    const result = await markOrderPaid(
      db,
      COMPANY_ID,
      "cs_test_abc123",
      "pi_test_abc",
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe("paid");
    expect(insertCallCount).toBeGreaterThan(0);
  });
});

describe("markOrderFailed", () => {
  it("updates order status to failed", async () => {
    const failedOrder = { ...ORDER, status: "failed" };

    const transactionMock = vi
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockReturnValue({
                  returning: vi.fn().mockResolvedValue([failedOrder]),
                }),
            }),
          }),
          insert: vi
            .fn()
            .mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
        };
        return fn(tx);
      });

    const db = makeMockDb({ transaction: transactionMock });
    const result = await markOrderFailed(
      db,
      COMPANY_ID,
      "cs_test_abc123",
      "Saldo insuficiente",
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe("failed");
  });
});
