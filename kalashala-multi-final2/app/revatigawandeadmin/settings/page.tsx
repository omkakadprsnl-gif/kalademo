"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { getSupabaseBrowser } from "@/lib/supabase";

type Course = { id: string; title: string; description: string | null };

export default function AdminSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCourseId = searchParams.get("courseId") || "";

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState(requestedCourseId);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function initialize() {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        router.replace("/revatigawandeadmin");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/revatigawandeadmin");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/revatigawandeadmin");
        return;
      }

      const { data, error } = await supabase.from("courses").select("id,title,description").order("created_at", { ascending: true });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const nextCourses = (data || []) as Course[];
      const nextId = requestedCourseId && nextCourses.some((course) => course.id === requestedCourseId)
        ? requestedCourseId
        : nextCourses[0]?.id || "";

      setCourses(nextCourses);
      setCourseId(nextId);
      const selected = nextCourses.find((course) => course.id === nextId);
      setCourseTitle(selected?.title || "");
      setCourseDescription(selected?.description || "");
      setAuthorized(true);
      setLoading(false);
    }

    initialize();
  }, [requestedCourseId, router]);

  function selectCourse(id: string) {
    const selected = courses.find((course) => course.id === id);
    setCourseId(id);
    setCourseTitle(selected?.title || "");
    setCourseDescription(selected?.description || "");
    setNewPassword("");
    router.replace(`/revatigawandeadmin/settings?courseId=${encodeURIComponent(id)}`);
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase || !courseId) return;

    if (!courseTitle.trim()) {
      setMessage("Course title is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_update_course", {
      p_course_id: courseId,
      p_title: courseTitle.trim(),
      p_description: courseDescription.trim(),
      p_password: newPassword.trim() || null,
    });

    if (error) {
      setMessage(error.message.replace(/^Error:\s*/i, ""));
      setSaving(false);
      return;
    }

    setNewPassword("");
    setSaving(false);
    router.replace("/revatigawandeadmin/panel");
  }

  if (loading || !authorized) {
    return <div className="site-shell"><NavBar admin /><main className="container page-loading">Loading settings…</main></div>;
  }

  return (
    <div className="site-shell">
      <NavBar admin />
      <main className="container admin-main">
        <div className="admin-head">
          <div>
            <div className="eyebrow">Course</div>
            <h1>Edit course settings</h1>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => router.push("/revatigawandeadmin/panel")}>Back to panel</button>
        </div>

        {message && <div className="message error">{message}</div>}

        <section className="admin-panel">
          <div className="panel-heading">
            <div className="eyebrow">Course access</div>
            <h2>Choose a course</h2>
          </div>
          <div className="field" style={{ marginTop: 20 }}>
            <label htmlFor="settings-course">Course</label>
            <select id="settings-course" value={courseId} onChange={(event) => selectCourse(event.target.value)}>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </div>
        </section>

        {courseId && (
          <section className="admin-panel">
            <div className="panel-heading">
              <div className="eyebrow">Settings</div>
              <h2>{courseTitle || "Course"}</h2>
            </div>
            <form className="admin-form" onSubmit={saveCourse}>
              <div className="field"><label htmlFor="course-title">Course title</label><input id="course-title" value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} required /></div>
              <div className="field"><label htmlFor="course-description">Course description</label><textarea id="course-description" rows={5} value={courseDescription} onChange={(event) => setCourseDescription(event.target.value)} /></div>
              <div className="field"><label htmlFor="course-password">Student password</label><input id="course-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Leave blank to keep current password" autoComplete="new-password" /></div>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => router.push("/revatigawandeadmin/panel")}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button></div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
