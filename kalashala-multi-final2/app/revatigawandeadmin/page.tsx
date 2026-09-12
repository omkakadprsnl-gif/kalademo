"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setMessage("");

    const supabase = getSupabaseBrowser();

    if (!supabase) {
      setMessage(
        "Supabase is not configured. Check your .env.local file."
      );
      setBusy(false);
      return;
    }

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        console.error(
          "Supabase admin login error:",
          error
        );

        setMessage(error.message);
        setBusy(false);
        return;
      }

      if (!data.user) {
        setMessage("Login failed.");
        setBusy(false);
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Profile lookup error:",
          profileError
        );

        await supabase.auth.signOut();

        setMessage(profileError.message);
        setBusy(false);
        return;
      }

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();

        setMessage(
          "This account is not an admin account."
        );

        setBusy(false);
        return;
      }

      router.replace(
        "/revatigawandeadmin/panel"
      );
    } catch (error) {
      console.error(
        "Unexpected admin login error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred."
      );

      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/">
          <img
            className="auth-logo"
            src="/kalashala-logo.jpg"
            alt="Kalashala"
          />
        </Link>

        <h1>Admin login</h1>

        <p className="sub">
          Sign in to manage the course.
        </p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="admin-email">
              Email
            </label>

            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="admin-password">
              Password
            </label>

            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              required
            />
          </div>

          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Signing in…"
              : "Sign in"}
          </button>
        </form>

        {message && (
          <div className="message error">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}