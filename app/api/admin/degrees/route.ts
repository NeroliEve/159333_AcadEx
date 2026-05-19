import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin";
import { slugify } from "@/lib/utils";

type DegreeResponse = {
  degree?: {
    id: number;
    is_active: boolean;
    name: string;
    slug: string;
    study_area_id: number;
    study_area: {
      id: number;
      name: string;
      slug: string;
    } | null;
  };
  message?: string;
  status: "error" | "success";
};

const DEGREE_SELECT =
  "id, is_active, name, slug, study_area_id, study_area:study_areas!degrees_study_area_id_fkey(id, name, slug)";

function parseStudyAreaId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request) {
  const { isAdmin, profileId, supabase, userId } = await getAdminContext();

  if (!userId) {
    return NextResponse.json<DegreeResponse>(
      { message: "You need to sign in first.", status: "error" },
      { status: 401 },
    );
  }

  if (!isAdmin) {
    return NextResponse.json<DegreeResponse>(
      { message: "Only admins can manage degrees.", status: "error" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = slugify(name);
  const studyAreaId = parseStudyAreaId(body.studyAreaId ?? body.study_area_id);

  if (!name || !slug) {
    return NextResponse.json<DegreeResponse>(
      { message: "Add a valid degree name.", status: "error" },
      { status: 400 },
    );
  }

  if (!studyAreaId) {
    return NextResponse.json<DegreeResponse>(
      { message: "Choose a valid study area.", status: "error" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("degrees")
    .insert({
      created_by: profileId,
      name,
      slug,
      study_area_id: studyAreaId,
    })
    .select(DEGREE_SELECT)
    .single();

  if (error) {
    return NextResponse.json<DegreeResponse>(
      { message: error.message, status: "error" },
      { status: 400 },
    );
  }

  return NextResponse.json<DegreeResponse>({
    degree: data as DegreeResponse["degree"],
    message: "Degree added.",
    status: "success",
  });
}
