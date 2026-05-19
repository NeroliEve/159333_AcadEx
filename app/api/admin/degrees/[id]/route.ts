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

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseStudyAreaId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function requireAdmin() {
  const context = await getAdminContext();

  if (!context.userId) {
    return {
      context,
      response: NextResponse.json<DegreeResponse>(
        { message: "You need to sign in first.", status: "error" },
        { status: 401 },
      ),
    };
  }

  if (!context.isAdmin) {
    return {
      context,
      response: NextResponse.json<DegreeResponse>(
        { message: "Only admins can manage degrees.", status: "error" },
        { status: 403 },
      ),
    };
  }

  return { context, response: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { context, response } = await requireAdmin();
  if (response) return response;

  const { id: idParam } = await params;
  const degreeId = parseId(idParam);
  if (!degreeId) {
    return NextResponse.json<DegreeResponse>(
      { message: "Invalid degree id.", status: "error" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = slugify(name);
  const studyAreaId = parseStudyAreaId(body.studyAreaId ?? body.study_area_id);
  const isActive =
    typeof body.isActive === "boolean"
      ? body.isActive
      : typeof body.is_active === "boolean"
        ? body.is_active
        : true;

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

  const { data, error } = await context.supabase
    .from("degrees")
    .update({
      is_active: isActive,
      name,
      slug,
      study_area_id: studyAreaId,
    })
    .eq("id", degreeId)
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
    message: "Degree updated.",
    status: "success",
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { context, response } = await requireAdmin();
  if (response) return response;

  const { id: idParam } = await params;
  const degreeId = parseId(idParam);
  if (!degreeId) {
    return NextResponse.json<DegreeResponse>(
      { message: "Invalid degree id.", status: "error" },
      { status: 400 },
    );
  }

  const { data, error } = await context.supabase
    .from("degrees")
    .update({ is_active: false })
    .eq("id", degreeId)
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
    message: "Degree deactivated.",
    status: "success",
  });
}
