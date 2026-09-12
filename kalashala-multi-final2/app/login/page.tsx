"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Course = { id: string; title: string; description: string | null };

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course") || "";

  const [course, setCourse] = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!courseId) {
      router.replace("/");
      return;
    }

    let active = true;

    async function loadCourse() {
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Course not found.");
        if (active) setCourse(data.course || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load course.");
      } finally {
        if (active) setLoadingCourse(false);
      }
    }

    loadCourse();
    return () => { active = false; };
  }, [courseId, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError("Please enter the course password.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, password: cleanPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Incorrect course password.");
        setBusy(false);
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect.");
      setBusy(false);
    }
  }

  if (loadingCourse) {
    return <main className="auth-page"><div className="auth-card">Loading course…</div></main>;
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/">
          <img className="auth-logo" src="/kalashala-logo.jpg" alt="Kalashala" />
        </Link>

        <div className="eyebrow">Student access</div>
        <h1>{course?.title || "Course login"}</h1>
        <p className="sub">Enter the password provided for this course.</p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="password">Course password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? "Opening course…" : "Enter course"}
          </button>
        </form>

        {(error || !course) && <div className="message error">{error || "Course not found."}</div>}

        <Link href="/" style={{ display: "block", textAlign: "center", marginTop: 22, color: "#65453d" }}>
          ← Choose a different course
        </Link>
      </div>
    </main>
  );
}
