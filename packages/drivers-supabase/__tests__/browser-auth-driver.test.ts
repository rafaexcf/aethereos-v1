/**
 * Testes unitários do SupabaseBrowserAuthDriver.
 * Mocka o cliente Supabase JS para testar a lógica do driver sem rede.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { SupabaseBrowserAuthDriver } from "../src/auth/supabase-browser-auth-driver.js";

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockGetUser = vi.fn();
const mockSignOutAdmin = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOtp: mockSignInWithOtp,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      admin: { signOut: mockSignOutAdmin },
    },
  })),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  access_token: "access-token-abc",
  refresh_token: "refresh-token-xyz",
  expires_at: Math.floor(Date.now() / 1000) + 900,
  user: { id: "user-123", email: "test@example.com" },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SupabaseBrowserAuthDriver", () => {
  let driver: SupabaseBrowserAuthDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    driver = new SupabaseBrowserAuthDriver({
      supabaseUrl: "http://localhost:54321",
      supabaseAnonKey: "test-anon-key",
    });
  });

  describe("signIn", () => {
    test("retorna Session em caso de sucesso", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: MOCK_SESSION, user: MOCK_SESSION.user },
        error: null,
      });

      const result = await driver.signIn("test@example.com", "password123");

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");

      expect(result.value.access_token).toBe("access-token-abc");
      expect(result.value.user_id).toBe("user-123");
      expect(result.value.email).toBe("test@example.com");
      expect(result.value.expires_at).toBeGreaterThan(0);
    });

    test("retorna AuthError em caso de credenciais inválidas", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Invalid login credentials" },
      });

      const result = await driver.signIn("bad@email.com", "wrong");

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected err");
      expect(result.error.message).toContain("Invalid login credentials");
    });

    test("retorna NetworkError em caso de exceção de rede", async () => {
      mockSignInWithPassword.mockRejectedValueOnce(
        new Error("network timeout"),
      );

      const result = await driver.signIn("test@example.com", "pw");

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected err");
      expect(result.error.message).toContain("network timeout");
    });
  });

  describe("signInWithMagicLink", () => {
    test("retorna ok quando email é enviado", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ data: {}, error: null });

      const result = await driver.signInWithMagicLink("user@test.com");

      expect(result.ok).toBe(true);
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: "user@test.com",
      });
    });

    test("retorna AuthError se falhar", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: {},
        error: { message: "Rate limit exceeded" },
      });

      const result = await driver.signInWithMagicLink("user@test.com");

      expect(result.ok).toBe(false);
    });
  });

  describe("signUp", () => {
    test("retorna userId e needsConfirmation=false quando sessão criada", async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: "new-user-456" },
          session: MOCK_SESSION,
        },
        error: null,
      });

      const result = await driver.signUp("new@test.com", "strongpassword");

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.value.userId).toBe("new-user-456");
      expect(result.value.needsConfirmation).toBe(false);
    });

    test("retorna needsConfirmation=true quando email precisa ser confirmado", async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: "user-789" }, session: null },
        error: null,
      });

      const result = await driver.signUp("unconfirmed@test.com", "pw");

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.value.needsConfirmation).toBe(true);
    });
  });

  describe("getSession", () => {
    test("retorna Session quando autenticado", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: MOCK_SESSION },
        error: null,
      });

      const result = await driver.getSession();

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.value).not.toBeNull();
      if (result.value === null) throw new Error("expected session");
      expect(result.value.user_id).toBe("user-123");
    });

    test("retorna null quando não autenticado", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const result = await driver.getSession();

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.value).toBeNull();
    });

    test("retorna AuthError em caso de falha", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: "session expired" },
      });

      const result = await driver.getSession();

      expect(result.ok).toBe(false);
    });
  });

  describe("refreshSession", () => {
    test("retorna nova Session", async () => {
      const newSession = {
        ...MOCK_SESSION,
        access_token: "new-access-token",
        expires_at: Math.floor(Date.now() / 1000) + 900,
      };
      mockRefreshSession.mockResolvedValueOnce({
        data: { session: newSession, user: newSession.user },
        error: null,
      });

      const result = await driver.refreshSession();

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.value.access_token).toBe("new-access-token");
    });
  });

  describe("withCompanyContext", () => {
    test("armazena companyId ativo", () => {
      expect(driver.getActiveCompanyId()).toBeNull();

      driver.withCompanyContext("company-uuid-001");

      expect(driver.getActiveCompanyId()).toBe("company-uuid-001");
    });

    test("atualiza companyId ao trocar de empresa", () => {
      driver.withCompanyContext("company-a");
      driver.withCompanyContext("company-b");

      expect(driver.getActiveCompanyId()).toBe("company-b");
    });

    test("limpa companyId após signOut", async () => {
      driver.withCompanyContext("company-a");
      mockSignOut.mockResolvedValueOnce({ error: null });

      await driver.signOut();

      expect(driver.getActiveCompanyId()).toBeNull();
    });
  });

  describe("getCompanyClaims (JWT claims customizados)", () => {
    test("retorna companies e activeCompanyId dos JWT claims", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            ...MOCK_SESSION,
            user: {
              ...MOCK_SESSION.user,
              app_metadata: {
                companies: ["company-a", "company-b"],
                active_company_id: "company-a",
              },
            },
          },
        },
        error: null,
      });

      const claims = await driver.getCompanyClaims();

      expect(claims.companies).toEqual(["company-a", "company-b"]);
      expect(claims.activeCompanyId).toBe("company-a");
    });

    test("retorna listas vazias quando sem sessão", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const claims = await driver.getCompanyClaims();

      expect(claims.companies).toEqual([]);
      expect(claims.activeCompanyId).toBeNull();
    });
  });

  describe("ping", () => {
    test("retorna ok quando sessão acessível", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: MOCK_SESSION },
        error: null,
      });

      const result = await driver.ping();

      expect(result.ok).toBe(true);
    });
  });
});

// Tipo utilitário para verificar que o mock é do tipo esperado
type _AssertFn = MockedFunction<() => void>;
