"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Course = { id: string; title: string; description: string | null };

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/courses", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Unable to load courses.");
        if (active) setCourses(Array.isArray(data.courses) ? data.courses : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load courses.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#faf7f2", color: "#3b1711", fontFamily: "Inter, Arial, sans-serif" }}>
      <header style={{ minHeight: 74, borderBottom: "1px solid #e5d9ce", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#3b1711" }}>
          <img src="/kalashala-logo.jpg" alt="Kalashala" style={{ width: 48, height: 48, objectFit: "contain" }} />
          <span style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 27 }}>Kalashala</span>
        </Link>
      </header>

      <section style={{ width: "min(calc(100% - 40px), 1080px)", margin: "0 auto", padding: "78px 0 100px" }}>
        <div style={{ maxWidth: 760, marginBottom: 42 }}>
          <div className="eyebrow">Student access</div>
          <h1 style={{ fontSize: "clamp(46px, 6vw, 72px)", marginBottom: 18 }}>Choose your course.</h1>
          <p style={{ color: "#876f67", fontSize: 18, lineHeight: 1.75, margin: 0 }}>Select the course you purchased. You will be asked for that course’s password.</p>
        </div>

        {loading && <div className="message info">Loading courses…</div>}
        {error && <div className="message error">{error}</div>}

        {!loading && !error && courses.length === 0 && <div className="message info">No courses have been created yet.</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22 }}>
          {courses.map((course) => (
            <Link key={course.id} href={`/login?course=${encodeURIComponent(course.id)}`} style={{ textDecoration: "none", color: "inherit" }}>
              <article className="course-choice-card" style={{ height: "100%", padding: 30, border: "1px solid #e5d9ce", borderRadius: 18, background: "#fff", boxShadow: "0 10px 35px rgba(59,23,17,.05)", transition: "transform .18s ease, box-shadow .18s ease" }}>
                <div className="eyebrow">Course</div>
                <h2 style={{ fontSize: 36, marginBottom: 14 }}>{course.title}</h2>
                {course.description && <p style={{ color: "#876f67", fontSize: 15, lineHeight: 1.7 }}>{course.description}</p>}
                <div style={{ marginTop: 28, color: "#e97817", fontWeight: 700 }}>Enter this course →</div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #e5d9ce", padding: "24px 32px", textAlign: "center", color: "#876f67", fontSize: 13 }}>Kalashala</footer>
    </main>
  );
}
