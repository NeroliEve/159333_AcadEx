import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin";

type CourseResponse = {
  course?: {
    course_code: string;
    course_name: string;
    id: number;
    university_id: number | null;
  };
  message?: string;
  status: "error" | "success";
};

function parseUniversityId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = Number(String(value).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: Request) {
  const { isAdmin, profileId, supabase, userId } = await getAdminContext();

  if (!userId) {
    return NextResponse.json<CourseResponse>(
      { message: "You need to sign in first.", status: "error" },
      { status: 401 },
    );
  }

  if (!isAdmin) {
    return NextResponse.json<CourseResponse>(
      { message: "Only admins can manage courses.", status: "error" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const courseCode =
    typeof body.course_code === "string" ? body.course_code.trim() : "";
  const courseName =
    typeof body.course_name === "string" ? body.course_name.trim() : "";
  const universityId = parseUniversityId(body.university_id);

  if (!courseCode || !courseName || !universityId) {
    return NextResponse.json<CourseResponse>(
      {
        message: "Course code, course name, and university are required.",
        status: "error",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      course_code: courseCode,
      course_name: courseName,
      created_by: profileId,
      university: "",
      university_id: universityId,
    })
    .select("id, course_code, course_name, university_id")
    .single();

  if (error) {
    return NextResponse.json<CourseResponse>(
      { message: error.message, status: "error" },
      { status: 400 },
    );
  }

  return NextResponse.json<CourseResponse>({
    course: data,
    message: "Course added.",
    status: "success",
  });
}
