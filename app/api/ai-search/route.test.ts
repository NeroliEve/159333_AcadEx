import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.fn();
const mockGetCourseOptions = vi.fn();
const mockGetListingsFeed = vi.fn();
const mockGetStudyAreaOptions = vi.fn();
const mockGetUniversityOptions = vi.fn();
const mockAnthropic = vi.fn();

vi.mock("@/lib/utils", () => ({
  hasEnvVars: true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/marketplace", () => ({
  getCourseOptions: mockGetCourseOptions,
  getListingsFeed: mockGetListingsFeed,
  getStudyAreaOptions: mockGetStudyAreaOptions,
  getUniversityOptions: mockGetUniversityOptions,
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: mockAnthropic,
}));

function postAiSearch(query: unknown) {
  return new Request("http://localhost/api/ai-search", {
    body: JSON.stringify({ query }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/ai-search", () => {
  beforeEach(() => {
    vi.resetModules();
    mockAnthropic.mockReset();
    mockCreateClient.mockReset();
    mockGetCourseOptions.mockReset();
    mockGetListingsFeed.mockReset();
    mockGetStudyAreaOptions.mockReset();
    mockGetUniversityOptions.mockReset();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("requires a signed-in user before running AI search", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const { POST } = await import("@/app/api/ai-search/route");
    const response = await POST(postAiSearch("biology books"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      explanation: "",
      filters: {},
      message: "You must be logged in to use AI search.",
      status: "error",
    });
    expect(mockAnthropic).not.toHaveBeenCalled();
    expect(mockGetUniversityOptions).not.toHaveBeenCalled();
    expect(mockGetCourseOptions).not.toHaveBeenCalled();
    expect(mockGetStudyAreaOptions).not.toHaveBeenCalled();
    expect(mockGetListingsFeed).not.toHaveBeenCalled();
  });

  it("keeps validating signed-in requests after the auth check", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    });
    process.env.ANTHROPIC_API_KEY = "test-key";

    const { POST } = await import("@/app/api/ai-search/route");
    const response = await POST(postAiSearch(" "));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      explanation: "",
      filters: {},
      message: "Please enter a search query.",
      status: "error",
    });
  });
});
