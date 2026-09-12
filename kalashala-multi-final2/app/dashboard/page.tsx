"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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

function getYouTubeId(urlString: string) {
  try {
    const url = new URL(urlString);

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

export default function DashboardPage() {
  const router = useRouter();

  const [course, setCourse] =
    useState<Course | null>(null);

  const [lectures, setLectures] =
    useState<Lecture[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadCourse() {
      try {
        const response = await fetch(
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

        if (response.status === 401) {
          window.location.replace(
            "/login"
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load course."
          );
        }

        setCourse(
          data.course || null
        );

        setLectures(
          Array.isArray(data.lectures)
            ? data.lectures
            : []
        );
      } catch (err) {
        console.error(
          "Dashboard error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load course."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, []);

  async function logout() {
    await fetch("/api/access", {
      method: "DELETE",
      credentials: "include",
    });

    window.location.replace(
      "/login"
    );
  }

  function openLesson(id: string) {
    router.push(`/course/${id}`);
  }

  /*
   * Curriculum is always shown in
   * serial order: 01, 02, 03...
   */
  const orderedLectures = useMemo(() => {
    return [...lectures].sort(
      (a, b) =>
        a.position - b.position
    );
  }, [lectures]);

  /*
   * The newest lecture is the lesson
   * with the highest serial position.
   */
  const newestLecture =
    orderedLectures.length > 0
      ? orderedLectures[
          orderedLectures.length - 1
        ]
      : null;

  if (loading) {
    return (
      <div className="student-loading">
        Loading course…
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-page">
        <main className="student-container">
          <div className="error-box">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="student-page">
      {/* HEADER */}

      <header className="student-header">
        <button
          type="button"
          className="student-brand"
          onClick={() =>
            router.push("/dashboard")
          }
          aria-label="Go to dashboard"
        >
          <img
            src="/kalashala-logo.jpg"
            alt="Kalashala"
          />

          <span>Kalashala</span>
        </button>

        <button
          type="button"
          className="logout-button"
          onClick={logout}
        >
          Log out
        </button>
      </header>

      <main className="student-container">
        {/* COURSE HERO */}

        <section className="course-hero">
          <div className="course-hero-inner">
            <div className="course-badge">
              Your course
            </div>

            <h1>
              {course?.title ||
                "Your course"}
            </h1>

            {course?.description && (
              <p>
                {course.description}
              </p>
            )}

            <div className="course-meta">
              {orderedLectures.length}{" "}
              {orderedLectures.length === 1
                ? "lesson"
                : "lessons"}
            </div>
          </div>
        </section>

        {/* NEWEST LECTURE */}

        {newestLecture && (
          <section className="newest-section">
            <div className="section-label">
              Recently added
            </div>

            <div className="section-title-row">
              <h2>
                Newest lecture
              </h2>
            </div>

            <button
              type="button"
              className="newest-card"
              onClick={() =>
                openLesson(
                  newestLecture.id
                )
              }
            >
              <div className="newest-thumbnail">
                {getYouTubeId(
                  newestLecture.youtube_url
                ) ? (
                  <img
                    src={`https://img.youtube.com/vi/${getYouTubeId(
                      newestLecture.youtube_url
                    )}/hqdefault.jpg`}
                    alt=""
                  />
                ) : (
                  <div className="thumbnail-placeholder">
                    Kalashala
                  </div>
                )}

                <div className="new-badge">
                  New
                </div>

                <div className="play-button">
                  ▶
                </div>
              </div>

              <div className="newest-content">
                <div className="lesson-kicker">
                  Lesson{" "}
                  {String(
                    newestLecture.position
                  ).padStart(2, "0")}
                </div>

                <h3>
                  {
                    newestLecture.title
                  }
                </h3>

                {newestLecture.description && (
                  <p>
                    {
                      newestLecture.description
                    }
                  </p>
                )}

                <span className="watch-link">
                  Watch newest lecture
                  <span>→</span>
                </span>
              </div>
            </button>
          </section>
        )}

        {/* ALL LESSONS */}

        <section className="lessons-section">
          <div className="section-label">
            Curriculum
          </div>

          <div className="section-title-row">
            <h2>All lessons</h2>

            <span className="lesson-total">
              {orderedLectures.length} total
            </span>
          </div>

          {orderedLectures.length ===
          0 ? (
            <div className="empty-state">
              No lessons have been
              published yet.
            </div>
          ) : (
            <div className="lesson-grid">
              {orderedLectures.map(
                (lecture) => {
                  const videoId =
                    getYouTubeId(
                      lecture.youtube_url
                    );

                  const thumbnail =
                    videoId
                      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                      : null;

                  return (
                    <button
                      key={
                        lecture.id
                      }
                      type="button"
                      className="lesson-card"
                      onClick={() =>
                        openLesson(
                          lecture.id
                        )
                      }
                    >
                      <div className="lesson-thumbnail">
                        {thumbnail ? (
                          <img
                            src={
                              thumbnail
                            }
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <div className="thumbnail-placeholder">
                            Kalashala
                          </div>
                        )}

                        <div className="number-badge">
                          {String(
                            lecture.position
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="small-play-button">
                          ▶
                        </div>
                      </div>

                      <div className="lesson-card-content">
                        <div className="lesson-kicker">
                          Lesson{" "}
                          {String(
                            lecture.position
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <h3>
                          {
                            lecture.title
                          }
                        </h3>

                        {lecture.description && (
                          <p>
                            {
                              lecture.description
                            }
                          </p>
                        )}

                        <div className="card-footer">
                          <span>
                            Watch lesson
                          </span>

                          <span>
                            →
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .student-page {
          min-height: 100vh;
          background: #faf7f2;
          color: #3b1711;
          font-family:
            Inter,
            Arial,
            sans-serif;
        }

        .student-loading {
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

        .student-header {
          position: sticky;
          top: 0;
          z-index: 20;

          height: 76px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding:
            0 clamp(18px, 4vw, 54px);

          background: rgba(
            250,
            247,
            242,
            0.95
          );

          border-bottom:
            1px solid #e8ddd4;

          backdrop-filter: blur(12px);
        }

        .student-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;

          padding: 0;

          border: 0;
          background: transparent;

          color: #3b1711;

          cursor: pointer;
        }

        .student-brand img {
          width: 44px;
          height: 44px;

          object-fit: contain;
        }

        .student-brand span {
          font-family:
            "DM Serif Display",
            Georgia,
            serif;

          font-size: 25px;
        }

        .logout-button {
          height: 42px;

          padding:
            0 17px;

          border-radius: 9px;

          border:
            1px solid #ded1c7;

          background: #fff;

          color: #3b1711;

          font-size: 13px;
          font-weight: 600;

          cursor: pointer;

          transition:
            background 0.18s ease,
            border-color 0.18s ease,
            transform 0.18s ease;
        }

        .logout-button:hover {
          transform: translateY(-1px);
          border-color: #cdbbae;
          background: #fffdfb;
        }

        .student-container {
          width:
            min(
              calc(100% - 40px),
              1120px
            );

          margin: 0 auto;

          padding:
            52px 0 100px;
        }

        .course-hero {
          margin-bottom: 64px;

          padding:
            clamp(30px, 5vw, 48px);

          border:
            1px solid #e5d8ce;

          border-radius: 22px;

          background:
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f8eee4 100%
            );

          box-shadow:
            0 15px 50px
            rgba(
              59,
              23,
              17,
              0.05
            );
        }

        .course-hero-inner {
          max-width: 820px;
        }

        .course-badge {
          display: inline-flex;

          padding:
            7px 12px;

          margin-bottom: 18px;

          border-radius: 999px;

          background: #f7e3cf;
          color: #dc6d16;

          font-size: 10px;
          font-weight: 700;

          letter-spacing:
            0.18em;

          text-transform:
            uppercase;
        }

        .course-hero h1 {
          margin: 0;

          font-family:
            "DM Serif Display",
            Georgia,
            serif;

          font-size:
            clamp(
              44px,
              6vw,
              70px
            );

          font-weight: 400;

          line-height: 1.03;

          letter-spacing:
            -0.02em;
        }

        .course-hero p {
          max-width: 740px;

          margin:
            18px 0 0;

          color: #765e55;

          font-size:
            clamp(
              15px,
              2vw,
              17px
            );

          line-height: 1.7;
        }

        .course-meta {
          margin-top: 23px;

          color: #8b756c;

          font-size: 14px;
        }

        .section-label {
          margin-bottom: 7px;

          color: #e97817;

          font-size: 11px;
          font-weight: 700;

          letter-spacing:
            0.22em;

          text-transform:
            uppercase;
        }

        .section-title-row {
          display: flex;
          align-items: end;
          justify-content: space-between;

          gap: 20px;

          margin-bottom: 22px;
        }

        .section-title-row h2 {
          margin: 0;

          font-family:
            "DM Serif Display",
            Georgia,
            serif;

          font-size:
            clamp(
              34px,
              4vw,
              46px
            );

          font-weight: 400;

          line-height: 1.1;
        }

        .lesson-total {
          color: #8b756c;
          font-size: 14px;
          padding-bottom: 4px;
        }

        .newest-section {
          margin-bottom: 68px;
        }

        .newest-card {
          width: 100%;

          display: grid;

          grid-template-columns:
            minmax(0, 0.95fr)
            minmax(0, 1.05fr);

          padding: 0;

          text-align: left;

          border:
            1px solid #e2d5ca;

          border-radius: 20px;

          background: #fff;

          color: #3b1711;

          overflow: hidden;

          cursor: pointer;

          box-shadow:
            0 12px 40px
            rgba(
              59,
              23,
              17,
              0.07
            );

          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .newest-card:hover {
          transform: translateY(-3px);

          border-color: #d5c2b4;

          box-shadow:
            0 18px 45px
            rgba(
              59,
              23,
              17,
              0.11
            );
        }

        .newest-thumbnail {
          position: relative;

          aspect-ratio: 16 / 10;

          overflow: hidden;

          background: #eee4da;
        }

        .newest-thumbnail img {
          width: 100%;
          height: 100%;

          display: block;

          object-fit: cover;
        }

        .thumbnail-placeholder {
          width: 100%;
          height: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #876f67;

          font-family:
            "DM Serif Display",
            Georgia,
            serif;

          font-size: 24px;
        }

        .new-badge {
          position: absolute;

          left: 16px;
          top: 16px;

          padding:
            7px 10px;

          border-radius: 7px;

          background: #3b1711;

          color: #fff;

          font-size: 10px;
          font-weight: 700;

          letter-spacing:
            0.08em;

          text-transform:
            uppercase;
        }

        .play-button,
        .small-play-button {
          position: absolute;

          left: 50%;
          top: 50%;

          transform:
            translate(-50%, -50%);

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            rgba(
              59,
              23,
              17,
              0.94
            );

          color: #fff;

          box-shadow:
            0 8px 24px
            rgba(
              0,
              0,
              0,
              0.2
            );
        }

        .play-button {
          width: 60px;
          height: 60px;

          font-size: 18px;
        }

        .small-play-button {
          width: 52px;
          height: 52px;

          font-size: 16px;
        }

        .newest-content {
          display: flex;

          flex-direction: column;

          justify-content: center;

          padding:
            clamp(
              26px,
              4vw,
              38px
            );
        }

        .lesson-kicker {
          margin-bottom: 9px;

          color: #e97817;

          font-size: 11px;
          font-weight: 700;

          letter-spacing:
            0.13em;

          text-transform:
            uppercase;
        }

        .newest-content h3 {
          margin: 0;

          font-family:
            "DM Serif Display",
            Georgia,
            serif;

          font-size:
            clamp(
              28px,
              3vw,
              39px
            );

          font-weight: 400;

          line-height: 1.12;
        }

        .newest-content p {
          margin:
            14px 0 0;

          color: #876f67;

          font-size: 15px;

          line-height: 1.65;

          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;

          overflow: hidden;
        }

        .watch-link {
          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 15px;

          margin-top: 24px;

          color: #e97817;

          font-size: 13px;
          font-weight: 700;
        }

        .lesson-grid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 22px;
        }

        .lesson-card {
          width: 100%;

          padding: 0;

          text-align: left;

          border:
            1px solid #e4d8cf;

          border-radius: 17px;

          background: #fff;

          color: #3b1711;

          overflow: hidden;

          cursor: pointer;

          box-shadow:
            0 6px 22px
            rgba(
              59,
              23,
              17,
              0.035
            );

          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .lesson-card:hover {
          transform: translateY(-4px);

          border-color: #d5c2b4;

          box-shadow:
            0 16px 35px
            rgba(
              59,
              23,
              17,
              0.1
            );
        }

        .lesson-thumbnail {
          position: relative;

          aspect-ratio: 16 / 9;

          overflow: hidden;

          background: #eee5dc;
        }

        .lesson-thumbnail img {
          width: 100%;
          height: 100%;

          display: block;

          object-fit: cover;
        }

        .number-badge {
          position: absolute;

          left: 13px;
          top: 13px;

          min-width: 42px;
          height: 34px;

          display: flex;

          align-items: center;
          justify-content: center;

          padding: 0 9px;

          border-radius: 8px;

          background: #fff;

          color: #3b1711;

          font-size: 13px;
          font-weight: 800;

          box-shadow:
            0 3px 12px
            rgba(
              0,
              0,
              0,
              0.15
            );
        }

        .lesson-card-content {
          padding:
            19px 20px 21px;
        }

        .lesson-card-content h3 {
          margin:
            0 0 7px;

          font-family:
            "DM Serif Display",
            Georgia,
            serif;

          font-size: 23px;

          font-weight: 400;

          line-height: 1.2;
        }

        .lesson-card-content p {
          margin: 0;

          color: #876f67;

          font-size: 14px;

          line-height: 1.6;

          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;

          overflow: hidden;
        }

        .card-footer {
          display: flex;

          align-items: center;
          justify-content:
            space-between;

          margin-top: 17px;

          color: #e97817;

          font-size: 13px;
          font-weight: 600;
        }

        .empty-state {
          padding: 50px 30px;

          text-align: center;

          border:
            1px solid #e5d9ce;

          border-radius: 16px;

          background: #fff;

          color: #876f67;
        }

        .error-box {
          padding: 18px 20px;

          border:
            1px solid #efc9c3;

          border-radius: 12px;

          background: #fff2ef;

          color: #a62d20;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 960px) {
          .student-container {
            width:
              min(
                calc(100% - 32px),
                760px
              );

            padding-top: 38px;
          }

          .lesson-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .newest-card {
            grid-template-columns:
              1fr;
          }

          .newest-thumbnail {
            aspect-ratio: 16 / 8.5;
          }

          .newest-content {
            padding: 28px;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 640px) {
          .student-header {
            height: 64px;

            padding:
              0 14px;
          }

          .student-brand {
            gap: 8px;
          }

          .student-brand img {
            width: 38px;
            height: 38px;
          }

          .student-brand span {
            font-size: 22px;
          }

          .logout-button {
            height: 39px;

            padding:
              0 13px;

            font-size: 12px;
          }

          .student-container {
            width:
              calc(100% - 24px);

            padding:
              28px 0 55px;
          }

          .course-hero {
            padding:
              27px 21px;

            border-radius: 17px;

            margin-bottom:
              43px;
          }

          .course-badge {
            margin-bottom: 14px;

            padding:
              6px 10px;

            font-size: 9px;
          }

          .course-hero h1 {
            font-size: 42px;
            line-height: 1.04;
          }

          .course-hero p {
            margin-top: 15px;

            font-size: 15px;

            line-height: 1.65;
          }

          .course-meta {
            margin-top: 18px;
          }

          .section-title-row {
            align-items: center;
          }

          .section-title-row h2 {
            font-size: 34px;
          }

          .lesson-total {
            font-size: 12px;
          }

          .newest-section {
            margin-bottom: 48px;
          }

          .newest-card {
            border-radius: 15px;
          }

          .newest-thumbnail {
            aspect-ratio: 16 / 10;
          }

          .newest-content {
            padding:
              22px 20px 24px;
          }

          .newest-content h3 {
            font-size: 28px;
          }

          .newest-content p {
            font-size: 14px;

            -webkit-line-clamp: 3;
          }

          .play-button {
            width: 52px;
            height: 52px;

            font-size: 16px;
          }

          .lesson-grid {
            grid-template-columns: 1fr;

            gap: 16px;
          }

          .lesson-card {
            display: grid;

            grid-template-columns:
              41% 59%;

            border-radius: 14px;
          }

          .lesson-thumbnail {
            aspect-ratio:
              auto;
            min-height: 150px;

            height: 100%;
          }

          .lesson-card-content {
            padding:
              16px 16px 17px;
          }

          .lesson-card-content h3 {
            font-size: 21px;
          }

          .lesson-card-content p {
            font-size: 13px;
          }

          .number-badge {
            left: 9px;
            top: 9px;

            min-width: 36px;
            height: 29px;

            font-size: 11px;
          }

          .small-play-button {
            width: 42px;
            height: 42px;

            font-size: 13px;
          }

          .card-footer {
            margin-top: 13px;

            font-size: 12px;
          }
        }

        /* =====================================================
           SMALL PHONES
        ===================================================== */

        @media (max-width: 420px) {
          .student-brand span {
            font-size: 20px;
          }

          .course-hero h1 {
            font-size: 37px;
          }

          .section-title-row h2 {
            font-size: 31px;
          }

          .lesson-card {
            grid-template-columns:
              38% 62%;
          }

          .lesson-thumbnail {
            min-height: 138px;
          }

          .lesson-card-content {
            padding:
              14px 14px 15px;
          }

          .lesson-card-content h3 {
            font-size: 19px;
          }

          .lesson-card-content p {
            font-size: 12px;

            -webkit-line-clamp: 2;
          }

          .lesson-kicker {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}