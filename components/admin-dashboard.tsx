"use client";

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/ui/pill-button";
import type { AdminCourse, UniversityOption } from "@/lib/marketplace";

type AdminDashboardProps = {
  courses: AdminCourse[];
  universities: UniversityOption[];
};

type RequestState = {
  message: string;
  status: "error" | "success";
} | null;

type EditableCourse = {
  course_code: string;
  course_name: string;
  id: number;
  university_id: number | null;
};

type EditableUniversity = {
  id: number;
  is_active: boolean;
  name: string;
  slug: string;
};

export function AdminDashboard({
  courses: initialCourses,
  universities: initialUniversities,
}: AdminDashboardProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<EditableCourse[]>(
    initialCourses.map((course) => ({
      course_code: course.course_code,
      course_name: course.course_name,
      id: course.id,
      university_id: course.university_id,
    })),
  );
  const [universities, setUniversities] = useState<EditableUniversity[]>(
    initialUniversities.map((university) => ({
      id: university.id,
      is_active: university.is_active,
      name: university.name,
      slug: university.slug,
    })),
  );
  const [courseDraft, setCourseDraft] = useState({
    course_code: "",
    course_name: "",
    university_id: "",
  });
  const [universityDraft, setUniversityDraft] = useState("");
  const [courseState, setCourseState] = useState<RequestState>(null);
  const [universityState, setUniversityState] = useState<RequestState>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const toastTransitionTimeoutRef = useRef<number | null>(null);

  const sortedUniversities = useMemo(
    () => [...universities].sort((a, b) => a.name.localeCompare(b.name)),
    [universities],
  );

  useEffect(() => {
    if (!toastMessage) {
      setIsToastVisible(false);

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }

      return;
    }

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    if (toastTransitionTimeoutRef.current) {
      window.clearTimeout(toastTransitionTimeoutRef.current);
    }

    setIsToastVisible(false);

    requestAnimationFrame(() => {
      setIsToastVisible(true);
    });

    toastTimeoutRef.current = window.setTimeout(() => {
      setIsToastVisible(false);

      toastTransitionTimeoutRef.current = window.setTimeout(() => {
        setToastMessage(null);
        toastTransitionTimeoutRef.current = null;
      }, 180);

      toastTimeoutRef.current = null;
    }, 3000);

    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }

      if (toastTransitionTimeoutRef.current) {
        window.clearTimeout(toastTransitionTimeoutRef.current);
        toastTransitionTimeoutRef.current = null;
      }
    };
  }, [toastMessage]);

  function setError(
    setter: Dispatch<SetStateAction<RequestState>>,
    message: string,
  ) {
    setter({ message, status: "error" });
  }

  async function createUniversity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUniversityState(null);
    setPendingKey("create-university");

    try {
      const response = await fetch("/api/admin/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: universityDraft }),
      });
      const data = (await response.json()) as {
        message?: string;
        status: "error" | "success";
        university?: EditableUniversity;
      };

      if (data.status === "error" || !data.university) {
        setError(
          setUniversityState,
          data.message ?? "Could not create the university.",
        );
        return;
      }

      setUniversities((current) =>
        [...current, data.university].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setUniversityDraft("");
      setUniversityState(null);
      setToastMessage(data.message ?? "University added.");
      router.refresh();
    } catch {
      setError(setUniversityState, "Could not reach the university endpoint.");
    } finally {
      setPendingKey(null);
    }
  }

  async function updateUniversity(id: number) {
    const university = universities.find((item) => item.id === id);
    if (!university) return;

    setUniversityState(null);
    setPendingKey(`university-save-${id}`);

    try {
      const response = await fetch(`/api/admin/universities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: university.name }),
      });
      const data = (await response.json()) as {
        message?: string;
        status: "error" | "success";
        university?: EditableUniversity;
      };

      if (data.status === "error" || !data.university) {
        setError(
          setUniversityState,
          data.message ?? "Could not update the university.",
        );
        return;
      }

      setUniversities((current) =>
        current
          .map((item) => (item.id === id ? data.university! : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setUniversityState(null);
      setToastMessage(data.message ?? "University updated.");
      router.refresh();
    } catch {
      setError(setUniversityState, "Could not reach the university endpoint.");
    } finally {
      setPendingKey(null);
    }
  }

  async function deleteUniversity(id: number) {
    const university = universities.find((item) => item.id === id);
    if (!university) return;

    const confirmed = window.confirm(
      `Delete ${university.name}? Existing profiles and courses will lose the managed link but keep their text value.`,
    );
    if (!confirmed) return;

    setUniversityState(null);
    setPendingKey(`university-delete-${id}`);

    try {
      const response = await fetch(`/api/admin/universities/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        message?: string;
        status: "error" | "success";
      };

      if (data.status === "error") {
        setError(
          setUniversityState,
          data.message ?? "Could not delete the university.",
        );
        return;
      }

      setUniversities((current) => current.filter((item) => item.id !== id));
      setCourses((current) =>
        current.map((course) =>
          course.university_id === id
            ? { ...course, university_id: null }
            : course,
        ),
      );
      setUniversityState(null);
      setToastMessage(data.message ?? "University deleted.");
      router.refresh();
    } catch {
      setError(setUniversityState, "Could not reach the university endpoint.");
    } finally {
      setPendingKey(null);
    }
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCourseState(null);
    setPendingKey("create-course");

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseDraft),
      });
      const data = (await response.json()) as {
        course?: EditableCourse;
        message?: string;
        status: "error" | "success";
      };

      if (data.status === "error" || !data.course) {
        setError(setCourseState, data.message ?? "Could not create the course.");
        return;
      }

      setCourses((current) =>
        [...current, data.course].sort((a, b) =>
          a.course_code.localeCompare(b.course_code),
        ),
      );
      setCourseDraft({
        course_code: "",
        course_name: "",
        university_id: "",
      });
      setCourseState(null);
      setToastMessage(data.message ?? "Course added.");
      router.refresh();
    } catch {
      setError(setCourseState, "Could not reach the course endpoint.");
    } finally {
      setPendingKey(null);
    }
  }

  async function updateCourse(id: number) {
    const course = courses.find((item) => item.id === id);
    if (!course) return;

    setCourseState(null);
    setPendingKey(`course-save-${id}`);

    try {
      const response = await fetch(`/api/admin/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(course),
      });
      const data = (await response.json()) as {
        course?: EditableCourse;
        message?: string;
        status: "error" | "success";
      };

      if (data.status === "error" || !data.course) {
        setError(setCourseState, data.message ?? "Could not update the course.");
        return;
      }

      setCourses((current) =>
        current
          .map((item) => (item.id === id ? data.course! : item))
          .sort((a, b) => a.course_code.localeCompare(b.course_code)),
      );
      setCourseState(null);
      setToastMessage(data.message ?? "Course updated.");
      router.refresh();
    } catch {
      setError(setCourseState, "Could not reach the course endpoint.");
    } finally {
      setPendingKey(null);
    }
  }

  async function deleteCourse(id: number) {
    const course = courses.find((item) => item.id === id);
    if (!course) return;

    const confirmed = window.confirm(
      `Delete ${course.course_code} ${course.course_name}? Existing listings linked to it may be affected.`,
    );
    if (!confirmed) return;

    setCourseState(null);
    setPendingKey(`course-delete-${id}`);

    try {
      const response = await fetch(`/api/admin/courses/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        message?: string;
        status: "error" | "success";
      };

      if (data.status === "error") {
        setError(setCourseState, data.message ?? "Could not delete the course.");
        return;
      }

      setCourses((current) => current.filter((item) => item.id !== id));
      setCourseState(null);
      setToastMessage(data.message ?? "Course deleted.");
      router.refresh();
    } catch {
      setError(setCourseState, "Could not reach the course endpoint.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <>
      {toastMessage ? (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)] rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg shadow-emerald-950/10 backdrop-blur transition-all duration-200 ease-out motion-reduce:transition-none ${
            isToastVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      ) : null}

      <div className="grid gap-8">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>University management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {universityState?.status === "error" ? (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {universityState.message}
            </div>
          ) : null}

          <form onSubmit={createUniversity} className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="newUniversityName">Add university</Label>
              <Input
                id="newUniversityName"
                value={universityDraft}
                onChange={(event) => setUniversityDraft(event.target.value)}
                placeholder="University of Auckland"
                required
              />
            </div>
            <PillButton
              type="submit"
              className="self-end"
              disabled={pendingKey === "create-university"}
            >
              {pendingKey === "create-university" ? "Adding..." : "Add university"}
            </PillButton>
          </form>

          <div className="grid gap-4">
            {sortedUniversities.map((university) => (
              <div
                key={university.id}
                className="grid gap-4 rounded-xl border border-border/70 p-4 md:grid-cols-[1fr_auto_auto]"
              >
                <div className="grid gap-2">
                  <Label htmlFor={`university-${university.id}`}>Name</Label>
                  <Input
                    id={`university-${university.id}`}
                    value={university.name}
                    onChange={(event) =>
                      setUniversities((current) =>
                        current.map((item) =>
                          item.id === university.id
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Slug: {university.slug}
                  </p>
                </div>
                <PillButton
                  type="button"
                  variant="secondary"
                  className="self-end"
                  disabled={pendingKey === `university-save-${university.id}`}
                  onClick={() => updateUniversity(university.id)}
                >
                  {pendingKey === `university-save-${university.id}`
                    ? "Saving..."
                    : "Save"}
                </PillButton>
                <PillButton
                  type="button"
                  className="self-end"
                  disabled={pendingKey === `university-delete-${university.id}`}
                  onClick={() => deleteUniversity(university.id)}
                >
                  {pendingKey === `university-delete-${university.id}`
                    ? "Deleting..."
                    : "Delete"}
                </PillButton>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Course management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {courseState?.status === "error" ? (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {courseState.message}
            </div>
          ) : null}

          <form onSubmit={createCourse} className="grid gap-4 lg:grid-cols-[1fr_1.5fr_1.5fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="newCourseCode">Course code</Label>
              <Input
                id="newCourseCode"
                value={courseDraft.course_code}
                onChange={(event) =>
                  setCourseDraft((current) => ({
                    ...current,
                    course_code: event.target.value,
                  }))
                }
                placeholder="159333"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCourseName">Course name</Label>
              <Input
                id="newCourseName"
                value={courseDraft.course_name}
                onChange={(event) =>
                  setCourseDraft((current) => ({
                    ...current,
                    course_name: event.target.value,
                  }))
                }
                placeholder="Cloud Application Development"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCourseUniversityId">University</Label>
              <select
                id="newCourseUniversityId"
                value={courseDraft.university_id}
                onChange={(event) =>
                  setCourseDraft((current) => ({
                    ...current,
                    university_id: event.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Select a university</option>
                {sortedUniversities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </select>
            </div>
            <PillButton
              type="submit"
              className="self-end"
              disabled={pendingKey === "create-course"}
            >
              {pendingKey === "create-course" ? "Adding..." : "Add course"}
            </PillButton>
          </form>

          <div className="grid gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="grid gap-4 rounded-xl border border-border/70 p-4 lg:grid-cols-[1fr_1.5fr_1.5fr_auto_auto]"
              >
                <div className="grid gap-2">
                  <Label htmlFor={`course-code-${course.id}`}>Course code</Label>
                  <Input
                    id={`course-code-${course.id}`}
                    value={course.course_code}
                    onChange={(event) =>
                      setCourses((current) =>
                        current.map((item) =>
                          item.id === course.id
                            ? { ...item, course_code: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`course-name-${course.id}`}>Course name</Label>
                  <Input
                    id={`course-name-${course.id}`}
                    value={course.course_name}
                    onChange={(event) =>
                      setCourses((current) =>
                        current.map((item) =>
                          item.id === course.id
                            ? { ...item, course_name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`course-university-${course.id}`}>
                    University
                  </Label>
                  <select
                    id={`course-university-${course.id}`}
                    value={course.university_id?.toString() ?? ""}
                    onChange={(event) =>
                      setCourses((current) =>
                        current.map((item) =>
                          item.id === course.id
                            ? {
                                ...item,
                                university_id: event.target.value
                                  ? Number(event.target.value)
                                  : null,
                              }
                            : item,
                        ),
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select a university</option>
                    {sortedUniversities.map((university) => (
                      <option key={university.id} value={university.id}>
                        {university.name}
                      </option>
                    ))}
                  </select>
                </div>
                <PillButton
                  type="button"
                  variant="secondary"
                  className="self-end"
                  disabled={pendingKey === `course-save-${course.id}`}
                  onClick={() => updateCourse(course.id)}
                >
                  {pendingKey === `course-save-${course.id}` ? "Saving..." : "Save"}
                </PillButton>
                <PillButton
                  type="button"
                  className="self-end"
                  disabled={pendingKey === `course-delete-${course.id}`}
                  onClick={() => deleteCourse(course.id)}
                >
                  {pendingKey === `course-delete-${course.id}`
                    ? "Deleting..."
                    : "Delete"}
                </PillButton>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
