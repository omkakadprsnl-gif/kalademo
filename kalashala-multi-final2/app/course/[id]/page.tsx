"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

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

function getYouTubeId(value: string) {
  try {
    const url = new URL(value);

    if (
      url.hostname === "youtu.be" ||
      url.hostname.endsWith(".youtu.be")
    ) {
      return (
        url.pathname
          .split("/")
          .filter(Boolean)[0] || ""
      );
    }

    return url.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

export default function LessonPage() {
  const router = useRouter();

  const params =
    useParams<{ id: string }>();

  const [course, setCourse] =
    useState<Course | null>(null);

  const [lectures, setLectures] =
    useState<Lecture[]>([]);

  const [lecture, setLecture] =
    useState<Lecture | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const response =
          await fetch(
            "/api/course",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }
          );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !contentType.includes(
            "application/json"
          )
        ) {
          throw new Error(
            `Course request returned ${response.status}.`
          );
        }

        const data =
          await response.json();

        if (
          response.status === 401
        ) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load course."
          );
        }

        const allLectures =
          Array.isArray(
            data.lectures
          )
            ? (data.lectures as Lecture[])
            : [];

        const sortedLectures =
          [...allLectures].sort(
            (a, b) =>
              a.position - b.position
          );

        const selected =
          sortedLectures.find(
            (item) =>
              item.id === params.id
          );

        if (!selected) {
          throw new Error(
            "This lesson could not be found."
          );
        }

        setCourse(
          data.course || null
        );

        setLectures(
          sortedLectures
        );

        setLecture(selected);
      } catch (err) {
        console.error(
          "Lesson error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load lesson."
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      load();
    }
  }, [params.id, router]);

  async function logout() {
    await fetch(
      "/api/access",
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    window.location.replace(
      "/login"
    );
  }

  if (loading) {
    return (
      <div className="lesson-loading">
        Loading lesson…
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="lesson-error-page">
        <div className="lesson-error-box">
          <div className="error-message">
            {error ||
              "Lesson not found."}
          </div>

          <button
            type="button"
            className="outline-button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
          >
            Back to course
          </button>
        </div>
      </div>
    );
  }

  const index =
    lectures.findIndex(
      (item) =>
        item.id === lecture.id
    );

  const previous =
    index > 0
      ? lectures[index - 1]
      : null;

  const next =
    index <
    lectures.length - 1
      ? lectures[index + 1]
      : null;

  const videoId =
    getYouTubeId(
      lecture.youtube_url
    );

  return (
    <div className="lesson-page">
      {/* HEADER */}

      <header className="lesson-header">
        <button
          type="button"
          className="lesson-brand"
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
          aria-label="Back to course"
        >
          <img
            src="/kalashala-logo.jpg"
            alt="Kalashala"
          />

          <span>Kalashala</span>
        </button>

        <div className="lesson-header-actions">
          <button
            type="button"
            className="course-button"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
          >
            Course
          </button>

          <button
            type="button"
            className="outline-button"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </header>

      {/* MAIN */}

      <main className="lesson-container">
        <button
          type="button"
          className="back-link"
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
        >
          ← Back to lessons
        </button>

        {/* TITLE */}

        <section className="lesson-heading">
          <div className="lesson-label">
            Lesson{" "}
            {String(
              lecture.position
            ).padStart(2, "0")}
          </div>

          <h1>
            {lecture.title}
          </h1>

          {lecture.description && (
            <p>
              {lecture.description}
            </p>
          )}
        </section>

        {/* VIDEO */}

        <div className="video-wrapper">
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={lecture.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="video-error">
              This lecture has an invalid
              YouTube URL.
            </div>
          )}
        </div>

        {/* NAVIGATION */}

        <div className="lesson-navigation">
          {previous ? (
            <button
              type="button"
              className="nav-button previous"
              onClick={() =>
                router.push(
                  `/course/${previous.id}`
                )
              }
            >
              <span>
                ←
              </span>

              <span>
                Previous
              </span>
            </button>
          ) : (
            <div />
          )}

          {next ? (
            <button
              type="button"
              className="nav-button next"
              onClick={() =>
                router.push(
                  `/course/${next.id}`
                )
              }
            >
              <span>
                Next lesson
              </span>

              <span>
                →
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="nav-button next"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
            >
              <span>
                Back to course
              </span>

              <span>
                →
              </span>
            </button>
          )}
        </div>
      </main>

      <style jsx>{`
        .lesson-page {
          min-height: 100vh;
          background: #faf7f2;
          color: #3b1711;
          font-family:
            Inter,
            Arial,
            sans-serif;
        }

        .lesson-loading {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #faf7f2;

          color: #765e55;

          font-family:
            Inter,
            Arial,
            sans-serif;
        }

        .lesson-header {
          position: sticky;
          top: 0;
          z-index: 20;

          height: 76px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding:
            0 clamp(18px, 4vw, 54px);

          background:
            rgba(
              250,
              247,
              242,
              0.96
            );

          border-bottom:
            1px solid #e5d9ce;

          backdrop-filter:
            blur(12px);
        }

        .lesson-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;

          padding: 0;

          border: 0;

          background: transparent;

          color: #3b1711;

          cursor: pointer;
        }

        .lesson-brand img {
          width: 44px;
          height: 44px;

          object-fit: contain;
        }

        .lesson-brand span {
          font-family:
            "DM Serif Display",
            Georgia,
            serif;

          font-size: 25px;
        }

        .lesson-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .course-button {
          border: 0;

          background: transparent;

          color: #65453d;

          padding:
            10px 13px;

          cursor: pointer;

          font-size: 13px;
          font-weight: 500;
        }

        .course-button:hover {
          color: #e97817;
        }

        .outline-button {
          height: 42px;

          padding:
            0 16px;

          border:
            1px solid #e5d9ce;

          border-radius: 9px;

          background: #fff;

          color: #3b1711;

          font-size: 13px;
          font-weight: 600;

          cursor: pointer;

          transition:
            transform 0.18s ease,
            border-color 0.18s ease;
        }

        .outline-button:hover {
          transform:
            translateY(-1px);

          border-color:
            #cdbbae;
        }

        .lesson-container {
          width:
            min(
              calc(100% - 40px),
              1080px
            );

          margin: 0 auto;

          padding:
            43px 0 80px;
        }

        .back-link {
          display: inline-flex;

          padding: 0;
          margin-bottom: 30px;

          border: 0;

          background: transparent;

          color: #65453d;

          font-size: 14px;

          cursor: pointer;
        }

        .back-link:hover {
          color: #e97817;
        }

        .lesson-heading {
          max-width: 850px;

          margin-bottom: 30px;
        }

        .lesson-label {
          margin-bottom: 9px;

          color: #e97817;

          font-size: 11px;
          font-weight: 700;

          letter-spacing:
            0.2em;

          text-transform:
            uppercase;
        }

        .lesson-heading h1 {
          margin: 0;

          font-family:
            "DM Serif Display",
            Georgia,
            serif;

          font-size:
            clamp(
              40px,
              5.5vw,
              58px
            );

          font-weight: 400;

          line-height: 1.08;

          letter-spacing:
            -0.015em;
        }

        .lesson-heading p {
          margin:
            14px 0 0;

          max-width: 760px;

          color: #876f67;

          font-size: 16px;

          line-height: 1.7;
        }

        .video-wrapper {
          width: 100%;

          aspect-ratio: 16 / 9;

          overflow: hidden;

          border-radius: 17px;

          background: #18120f;

          box-shadow:
            0 18px 50px
            rgba(
              59,
              23,
              17,
              0.12
            );
        }

        .video-wrapper iframe {
          width: 100%;
          height: 100%;

          display: block;

          border: 0;
        }

        .video-error {
          width: 100%;
          height: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 30px;

          color: #fff;

          text-align: center;
        }

        .lesson-navigation {
          display: flex;

          align-items: center;
          justify-content:
            space-between;

          gap: 12px;

          margin-top: 24px;
        }

        .nav-button {
          min-height: 46px;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 9px;

          padding:
            0 17px;

          border-radius: 9px;

          font-size: 13px;
          font-weight: 600;

          cursor: pointer;

          transition:
            transform 0.18s ease;
        }

        .nav-button:hover {
          transform:
            translateY(-1px);
        }

        .nav-button.previous {
          border:
            1px solid #e5d9ce;

          background: #fff;

          color: #3b1711;
        }

        .nav-button.next {
          border: 0;

          background: #3b1711;

          color: #fff;
        }

        .lesson-error-page {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 30px;

          background: #faf7f2;

          font-family:
            Inter,
            Arial,
            sans-serif;
        }

        .lesson-error-box {
          width:
            min(
              100%,
              700px
            );
        }

        .error-message {
          margin-bottom: 20px;

          padding:
            16px 18px;

          border:
            1px solid #efc9c3;

          border-radius: 11px;

          background: #fff2ef;

          color: #a62d20;

          font-size: 14px;
        }

        @media (max-width: 700px) {
          .lesson-header {
            height: 64px;

            padding:
              0 14px;
          }

          .lesson-brand {
            gap: 8px;
          }

          .lesson-brand img {
            width: 38px;
            height: 38px;
          }

          .lesson-brand span {
            font-size: 21px;
          }

          .lesson-header-actions {
            gap: 3px;
          }

          .course-button {
            display: none;
          }

          .outline-button {
            height: 39px;

            padding:
              0 13px;

            font-size: 12px;
          }

          .lesson-container {
            width:
              calc(100% - 24px);

            padding:
              28px 0 56px;
          }

          .back-link {
            margin-bottom:
              24px;
          }

          .lesson-heading {
            margin-bottom:
              22px;
          }

          .lesson-heading h1 {
            font-size: 37px;

            line-height: 1.08;
          }

          .lesson-heading p {
            font-size: 14px;

            line-height: 1.65;
          }

          .video-wrapper {
            border-radius:
              12px;
          }

          .lesson-navigation {
            gap: 10px;

            margin-top: 18px;
          }

          .nav-button {
            min-height: 44px;

            flex: 1;

            padding:
              0 12px;

            font-size: 12px;
          }
        }

        @media (max-width: 400px) {
          .lesson-brand span {
            font-size: 19px;
          }

          .lesson-container {
            width:
              calc(100% - 18px);
          }

          .lesson-heading h1 {
            font-size: 33px;
          }

          .nav-button {
            padding:
              0 9px;
          }
        }
      `}</style>
    </div>
  );
}