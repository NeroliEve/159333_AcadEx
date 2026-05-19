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
import type {
  AdminCourse,
  AdminDegree,
  StudyAreaOption,
  UniversityOption,
} from "@/lib/marketplace";

type AdminDashboardProps = {
  courses: AdminCourse[];
  degrees: AdminDegree[];
  isLoading?: boolean;
  studyAreas: StudyAreaOption[];
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

type EditableDegree = {
  id: number;
  is_active: boolean;
  name: string;
  slug: string;
  study_area_id: number;
};

type EditableUniversity = {
  id: number;
  is_active: boolean;
  name: string;
  slug: string;
};

type CatalogSection = "courses" | "degrees" | "universities";

export function AdminDashboard({
  courses: initialCourses,
  degrees: initialDegrees,
  isLoading = false,
  studyAreas,
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
  const [degrees, setDegrees] = useState<EditableDegree[]>(
    initialDegrees.map((degree) => ({
      id: degree.id,
      is_active: degree.is_active,
      name: degree.name,
      slug: degree.slug,
      study_area_id: degree.study_area_id,
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
  const [degreeDraft, setDegreeDraft] = useState({
    name: "",
    study_area_id: "",
  });
  const [universityDraft, setUniversityDraft] = useState("");
  const [courseState, setCourseState] = useState<RequestState>(null);
  const [degreeState, setDegreeState] = useState<RequestState>(null);
  const [universityState, setUniversityState] = useState<RequestState>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [catalogSection, setCatalogSection] = useState<CatalogSection>("universities");
  const [courseQuery, setCourseQuery] = useState("");
  const [degreeQuery, setDegreeQuery] = useState("");
  const [universityQuery, setUniversityQuery] = useState("");
  const toastTimeoutRef = useRef<number | null>(null);
  const toastTransitionTimeoutRef = useRef<number | null>(null);

  const sortedUniversities = useMemo(
    () => [...universities].sort((a, b) => a.name.localeCompare(b.name)),
    [universities],
  );
  const sortedStudyAreas = useMemo(
    () => [...studyAreas].sort((a, b) => a.name.localeCompare(b.name)),
    [studyAreas],
  );
  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.course_code.localeCompare(b.course_code)),
    [courses],
  );
  const sortedDegrees = useMemo(
    () => [...degrees].sort((a, b) => a.name.localeCompare(b.name)),
    [degrees],
  );
  const filteredUniversities = useMemo(() => {
    const query = universityQuery.trim().toLowerCase();

    return sortedUniversities.filter((university) =>
      query
        ? [university.name, university.slug].join(" ").toLowerCase().includes(query)
        : true,
    );
  }, [sortedUniversities, universityQuery]);
  const filteredCourses = useMemo(() => {
    const query = courseQuery.trim().toLowerCase();

    return sortedCourses.filter((course) => {
      const universityName =
        sortedUniversities.find((university) => university.id === course.university_id)?.name ?? "";

      return query
        ? [course.course_code, course.course_name, universityName]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;
    });
  }, [courseQuery, sortedCourses, sortedUniversities]);
  const filteredDegrees = useMemo(() => {
    const query = degreeQuery.trim().toLowerCase();

    return sortedDegrees.filter((degree) => {
      const studyAreaName =
        sortedStudyAreas.find((studyArea) => studyArea.id === degree.study_area_id)?.name ?? "";

      return query
        ? [degree.name, degree.slug, studyAreaName].join(" ").toLowerCase().includes(query)
        : true;
    });
  }, [degreeQuery, sortedDegrees, sortedStudyAreas]);

  useEffect(() => {
    setCourses(
      initialCourses.map((course) => ({
        course_code: course.course_code,
        course_name: course.course_name,
        id: course.id,
        university_id: course.university_id,
      })),
    );
  }, [initialCourses]);

  useEffect(() => {
    setDegrees(
      initialDegrees.map((degree) => ({
        id: degree.id,
        is_active: degree.is_active,
        name: degree.name,
        slug: degree.slug,
        study_area_id: degree.study_area_id,
      })),
    );
  }, [initialDegrees]);

  useEffect(() => {
    setUniversities(
      initialUniversities.map((university) => ({
        id: university.id,
        is_active: university.is_active,
        name: university.name,
        slug: university.slug,
      })),
    );
  }, [initialUniversities]);

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

      const university = data.university;
      setUniversities((current) =>
        [...current, university].sort((a, b) => a.name.localeCompare(b.name)),
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

      const course = data.course;
      setCourses((current) =>
        [...current, course].sort((a, b) =>
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

  async function createDegree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDegreeState(null);
    setPendingKey("create-degree");

    try {
      const response = await fetch("/api/admin/degrees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: degreeDraft.name,
          studyAreaId: degreeDraft.study_area_id,
        }),
      });
      const data = (await response.json()) as {
        degree?: EditableDegree;
        message?: string;
        status: "error" | "success";
      };

      if (data.status === "error" || !data.degree) {
        setError(setDegreeState, data.message ?? "Could not create the degree.");
        return;
      }

      setDegrees((current) =>
        [...current, data.degree!].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setDegreeDraft({ name: "", study_area_id: "" });
      setDegreeState(null);
      setToastMessage(data.message ?? "Degree added.");
      router.refresh();
    } catch {
      setError(setDegreeState, "Could not reach the degree endpoint.");
    } finally {
      setPendingKey(null);
    }
  }

  async function updateDegree(id: number) {
    const degree = degrees.find((item) => item.id === id);
    if (!degree) return;

    setDegreeState(null);
    setPendingKey(`degree-save-${id}`);

    try {
      const response = await fetch(`/api/admin/degrees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: degree.is_active,
          name: degree.name,
          studyAreaId: degree.study_area_id,
        }),
      });
      const data = (await response.json()) as {
        degree?: EditableDegree;
        message?: string;
        status: "error" | "success";
      };

      if (data.status === "error" || !data.degree) {
        setError(setDegreeState, data.message ?? "Could not update the degree.");
        return;
      }

      setDegrees((current) =>
        current
          .map((item) => (item.id === id ? data.degree! : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setDegreeState(null);
      setToastMessage(data.message ?? "Degree updated.");
      router.refresh();
    } catch {
      setError(setDegreeState, "Could not reach the degree endpoint.");
    } finally {
      setPendingKey(null);
    }
  }

  async function deactivateDegree(id: number) {
    const degree = degrees.find((item) => item.id === id);
    if (!degree) return;

    const confirmed = window.confirm(
      `Deactivate ${degree.name}? Existing profiles keep their degree, but it will no longer appear for new selections.`,
    );
    if (!confirmed) return;

    setDegreeState(null);
    setPendingKey(`degree-delete-${id}`);

    try {
      const response = await fetch(`/api/admin/degrees/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        degree?: EditableDegree;
        message?: string;
        status: "error" | "success";
      };

      if (data.status === "error" || !data.degree) {
        setError(setDegreeState, data.message ?? "Could not deactivate the degree.");
        return;
      }

      setDegrees((current) =>
        current.map((item) => (item.id === id ? data.degree! : item)),
      );
      setDegreeState(null);
      setToastMessage(data.message ?? "Degree deactivated.");
      router.refresh();
    } catch {
      setError(setDegreeState, "Could not reach the degree endpoint.");
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
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Catalog library
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">Managed academic catalog</h2>
                <p className="text-sm text-muted-foreground">
                  Browse, search, create, and update universities, courses, and degrees without scrolling through long forms.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm">
                  <p className="font-medium">{sortedUniversities.length} universities</p>
                  <p className="text-muted-foreground">{filteredUniversities.length} currently shown</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm">
                  <p className="font-medium">{sortedCourses.length} courses</p>
                  <p className="text-muted-foreground">{filteredCourses.length} currently shown</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm">
                  <p className="font-medium">{sortedDegrees.length} degrees</p>
                  <p className="text-muted-foreground">{filteredDegrees.length} currently shown</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <PillButton
                type="button"
                variant={catalogSection === "universities" ? "primary" : "secondary"}
                onClick={() => setCatalogSection("universities")}
              >
                Universities
              </PillButton>
              <PillButton
                type="button"
                variant={catalogSection === "courses" ? "primary" : "secondary"}
                onClick={() => setCatalogSection("courses")}
              >
                Courses
              </PillButton>
              <PillButton
                type="button"
                variant={catalogSection === "degrees" ? "primary" : "secondary"}
                onClick={() => setCatalogSection("degrees")}
              >
                Degrees
              </PillButton>
            </div>
          </CardContent>
        </Card>

        {catalogSection === "universities" ? (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Universities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {universityState?.status === "error" ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {universityState.message}
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                <form onSubmit={createUniversity} className="grid gap-4 rounded-2xl border border-border/70 bg-secondary/15 p-5 md:grid-cols-[1fr_auto] md:items-end">
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
                    disabled={pendingKey === "create-university"}
                  >
                    {pendingKey === "create-university" ? "Adding..." : "Add university"}
                  </PillButton>
                </form>

                <div className="grid gap-2 rounded-2xl border border-border/70 p-5">
                  <Label htmlFor="university-query">Search universities</Label>
                  <Input
                    id="university-query"
                    value={universityQuery}
                    onChange={(event) => setUniversityQuery(event.target.value)}
                    placeholder="Name or slug"
                  />
                  <p className="text-sm text-muted-foreground">
                    {filteredUniversities.length} of {sortedUniversities.length} universities shown
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredUniversities.map((university) => (
                  <div
                    key={university.id}
                    className="grid gap-4 rounded-2xl border border-border/70 p-5"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-900">
                          {university.is_active ? "active" : "inactive"}
                        </span>
                        <span className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-muted-foreground">
                          slug: {university.slug}
                        </span>
                      </div>
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
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PillButton
                        type="button"
                        variant="secondary"
                        disabled={pendingKey === `university-save-${university.id}`}
                        onClick={() => updateUniversity(university.id)}
                      >
                        {pendingKey === `university-save-${university.id}` ? "Saving..." : "Save"}
                      </PillButton>
                      <PillButton
                        type="button"
                        disabled={pendingKey === `university-delete-${university.id}`}
                        onClick={() => deleteUniversity(university.id)}
                      >
                        {pendingKey === `university-delete-${university.id}` ? "Deleting..." : "Delete"}
                      </PillButton>
                    </div>
                  </div>
                ))}
                {isLoading ? (
                  <div className="rounded-2xl border border-border/70 px-5 py-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    Loading universities...
                  </div>
                ) : filteredUniversities.length === 0 ? (
                  <div className="rounded-2xl border border-border/70 px-5 py-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    No universities match the current search.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {catalogSection === "courses" ? (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Courses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {courseState?.status === "error" ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {courseState.message}
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                <form onSubmit={createCourse} className="grid gap-4 rounded-2xl border border-border/70 bg-secondary/15 p-5 lg:grid-cols-[1fr_1.5fr_1.2fr_auto] lg:items-end">
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
                    disabled={pendingKey === "create-course"}
                  >
                    {pendingKey === "create-course" ? "Adding..." : "Add course"}
                  </PillButton>
                </form>

                <div className="grid gap-2 rounded-2xl border border-border/70 p-5">
                  <Label htmlFor="course-query">Search courses</Label>
                  <Input
                    id="course-query"
                    value={courseQuery}
                    onChange={(event) => setCourseQuery(event.target.value)}
                    placeholder="Code, name, or university"
                  />
                  <p className="text-sm text-muted-foreground">
                    {filteredCourses.length} of {sortedCourses.length} courses shown
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => {
                  const linkedUniversity =
                    sortedUniversities.find((university) => university.id === course.university_id)?.name ??
                    "No university";

                  return (
                    <div
                      key={course.id}
                      className="grid gap-4 rounded-2xl border border-border/70 p-5"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1">
                            {course.course_code}
                          </span>
                          <span className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-muted-foreground">
                            {linkedUniversity}
                          </span>
                        </div>

                        <div className="grid gap-3">
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
                            <Label htmlFor={`course-university-${course.id}`}>University</Label>
                            <select
                              id={`course-university-${course.id}`}
                              value={course.university_id?.toString() ?? ""}
                              onChange={(event) =>
                                setCourses((current) =>
                                  current.map((item) =>
                                    item.id === course.id
                                      ? {
                                          ...item,
                                          university_id: event.target.value ? Number(event.target.value) : null,
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
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <PillButton
                          type="button"
                          variant="secondary"
                          disabled={pendingKey === `course-save-${course.id}`}
                          onClick={() => updateCourse(course.id)}
                        >
                          {pendingKey === `course-save-${course.id}` ? "Saving..." : "Save"}
                        </PillButton>
                        <PillButton
                          type="button"
                          disabled={pendingKey === `course-delete-${course.id}`}
                          onClick={() => deleteCourse(course.id)}
                        >
                          {pendingKey === `course-delete-${course.id}` ? "Deleting..." : "Delete"}
                        </PillButton>
                      </div>
                    </div>
                  );
                })}
                {isLoading ? (
                  <div className="rounded-2xl border border-border/70 px-5 py-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    Loading courses...
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div className="rounded-2xl border border-border/70 px-5 py-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    No courses match the current search.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {catalogSection === "degrees" ? (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Degrees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {degreeState?.status === "error" ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {degreeState.message}
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                <form
                  onSubmit={createDegree}
                  className="grid gap-4 rounded-2xl border border-border/70 bg-secondary/15 p-5 lg:grid-cols-[1.4fr_1.2fr_auto] lg:items-end"
                >
                  <div className="grid gap-2">
                    <Label htmlFor="newDegreeName">Degree name</Label>
                    <Input
                      id="newDegreeName"
                      value={degreeDraft.name}
                      onChange={(event) =>
                        setDegreeDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Bachelor of Computer Science"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="newDegreeStudyAreaId">Study area</Label>
                    <select
                      id="newDegreeStudyAreaId"
                      value={degreeDraft.study_area_id}
                      onChange={(event) =>
                        setDegreeDraft((current) => ({
                          ...current,
                          study_area_id: event.target.value,
                        }))
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select a study area</option>
                      {sortedStudyAreas.map((studyArea) => (
                        <option key={studyArea.id} value={studyArea.id}>
                          {studyArea.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <PillButton
                    type="submit"
                    disabled={pendingKey === "create-degree"}
                  >
                    {pendingKey === "create-degree" ? "Adding..." : "Add degree"}
                  </PillButton>
                </form>

                <div className="grid gap-2 rounded-2xl border border-border/70 p-5">
                  <Label htmlFor="degree-query">Search degrees</Label>
                  <Input
                    id="degree-query"
                    value={degreeQuery}
                    onChange={(event) => setDegreeQuery(event.target.value)}
                    placeholder="Name, slug, or study area"
                  />
                  <p className="text-sm text-muted-foreground">
                    {filteredDegrees.length} of {sortedDegrees.length} degrees shown
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredDegrees.map((degree) => {
                  const linkedStudyArea =
                    sortedStudyAreas.find((studyArea) => studyArea.id === degree.study_area_id)?.name ??
                    "No study area";

                  return (
                    <div
                      key={degree.id}
                      className="grid gap-4 rounded-2xl border border-border/70 p-5"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span
                            className={
                              degree.is_active
                                ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-900"
                                : "rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-muted-foreground"
                            }
                          >
                            {degree.is_active ? "active" : "inactive"}
                          </span>
                          <span className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-muted-foreground">
                            {linkedStudyArea}
                          </span>
                          <span className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-muted-foreground">
                            slug: {degree.slug}
                          </span>
                        </div>

                        <div className="grid gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor={`degree-name-${degree.id}`}>Name</Label>
                            <Input
                              id={`degree-name-${degree.id}`}
                              value={degree.name}
                              onChange={(event) =>
                                setDegrees((current) =>
                                  current.map((item) =>
                                    item.id === degree.id
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`degree-study-area-${degree.id}`}>Study area</Label>
                            <select
                              id={`degree-study-area-${degree.id}`}
                              value={degree.study_area_id.toString()}
                              onChange={(event) =>
                                setDegrees((current) =>
                                  current.map((item) =>
                                    item.id === degree.id
                                      ? {
                                          ...item,
                                          study_area_id: Number(event.target.value),
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              {sortedStudyAreas.map((studyArea) => (
                                <option key={studyArea.id} value={studyArea.id}>
                                  {studyArea.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`degree-status-${degree.id}`}>Status</Label>
                            <select
                              id={`degree-status-${degree.id}`}
                              value={degree.is_active ? "active" : "inactive"}
                              onChange={(event) =>
                                setDegrees((current) =>
                                  current.map((item) =>
                                    item.id === degree.id
                                      ? {
                                          ...item,
                                          is_active: event.target.value === "active",
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <PillButton
                          type="button"
                          variant="secondary"
                          disabled={pendingKey === `degree-save-${degree.id}`}
                          onClick={() => updateDegree(degree.id)}
                        >
                          {pendingKey === `degree-save-${degree.id}` ? "Saving..." : "Save"}
                        </PillButton>
                        <PillButton
                          type="button"
                          disabled={
                            pendingKey === `degree-delete-${degree.id}` ||
                            !degree.is_active
                          }
                          onClick={() => deactivateDegree(degree.id)}
                        >
                          {pendingKey === `degree-delete-${degree.id}`
                            ? "Deactivating..."
                            : "Deactivate"}
                        </PillButton>
                      </div>
                    </div>
                  );
                })}
                {isLoading ? (
                  <div className="rounded-2xl border border-border/70 px-5 py-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    Loading degrees...
                  </div>
                ) : filteredDegrees.length === 0 ? (
                  <div className="rounded-2xl border border-border/70 px-5 py-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    No degrees match the current search.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
