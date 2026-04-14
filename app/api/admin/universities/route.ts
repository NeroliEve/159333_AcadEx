import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin";
import { slugify } from "@/lib/utils";

type UniversityResponse = {
  message?: string;
  status: "error" | "success";
  university?: {
    id: number;
    is_active: boolean;
    name: string;
    slug: string;
  };
};

export async function POST(request: Request) {
  const { isAdmin, profileId, supabase, userId } = await getAdminContext();

  if (!userId) {
    return NextResponse.json<UniversityResponse>(
      { message: "You need to sign in first.", status: "error" },
      { status: 401 },
    );
  }

  if (!isAdmin) {
    return NextResponse.json<UniversityResponse>(
      { message: "Only admins can manage universities.", status: "error" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = slugify(name);

  if (!name || !slug) {
    return NextResponse.json<UniversityResponse>(
      { message: "Add a valid university name.", status: "error" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("universities")
    .insert({
      created_by: profileId,
      name,
      slug,
    })
    .select("id, is_active, name, slug")
    .single();

  if (error) {
    return NextResponse.json<UniversityResponse>(
      { message: error.message, status: "error" },
      { status: 400 },
    );
  }

  return NextResponse.json<UniversityResponse>({
    message: "University added.",
    status: "success",
    university: data,
  });
}
