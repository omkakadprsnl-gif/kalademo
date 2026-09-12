"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { getSupabaseBrowser } from "@/lib/supabase";

type Course = {
  id: string;
  title: string;
  description: string | null;
};

type Lecture = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  youtube_url: string;
};

function getYouTubeId(input: string): string {
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }
    return url.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, milliseconds = 10000): Promise<T> {
  return await Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Supabase request timed out.")), milliseconds)),
  ]);
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [lectures, setLectures] = useState<Lecture[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCoursePassword, setNewCoursePassword] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);

  const [showLectureForm, setShowLectureForm] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [lectureTitle, setLectureTitle] = useState("");
  const [lectureDescription, setLectureDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [savingLecture, setSavingLecture] = useState(false);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const supabase = getSupabaseBrowser();
        if (!supabase) throw new Error("Supabase is not configured.");

        const { data: { user }, error: userError } = await withTimeout(supabase.auth.getUser());
        if (userError) throw new Error(userError.message);

        if (!user) {
          window.location.href = "/revatigawandeadmin";
          return;
        }

        const { data: profile, error: profileError } = await withTimeout(
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        );

        if (profileError) throw new Error(profileError.message);

        if (profile?.role !== "admin") {
          await supabase.auth.signOut();
          window.location.href = "/revatigawandeadmin";
          return;
        }

        const { data, error: courseError } = await withTimeout(
          supabase.from("courses").select("id,title,description").order("created_at", { ascending: true })
        );

        if (courseError) throw new Error(courseError.message);
        if (!mounted) return;

        const nextCourses = (data || []) as Course[];
        setCourses(nextCourses);
        setSelectedCourseId(nextCourses[0]?.id || "");
        setAuthorized(true);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load the admin panel.");
        setLoading(false);
      }
    }

    initialize();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLectures() {
      if (!selectedCourseId) {
        setLectures([]);
        return;
      }

      const supabase = getSupabaseBrowser();
      if (!supabase) return;

      const { data, error: lectureError } = await supabase
        .from("lectures")
        .select("id,position,title,description,youtube_url")
        .eq("course_id", selectedCourseId)
        .order("position", { ascending: true });

      if (!mounted) return;

      if (lectureError) {
        setError(lectureError.message);
        return;
      }

      setLectures((data || []) as Lecture[]);
    }

    loadLectures();
    return () => { mounted = false; };
  }, [selectedCourseId]);

  function openCreateCourse() {
    setNewCourseTitle("");
    setNewCourseDescription("");
    setNewCoursePassword("");
    setMessage("");
    setError("");
    setShowCourseForm(true);
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    if (!newCourseTitle.trim()) {
      setError("Course title is required.");
      return;
    }

    if (!newCoursePassword.trim()) {
      setError("A student password is required.");
      return;
    }

    setCreatingCourse(true);

    try {
      const { data, error: createError } = await supabase.rpc("admin_create_course", {
        p_title: newCourseTitle.trim(),
        p_description: newCourseDescription.trim() || null,
        p_password: newCoursePassword.trim(),
      });

      if (createError) throw new Error(createError.message);

      const { data: refreshed, error: refreshError } = await supabase
        .from("courses")
        .select("id,title,description")
        .order("created_at", { ascending: true });

      if (refreshError) throw new Error(refreshError.message);

      const nextCourses = (refreshed || []) as Course[];
      setCourses(nextCourses);
      setSelectedCourseId(typeof data === "string" ? data : nextCourses[nextCourses.length - 1]?.id || "");
      setShowCourseForm(false);
      setMessage("Course created successfully.");
      setNewCourseTitle("");
      setNewCourseDescription("");
      setNewCoursePassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error:\s*/i, "") : "Unable to create course.");
    } finally {
      setCreatingCourse(false);
    }
  }

  function openNewLecture() {
    setEditingLecture(null);
    setLectureTitle("");
    setLectureDescription("");
    setYoutubeUrl("");
    setMessage("");
    setError("");
    setShowLectureForm(true);
  }

  function openEditLecture(lecture: Lecture) {
    setEditingLecture(lecture);
    setLectureTitle(lecture.title);
    setLectureDescription(lecture.description || "");
    setYoutubeUrl(lecture.youtube_url);
    setMessage("");
    setError("");
    setShowLectureForm(true);
  }

  async function reloadLectures() {
    const supabase = getSupabaseBrowser();
    if (!supabase || !selectedCourseId) return;

    const { data, error: lectureError } = await supabase
      .from("lectures")
      .select("id,position,title,description,youtube_url")
      .eq("course_id", selectedCourseId)
      .order("position", { ascending: true });

    if (lectureError) {
      setError(lectureError.message);
      return;
    }

    setLectures((data || []) as Lecture[]);
  }

  async function saveLecture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    if (!selectedCourseId) {
      setError("Select a course first.");
      return;
    }

    if (!lectureTitle.trim()) {
      setError("Lecture title is required.");
      return;
    }

    if (!getYouTubeId(youtubeUrl)) {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    setSavingLecture(true);

    try {
      if (editingLecture) {
        const { error: updateError } = await supabase
          .from("lectures")
          .update({ title: lectureTitle.trim(), description: lectureDescription.trim() || null, youtube_url: youtubeUrl.trim() })
          .eq("id", editingLecture.id)
          .eq("course_id", selectedCourseId);

        if (updateError) throw new Error(updateError.message);
        setMessage("Lecture updated successfully.");
      } else {
        const nextPosition = lectures.length ? Math.max(...lectures.map((lecture) => lecture.position)) + 1 : 1;
        const { error: insertError } = await supabase.from("lectures").insert({
          course_id: selectedCourseId,
          position: nextPosition,
          title: lectureTitle.trim(),
          description: lectureDescription.trim() || null,
          youtube_url: youtubeUrl.trim(),
        });

        if (insertError) throw new Error(insertError.message);
        setMessage("Lecture published successfully.");
      }

      await reloadLectures();
      setShowLectureForm(false);
      setEditingLecture(null);
      setLectureTitle("");
      setLectureDescription("");
      setYoutubeUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save lecture.");
    } finally {
      setSavingLecture(false);
    }
  }

  async function deleteCourse(course: Course) {
    const confirmed = window.confirm(
      `Delete "${course.title}"? This will permanently delete the course, its password, and all lectures in it.`
    );
    if (!confirmed) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setMessage("");
    setError("");

    try {
      const { error: deleteError } = await supabase.rpc("admin_delete_course", {
        p_course_id: course.id,
      });

      if (deleteError) throw new Error(deleteError.message);

      const { data: refreshed, error: refreshError } = await supabase
        .from("courses")
        .select("id,title,description")
        .order("created_at", { ascending: true });

      if (refreshError) throw new Error(refreshError.message);

      const nextCourses = (refreshed || []) as Course[];
      setCourses(nextCourses);
      setSelectedCourseId(nextCourses[0]?.id || "");
      setLectures([]);
      setMessage("Course deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete course.");
    }
  }

  async function deleteLecture(lecture: Lecture) {
    if (!window.confirm(`Delete "${lecture.title}"?`)) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setMessage("");
    setError("");

    const { error: deleteError } = await supabase.from("lectures").delete().eq("id", lecture.id).eq("course_id", selectedCourseId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await reloadLectures();
    setMessage("Lecture deleted successfully.");
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/revatigawandeadmin";
  }

  if (loading || !authorized) {
    return <div className="site-shell"><NavBar admin /><main className="container page-loading">Loading admin panel…</main></div>;
  }

  return (
    <div className="site-shell">
      <NavBar admin />

      <main className="container admin-main">
        <div className="admin-head">
          <div>
            <div className="eyebrow">Administration</div>
            <h1>Course management</h1>
          </div>
          <button type="button" className="btn btn-outline" onClick={signOut}>Sign out</button>
        </div>

        {message && <div className="message info">{message}</div>}
        {error && <div className="message error">{error}</div>}

        <section className="admin-panel">
          <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center" }}>
            <div>
              <div className="eyebrow">Courses</div>
              <h2>Select a course</h2>
              <p className="sub" style={{ margin: "8px 0 0" }}>Each course has its own student password and lecture list.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={openCreateCourse}>Create course</button>
          </div>

          <div className="field" style={{ marginTop: 24 }}>
            <label htmlFor="course-select">Course</label>
            <select id="course-select" value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
              {courses.length === 0 && <option value="">No courses</option>}
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </div>
        </section>

        {selectedCourse && (
          <>
            <section className="admin-panel">
              <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
                <div>
                  <div className="eyebrow">Selected course</div>
                  <h2>{selectedCourse.title}</h2>
                  {selectedCourse.description && <p className="sub" style={{ maxWidth: 760, marginTop: 10 }}>{selectedCourse.description}</p>}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Link className="btn btn-outline" href={`/revatigawandeadmin/settings?courseId=${encodeURIComponent(selectedCourse.id)}`}>Edit settings</Link>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => deleteCourse(selectedCourse)}
                    style={{ color: "#a62d20", borderColor: "#e7b8b1" }}
                  >
                    Delete course
                  </button>
                </div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center" }}>
                <div>
                  <div className="eyebrow">Lectures</div>
                  <h2>{lectures.length} {lectures.length === 1 ? "lecture" : "lectures"}</h2>
                </div>
                <button type="button" className="btn btn-primary" onClick={openNewLecture}>Add lecture</button>
              </div>

              {lectures.length === 0 ? (
                <div className="empty-state">No lectures have been added to this course yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {lectures.map((lecture) => {
                    const videoId = getYouTubeId(lecture.youtube_url);
                    const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
                    return (
                      <div key={lecture.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 18, alignItems: "center", padding: 16, border: "1px solid #e5d9ce", borderRadius: 14, background: "#fff" }}>
                        <div style={{ aspectRatio: "16 / 9", overflow: "hidden", borderRadius: 10, background: "#eee5dc" }}>
                          {thumbnail ? <img src={thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                        </div>
                        <div>
                          <div style={{ color: "#e97817", fontSize: 12, fontWeight: 700, letterSpacing: ".1em", marginBottom: 5 }}>LESSON {String(lecture.position).padStart(2, "0")}</div>
                          <h3>{lecture.title}</h3>
                          {lecture.description && <p className="sub" style={{ margin: "6px 0 0" }}>{lecture.description}</p>}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" className="btn btn-outline" onClick={() => openEditLecture(lecture)}>Edit</button>
                          <button type="button" className="btn btn-outline" onClick={() => deleteLecture(lecture)}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {showCourseForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="panel-heading">
              <div className="eyebrow">New course</div>
              <h2>Create a course</h2>
            </div>
            <form className="admin-form" onSubmit={createCourse}>
              <div className="field"><label htmlFor="new-course-title">Course title</label><input id="new-course-title" value={newCourseTitle} onChange={(event) => setNewCourseTitle(event.target.value)} required /></div>
              <div className="field"><label htmlFor="new-course-description">Course description</label><textarea id="new-course-description" rows={4} value={newCourseDescription} onChange={(event) => setNewCourseDescription(event.target.value)} /></div>
              <div className="field"><label htmlFor="new-course-password">Student password</label><input id="new-course-password" type="password" value={newCoursePassword} onChange={(event) => setNewCoursePassword(event.target.value)} autoComplete="new-password" required /></div>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowCourseForm(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={creatingCourse}>{creatingCourse ? "Creating…" : "Create course"}</button></div>
            </form>
          </div>
        </div>
      )}

      {showLectureForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="panel-heading">
              <div className="eyebrow">{editingLecture ? "Edit lecture" : "New lecture"}</div>
              <h2>{editingLecture ? "Update lecture" : "Add lecture"}</h2>
              <p className="sub" style={{ marginTop: 8 }}>Course: {selectedCourse?.title}</p>
            </div>
            <form className="admin-form" onSubmit={saveLecture}>
              <div className="field"><label htmlFor="lecture-title">Lecture title</label><input id="lecture-title" value={lectureTitle} onChange={(event) => setLectureTitle(event.target.value)} required /></div>
              <div className="field"><label htmlFor="lecture-description">Description</label><textarea id="lecture-description" rows={4} value={lectureDescription} onChange={(event) => setLectureDescription(event.target.value)} /></div>
              <div className="field"><label htmlFor="lecture-youtube">Unlisted YouTube URL</label><input id="lecture-youtube" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." required /></div>
              <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowLectureForm(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={savingLecture}>{savingLecture ? "Saving…" : editingLecture ? "Save changes" : "Publish lecture"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
