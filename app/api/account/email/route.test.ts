import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateAdminClient = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

function patchEmail(email: unknown) {
  return new Request("http://localhost/api/account/email", {
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

describe("PATCH /api/account/email", () => {
  const updateUserById = vi.fn();
  const profileUpdateEq = vi.fn();
  const profileUpdate = vi.fn(() => ({ eq: profileUpdateEq }));

  beforeEach(() => {
    vi.resetModules();
    mockCreateClient.mockReset();
    mockCreateAdminClient.mockReset();
    updateUserById.mockReset();
    profileUpdate.mockClear();
    profileUpdateEq.mockReset();

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "old@example.com", id: "user-1" } },
          error: null,
        }),
      },
    });

    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          updateUserById,
        },
      },
      from: vi.fn(() => ({
        update: profileUpdate,
      })),
    });

    updateUserById.mockResolvedValue({
      data: { user: { email: "johnappleseed@apple.com" } },
      error: null,
    });

    profileUpdateEq.mockResolvedValue({ error: null });
  });

  it("updates the signed-in user's email directly with a confirmed admin auth change", async () => {
    const { PATCH } = await import("@/app/api/account/email/route");

    const response = await PATCH(patchEmail(" JohnAppleseed@Apple.com "));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      email: "johnappleseed@apple.com",
      email_confirm: true,
    });
    expect(profileUpdate).toHaveBeenCalledWith({ email: "johnappleseed@apple.com" });
    expect(profileUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(body).toEqual({
      email: "johnappleseed@apple.com",
      message: "Email updated successfully.",
      status: "success",
    });
  });

  it("returns auth update errors without updating the profile row", async () => {
    updateUserById.mockResolvedValue({
      data: { user: null },
      error: new Error("Email already registered."),
    });
    const { PATCH } = await import("@/app/api/account/email/route");

    const response = await PATCH(patchEmail("taken@example.com"));

    expect(response.status).toBe(400);
    expect(profileUpdate).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      message: "Email already registered.",
      status: "error",
    });
  });

  it("requires a signed-in user", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    const { PATCH } = await import("@/app/api/account/email/route");

    const response = await PATCH(patchEmail("new@example.com"));

    expect(response.status).toBe(401);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
