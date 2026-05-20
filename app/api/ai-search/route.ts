import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import {
  getCourseOptions,
  getListingsFeed,
  getStudyAreaOptions,
  getUniversityOptions,
} from "@/lib/marketplace";

type FilterParams = {
  q?: string;
  universityId?: string;
  courseId?: string;
  studyAreaId?: string;
  condition?: string;
  listingType?: string;
  minPrice?: string;
  maxPrice?: string;
  sellerName?: string;
};

type AiSearchResponse = {
  explanation: string;
  filters: FilterParams;
  status: "error" | "success";
  message?: string;
};

export async function POST(request: Request) {
  try {
    if (!hasEnvVars) {
      return NextResponse.json<AiSearchResponse>(
        { explanation: "", filters: {}, message: "Supabase environment variables are missing.", status: "error" },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<AiSearchResponse>(
        { explanation: "", filters: {}, message: "You must be logged in to use AI search.", status: "error" },
        { status: 401 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json<AiSearchResponse>(
        { explanation: "", filters: {}, message: "AI search is not configured.", status: "error" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { query?: unknown };
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json<AiSearchResponse>(
        { explanation: "", filters: {}, message: "Please enter a search query.", status: "error" },
        { status: 400 },
      );
    }

    // Fetch all available filter options so Claude knows the real IDs
    const [universities, courses, studyAreas] = await Promise.all([
      getUniversityOptions(),
      getCourseOptions(),
      getStudyAreaOptions(),
    ]);

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a search assistant for AcadEx, a peer-to-peer textbook marketplace for New Zealand university students.

Interpret the student's natural language query and call search_listings with the most relevant filters from the options below.

Universities (use the exact numeric ID):
${universities.map((u) => `- "${u.name}" → id ${u.id}`).join("\n")}

Study areas (use the exact numeric ID):
${studyAreas.map((s) => `- "${s.name}" → id ${s.id}`).join("\n")}

Courses (use the exact numeric ID):
${courses.map((c) => `- ${c.course_code} (${c.course_name}) → id ${c.id}`).join("\n")}

Rules:
- Always call search_listings
- Only set a price filter if the user explicitly mentions price, cost, or money (e.g. "cheap", "under $30", "affordable", "budget") — NEVER infer price from words like "first year", "student", or subject names
- Map university names or abbreviations (e.g. "Massey", "AUT", "Victoria", "Vic") to the correct university ID
- Match course codes (e.g. "PSYC100") directly to courseId
- title_keywords is ONLY for specific book titles, subjects, or author names — NEVER use it for generic words like "books", "textbook", "first year", "cheap", "good", "affordable", or any price/condition/level words
- "first year", "intro", "beginner" describe a level — do NOT set title_keywords or courseId for these; leave them unset and let the university filter do the work
- When in doubt, use fewer filters — one confident filter beats three guesses
- If the query is a single word or short name that does not match a book subject, course code, or university, treat it as a seller name and set seller_name — do NOT set title_keywords for it
- If the user explicitly mentions a seller (e.g. "from neroli", "by inigo", "neroli's books"), always set seller_name
- After receiving search results, respond with exactly ONE short sentence summarising what was found — do NOT ask follow-up questions or offer to refine the search`;

    const tools: Anthropic.Tool[] = [
      {
        name: "search_listings",
        description: "Search the AcadEx marketplace for textbook listings using structured filters.",
        input_schema: {
          type: "object" as const,
          properties: {
            title_keywords: {
              type: "string",
              description: "Keywords to match in book title or author name",
            },
            universityId: {
              type: "number",
              description: "Numeric ID of the seller's university",
            },
            courseId: {
              type: "number",
              description: "Numeric ID of the course the book is listed under",
            },
            studyAreaId: {
              type: "number",
              description: "Numeric ID of the area of study",
            },
            condition: {
              type: "string",
              description: "Book condition — one of: new, like_new, good, fair, poor",
            },
            listingType: {
              type: "string",
              description: "Listing type — one of: sale_only, trade_only, sale_or_trade",
            },
            minPrice: {
              type: "number",
              description: "Minimum price in NZD",
            },
            maxPrice: {
              type: "number",
              description: "Maximum price in NZD",
            },
            seller_name: {
              type: "string",
              description: "Seller's username or name to filter listings by",
            },
          },
        },
      },
    ];

    // Step 1: send query → Claude decides which filters to apply
    const firstResponse = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      tools,
      tool_choice: { type: "tool", name: "search_listings" },
      messages: [{ role: "user", content: query }],
    });

    const toolUseBlock = firstResponse.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    const args = (toolUseBlock?.input ?? {}) as Record<string, unknown>;

    // Map Claude's structured output to URL-ready filter params
    const filters: FilterParams = {};

    if (typeof args.title_keywords === "string" && args.title_keywords) {
      filters.q = args.title_keywords;
    }
    if (typeof args.universityId === "number") {
      filters.universityId = String(args.universityId);
    }
    if (typeof args.courseId === "number") {
      filters.courseId = String(args.courseId);
    }
    if (typeof args.studyAreaId === "number") {
      filters.studyAreaId = String(args.studyAreaId);
    }
    if (typeof args.condition === "string" && args.condition) {
      filters.condition = args.condition;
    }
    if (typeof args.listingType === "string" && args.listingType) {
      filters.listingType = args.listingType;
    }
    if (typeof args.minPrice === "number") {
      filters.minPrice = String(args.minPrice);
    }
    if (typeof args.maxPrice === "number") {
      filters.maxPrice = String(args.maxPrice);
    }
    if (typeof args.seller_name === "string" && args.seller_name) {
      filters.sellerName = args.seller_name;
    }

    // Step 2: run the actual search so Claude can write an accurate explanation
    const { listings } = await getListingsFeed("authenticated", {
      q: filters.q,
      universityId: filters.universityId ? Number(filters.universityId) : undefined,
      courseId: filters.courseId ? Number(filters.courseId) : undefined,
      studyAreaId: filters.studyAreaId ? Number(filters.studyAreaId) : undefined,
      condition: filters.condition,
      listingType: filters.listingType,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      sellerName: filters.sellerName,
    }, 24, { viewerId: user.id });

    // Step 3: send real results back → Claude writes a friendly one-sentence explanation
    const secondResponse = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: systemPrompt,
      tools,
      messages: [
        { role: "user", content: query },
        { role: "assistant", content: firstResponse.content },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock?.id ?? "",
              content: JSON.stringify({
                listings_found: listings.length,
                sample_titles: listings.slice(0, 4).map((l) => l.title),
              }),
            },
          ],
        },
      ],
    });

    const textBlock = secondResponse.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );

    const explanation =
      textBlock?.text.trim() ||
      (listings.length > 0
        ? `Found ${listings.length} listing${listings.length !== 1 ? "s" : ""} matching your search.`
        : "No listings matched your search — try broadening your query.");

    return NextResponse.json<AiSearchResponse>({
      explanation,
      filters,
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<AiSearchResponse>(
      {
        explanation: "",
        filters: {},
        message: error instanceof Error ? error.message : "AI search is unavailable right now.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
