import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail } from "../src/activities/email.js";

describe("sendEmail activity", () => {
  beforeEach(() => {
    delete process.env["RESEND_API_KEY"];
  });

  it("logs to stdout in dev mode (no API key)", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Hi",
      body: "Body",
    });
    expect(result).toEqual({ delivered: false, provider: "console" });
    expect(writeSpy).toHaveBeenCalled();
    writeSpy.mockRestore();
  });

  it("calls Resend API when key is set", async () => {
    process.env["RESEND_API_KEY"] = "re-test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{}",
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Hi",
      body: "Body",
    });
    expect(result).toEqual({ delivered: true, provider: "resend" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    vi.unstubAllGlobals();
  });

  it("throws when Resend returns non-ok status", async () => {
    process.env["RESEND_API_KEY"] = "re-test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => "validation error",
      }),
    );
    await expect(
      sendEmail({ to: "x@y.com", subject: "s", body: "b" }),
    ).rejects.toThrow(/Resend 422/);
    vi.unstubAllGlobals();
  });
});
